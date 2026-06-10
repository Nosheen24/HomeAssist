const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireRole } = require('../middleware/auth');

const prisma = new PrismaClient();

// GET /api/admin/providers/unverified
router.get('/providers/unverified', authenticate, requireRole('admin'), async (_req, res) => {
  try {
    const providers = await prisma.provider.findMany({
      where: { isVerified: false },
      include: {
        user: { select: { name: true, email: true, phone: true, location: true, createdAt: true } },
        services: { include: { category: true } },
      },
      orderBy: { id: 'asc' },
    });
    res.json(providers);
  } catch {
    res.status(500).json({ error: 'Failed to fetch unverified providers' });
  }
});

// PATCH /api/admin/providers/:id/verify
router.patch('/providers/:id/verify', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const provider = await prisma.provider.update({
      where: { id: parseInt(req.params.id) },
      data: { isVerified: true },
      include: { user: { select: { name: true, email: true } } },
    });
    res.json(provider);
  } catch {
    res.status(500).json({ error: 'Failed to verify provider' });
  }
});

// GET /api/admin/stats
router.get('/stats', authenticate, requireRole('admin'), async (_req, res) => {
  try {
    const [totalUsers, totalProviders, verifiedProviders, totalBookings, pendingBookings, completedBookings, totalReviews] =
      await Promise.all([
        prisma.user.count(),
        prisma.provider.count(),
        prisma.provider.count({ where: { isVerified: true } }),
        prisma.booking.count(),
        prisma.booking.count({ where: { status: 'pending' } }),
        prisma.booking.count({ where: { status: { in: ['completed', 'reviewed'] } } }),
        prisma.review.count(),
      ]);

    res.json({
      users: { total: totalUsers },
      providers: { total: totalProviders, verified: verifiedProviders },
      bookings: { total: totalBookings, pending: pendingBookings, completed: completedBookings },
      reviews: { total: totalReviews },
    });
  } catch {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;
