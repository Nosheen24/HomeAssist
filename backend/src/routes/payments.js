const router = require('express').Router();
const { z } = require('zod');
const pool = require('../lib/db');
const { deepToCamel } = require('../lib/utils');
const { authenticate, requireRole } = require('../middleware/auth');
const { splitAmount, releaseEscrow } = require('../lib/escrow');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// POST /api/payments/pay — customer pays into escrow (mock; money is "held")
router.post('/pay', authenticate, requireRole('customer'), async (req, res) => {
  try {
    const schema = z.object({
      bookingId: z.number().int(),
      method: z.enum(['jazzcash', 'easypaisa', 'card']),
    });
    const { bookingId, method } = schema.parse(req.body);

    const { rows } = await pool.query(
      `SELECT b.id, b.customer_id, b.provider_id, b.payment_status, ps.price
         FROM bookings b
         JOIN provider_services ps ON ps.id = b.service_id
        WHERE b.id = $1`,
      [bookingId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Booking not found' });

    const booking = rows[0];
    if (booking.customer_id !== req.user.id) {
      return res.status(403).json({ error: 'This is not your booking' });
    }
    if (booking.payment_status !== 'unpaid') {
      return res.status(409).json({ error: 'This booking has already been paid' });
    }

    const amount = Number(booking.price);
    const { commission, providerPayout } = splitAmount(amount);

    // Simulate a real gateway round-trip so the UI spinner feels authentic.
    await sleep(1500);

    const { rows: inserted } = await pool.query(
      `INSERT INTO transactions
         (booking_id, customer_id, provider_id, amount, commission, provider_payout, method, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'held')
       RETURNING *`,
      [bookingId, booking.customer_id, booking.provider_id, amount, commission, providerPayout, method]
    );
    await pool.query(`UPDATE bookings SET payment_status = 'held' WHERE id = $1`, [bookingId]);

    res.status(201).json(deepToCamel(inserted[0]));
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: 'Failed to process payment' });
  }
});

// POST /api/payments/release — release held escrow to the provider's wallet.
// Normally triggered automatically when a booking is marked completed; exposed
// here so the provider/admin can release manually too.
router.post('/release', authenticate, async (req, res) => {
  try {
    const schema = z.object({ bookingId: z.number().int() });
    const { bookingId } = schema.parse(req.body);

    const { rows } = await pool.query(
      `SELECT b.id, p.user_id AS provider_user_id
         FROM bookings b
         JOIN providers p ON p.id = b.provider_id
        WHERE b.id = $1`,
      [bookingId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Booking not found' });
    if (rows[0].provider_user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only the provider can release this payment' });
    }

    const txn = await releaseEscrow(bookingId);
    if (!txn) return res.status(409).json({ error: 'No held payment to release' });

    res.json(deepToCamel(txn));
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: 'Failed to release payment' });
  }
});

// GET /api/payments/wallet — logged-in provider's balance + transaction history
router.get('/wallet', authenticate, requireRole('provider'), async (req, res) => {
  try {
    const { rows: provRows } = await pool.query(
      'SELECT id, wallet_balance, total_earned FROM providers WHERE user_id = $1',
      [req.user.id]
    );
    if (provRows.length === 0) return res.status(404).json({ error: 'Provider profile not found' });
    const provider = provRows[0];

    const { rows: txns } = await pool.query(
      `SELECT t.*,
         (SELECT ps.title FROM provider_services ps
            JOIN bookings b ON b.service_id = ps.id WHERE b.id = t.booking_id) AS service_title,
         (SELECT u.name FROM users u
            JOIN bookings b ON b.customer_id = u.id WHERE b.id = t.booking_id) AS customer_name
       FROM transactions t
       WHERE t.provider_id = $1
       ORDER BY t.created_at DESC`,
      [provider.id]
    );

    res.json(deepToCamel({
      wallet_balance: Number(provider.wallet_balance),
      total_earned: Number(provider.total_earned),
      transactions: txns,
    }));
  } catch (err) {
    res.status(500).json({ error: 'Failed to load wallet' });
  }
});

// GET /api/payments/admin/stats — platform-wide revenue & commission overview
router.get('/admin/stats', authenticate, requireRole('admin'), async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        COALESCE(SUM(amount), 0)                                          AS total_revenue,
        COALESCE(SUM(commission), 0)                                      AS total_commission,
        COALESCE(SUM(provider_payout) FILTER (WHERE status = 'released'), 0) AS total_payouts,
        COUNT(*)                                                          AS transaction_count
      FROM transactions
    `);
    const s = rows[0] || {};

    const { rows: txns } = await pool.query(`
      SELECT t.*,
        (SELECT u.name FROM users u WHERE u.id = t.customer_id) AS customer_name,
        (SELECT u.name FROM users u JOIN providers p ON p.user_id = u.id WHERE p.id = t.provider_id) AS provider_name,
        (SELECT ps.title FROM provider_services ps
           JOIN bookings b ON b.service_id = ps.id WHERE b.id = t.booking_id) AS service_title
      FROM transactions t
      ORDER BY t.created_at DESC
    `);

    res.json({
      totalRevenue: Number(s.total_revenue || 0),
      totalCommission: Number(s.total_commission || 0),
      totalPayouts: Number(s.total_payouts || 0),
      transactionCount: Number(s.transaction_count || 0),
      transactions: deepToCamel(txns),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load payment stats' });
  }
});

module.exports = router;
