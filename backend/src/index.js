require('dotenv').config();
const http = require('http');
const path = require('path');
const express = require('express');
const cors = require('cors');
const { attachSignaling } = require('./lib/signaling');

const authRoutes = require('./routes/auth');
const providerRoutes = require('./routes/providers');
const bookingRoutes = require('./routes/bookings');
const reviewRoutes = require('./routes/reviews');
const categoryRoutes = require('./routes/categories');
const aiRoutes = require('./routes/ai');
const adminRoutes = require('./routes/admin');
const paymentRoutes = require('./routes/payments');
const dispatchRoutes = require('./routes/dispatch');
const geoRoutes = require('./routes/geo');
const messageRoutes = require('./routes/messages');

const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/dispatch', dispatchRoutes);
app.use('/api/geo', geoRoutes);
app.use('/api/messages', messageRoutes);

// Serve the built React frontend (Vite output). Any non-/api request falls
// through to index.html so client-side routing (React Router) works.
const distPath = path.join(__dirname, '../../frontend/dist');
app.use(express.static(distPath));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(distPath, 'index.html'));
});

app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;

// Wrap Express in an HTTP server so the WebRTC call signaling server can share
// the same port via the HTTP "upgrade" handshake.
const server = http.createServer(app);
attachSignaling(server);

server.listen(PORT, () => {
  console.log(`HomeAssist API running on http://localhost:${PORT}`);
  console.log(`Call signaling on ws://localhost:${PORT}/ws/call`);
});
