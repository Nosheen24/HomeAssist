const router = require('express').Router();
const { z } = require('zod');
const pool = require('../lib/db');
const { deepToCamel } = require('../lib/utils');
const { authenticate, requireRole } = require('../middleware/auth');

router.post('/', authenticate, requireRole('customer'), async (req, res) => {
  try {
    const schema = z.object({
      bookingId: z.number().int(),
      rating: z.number().int().min(1).max(5),
      comment: z.string().max(500).optional(),
    });

    const { bookingId, rating, comment } = schema.parse(req.body);

    const { rows: bookingRows } = await pool.query(
      'SELECT * FROM bookings WHERE id = $1',
      [bookingId]
    );
    if (bookingRows.length === 0) return res.status(404).json({ error: 'Booking not found' });
    const booking = deepToCamel(bookingRows[0]);

    if (booking.customerId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    if (booking.status !== 'completed') return res.status(400).json({ error: 'Can only review completed bookings' });

    const { rows: existingReview } = await pool.query('SELECT id FROM reviews WHERE booking_id = $1', [bookingId]);
    if (existingReview.length > 0) return res.status(409).json({ error: 'Already reviewed' });

    const { rows: reviewRows } = await pool.query(
      `INSERT INTO reviews (booking_id, provider_id, rating, comment)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [bookingId, booking.providerId, rating, comment || null]
    );

    await pool.query("UPDATE bookings SET status = 'reviewed' WHERE id = $1", [bookingId]);

    const { rows: aggRows } = await pool.query(
      'SELECT AVG(rating) AS avg_rating, COUNT(*) AS review_count FROM reviews WHERE provider_id = $1',
      [booking.providerId]
    );
    const { avg_rating, review_count } = aggRows[0];
    await pool.query(
      'UPDATE providers SET avg_rating = $1, review_count = $2 WHERE id = $3',
      [parseFloat(avg_rating) || 0, parseInt(review_count), booking.providerId]
    );

    res.status(201).json(deepToCamel(reviewRows[0]));
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

module.exports = router;
