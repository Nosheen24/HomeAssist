const { WebSocketServer } = require('ws');
const jwt = require('jsonwebtoken');
const { parse } = require('url');
const pool = require('./db');

// One "room" per booking. Since a booking has exactly two participants
// (customer + provider), relaying a message to "everyone else in the room"
// delivers it to the one other peer — which is all WebRTC signaling needs.
const rooms = new Map();

async function isParticipant(bookingId, user) {
  const { rows } = await pool.query(
    `SELECT b.customer_id, p.user_id AS provider_user_id
     FROM bookings b
     JOIN providers p ON p.id = b.provider_id
     WHERE b.id = $1`,
    [bookingId]
  );
  if (rows.length === 0) return false;
  const b = rows[0];
  return b.customer_id === user.id || b.provider_user_id === user.id || user.role === 'admin';
}

// Attaches a WebSocket signaling endpoint at /ws/call to an existing HTTP server.
// The browsers use it only to exchange call setup info (offer / answer / ICE);
// the actual audio & video flows peer-to-peer once connected.
function attachSignaling(server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', async (req, socket, head) => {
    const { pathname, query } = parse(req.url, true);
    if (pathname !== '/ws/call') return; // let other upgrade handlers (e.g. Vite HMR) proceed

    const bookingId = parseInt(query.bookingId);
    if (!query.token || Number.isNaN(bookingId)) return socket.destroy();

    let user;
    try {
      user = jwt.verify(query.token, process.env.JWT_SECRET);
    } catch {
      return socket.destroy();
    }

    try {
      if (!(await isParticipant(bookingId, user))) return socket.destroy();
    } catch {
      return socket.destroy();
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      ws.user = user;
      ws.bookingId = bookingId;
      wss.emit('connection', ws);
    });
  });

  wss.on('connection', (ws) => {
    const { bookingId, user } = ws;
    if (!rooms.has(bookingId)) rooms.set(bookingId, new Set());
    const room = rooms.get(bookingId);

    const relay = (payload) => {
      for (const client of room) {
        if (client !== ws && client.readyState === 1) client.send(JSON.stringify(payload));
      }
    };

    // Let the newcomer know whether the other party is already connected, and
    // tell the other party someone just joined.
    ws.send(JSON.stringify({ type: 'peers', count: room.size }));
    room.add(ws);
    relay({ type: 'peer-joined', from: { id: user.id, name: user.name, role: user.role } });

    ws.on('message', (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }
      // Stamp the sender's identity and forward to the other peer verbatim.
      relay({ ...msg, from: { id: user.id, name: user.name, role: user.role } });
    });

    ws.on('close', () => {
      room.delete(ws);
      relay({ type: 'peer-left', from: { id: user.id, name: user.name } });
      if (room.size === 0) rooms.delete(bookingId);
    });
  });
}

module.exports = { attachSignaling };
