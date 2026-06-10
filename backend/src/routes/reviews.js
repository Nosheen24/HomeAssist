const router = require('express').Router();
const { z } = require('zod');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireRole } = require('../middleware/auth');

const prisma = new PrismaClient();

// POST /api/reviews
router.post('/', authenticate, requireRole('customer'), async (req, res) => {
  try {
    const schema = z.object({
      bookingId: z.number().int(),
      rating: z.number().int().min(1).max(5),
      comment: z.string().max(500).optional(),
    });

    const { bookingId, rating, comment } = schema.parse(req.body);

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { review: true },
    });

    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.customerId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    if (booking.status !== 'completed') return res.status(400).json({ error: 'Can only review completed bookings' });
    if (booking.review) return res.status(409).json({ error: 'Already reviewed' });

    const review = await prisma.review.create({
      data: { bookingId, providerId: booking.providerId, rating, comment },
    });

    await prisma.booking.update({ where: { id: bookingId }, data: { status: 'reviewed' } });

    // Recalculate provider avg rating
    const agg = await prisma.review.aggregate({
      where: { providerId: booking.providerId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await prisma.provider.update({
      where: { id: booking.providerId },
      data: {
        avgRating: agg._avg.rating || 0,
        reviewCount: agg._count.rating,
      },
    });

    res.status(201).json(review);
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

module.exports = router;
