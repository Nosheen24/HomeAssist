const router = require('express').Router();
const { z } = require('zod');
const pool = require('../lib/db');
const { deepToCamel } = require('../lib/utils');
const { authenticate } = require('../middleware/auth');

// Chat is only allowed once the provider has accepted (and while completed) —
// never on a pending or cancelled/declined booking.
const CHATTABLE_STATUSES = ['accepted', 'completed'];

// Load the booking's participants + status, then enforce the same ownership rule
// used in bookings.js: only the booking's customer, its provider, or an admin.
async function loadBookingForUser(bookingId, user) {
  const { rows } = await pool.query(
    `SELECT b.id, b.status, b.customer_id, p.user_id AS provider_user_id
     FROM bookings b
     JOIN providers p ON p.id = b.provider_id
     WHERE b.id = $1`,
    [bookingId]
  );
  if (rows.length === 0) return { error: 'not_found' };

  const booking = rows[0];
  const isCustomer = booking.customer_id === user.id;
  const isProvider = booking.provider_user_id === user.id;
  if (!isCustomer && !isProvider && user.role !== 'admin') {
    return { error: 'forbidden' };
  }
  return { booking };
}

// GET /api/messages/:bookingId — full message history for the booking
router.get('/:bookingId', authenticate, async (req, res) => {
  try {
    const bookingId = parseInt(req.params.bookingId);
    if (Number.isNaN(bookingId)) return res.status(400).json({ error: 'Invalid booking id' });

    const { error } = await loadBookingForUser(bookingId, req.user);
    if (error === 'not_found') return res.status(404).json({ error: 'Booking not found' });
    if (error === 'forbidden') return res.status(403).json({ error: 'Forbidden' });

    const { rows } = await pool.query(
      `SELECT m.id, m.booking_id, m.sender_id, m.content, m.created_at, u.name AS sender_name
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.booking_id = $1
       ORDER BY m.created_at ASC`,
      [bookingId]
    );
    res.json(deepToCamel(rows));
  } catch {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// POST /api/messages/:bookingId — send a message
router.post('/:bookingId', authenticate, async (req, res) => {
  try {
    const bookingId = parseInt(req.params.bookingId);
    if (Number.isNaN(bookingId)) return res.status(400).json({ error: 'Invalid booking id' });

    const schema = z.object({ content: z.string().trim().min(1, 'Message cannot be empty').max(2000) });
    const { content } = schema.parse(req.body);

    const { booking, error } = await loadBookingForUser(bookingId, req.user);
    if (error === 'not_found') return res.status(404).json({ error: 'Booking not found' });
    if (error === 'forbidden') return res.status(403).json({ error: 'Forbidden' });

    if (!CHATTABLE_STATUSES.includes(booking.status)) {
      return res.status(409).json({ error: 'Chat is only available once the booking is accepted' });
    }

    const { rows } = await pool.query(
      `INSERT INTO messages (booking_id, sender_id, content)
       VALUES ($1, $2, $3)
       RETURNING id, booking_id, sender_id, content, created_at`,
      [bookingId, req.user.id, content]
    );

    const message = { ...rows[0], sender_name: req.user.name };
    res.status(201).json(deepToCamel(message));
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: 'Failed to send message' });
  }
});

module.exports = router;
