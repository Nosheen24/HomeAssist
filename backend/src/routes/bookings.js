const router = require('express').Router();
const { z } = require('zod');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireRole } = require('../middleware/auth');

const prisma = new PrismaClient();

function haversineDistanceKm(lat1, lng1, lat2, lng2) {
  const toRadians = (value) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const deltaLat = toRadians(lat2 - lat1);
  const deltaLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(deltaLng / 2) ** 2;
  return 2 * earthRadiusKm * Math.asin(Math.sqrt(a));
}

function estimateEtaMinutes(distanceKm) {
  if (distanceKm == null) return null;
  const averageSpeedKmh = 26;
  return Math.max(1, Math.round((distanceKm / averageSpeedKmh) * 60));
}

const bookingInclude = {
  service: { include: { category: true } },
  provider: {
    include: { user: { select: { name: true, phone: true } } },
  },
  customer: { select: { id: true, name: true, phone: true, email: true } },
  review: true,
};

// POST /api/bookings
router.post('/', authenticate, requireRole('customer'), async (req, res) => {
  try {
    const schema = z.object({
      providerId: z.number().int(),
      serviceId: z.number().int(),
      scheduledAt: z.string().datetime({ offset: true }).or(z.string().min(1)),
      address: z.string().min(5),
      customerLat: z.number().optional().nullable(),
      customerLng: z.number().optional().nullable(),
      customerLocationLabel: z.string().optional().nullable(),
      problemDescription: z.string().optional(),
    }).refine((data) => {
      const hasLat = data.customerLat != null;
      const hasLng = data.customerLng != null;
      return hasLat === hasLng;
    }, { message: 'Customer location must include both latitude and longitude' });

    const data = schema.parse(req.body);

    const provider = await prisma.provider.findUnique({ where: { id: data.providerId } });
    if (!provider) return res.status(404).json({ error: 'Provider not found' });

    const service = await prisma.providerService.findUnique({ where: { id: data.serviceId } });
    if (!service || service.providerId !== data.providerId) {
      return res.status(400).json({ error: 'Invalid service for this provider' });
    }

    const booking = await prisma.booking.create({
      data: {
        customerId: req.user.id,
        providerId: data.providerId,
        serviceId: data.serviceId,
        scheduledAt: new Date(data.scheduledAt),
        address: data.address,
        customerLat: data.customerLat ?? null,
        customerLng: data.customerLng ?? null,
        customerLocationLabel: data.customerLocationLabel ?? null,
        problemDescription: data.problemDescription,
        status: 'pending',
      },
      include: bookingInclude,
    });

    res.status(201).json(booking);
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

// GET /api/bookings/mine — customer's bookings
router.get('/mine', authenticate, requireRole('customer'), async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: { customerId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: bookingInclude,
    });
    res.json(bookings);
  } catch {
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// GET /api/bookings/provider — provider's incoming bookings
router.get('/provider', authenticate, requireRole('provider'), async (req, res) => {
  try {
    const provider = await prisma.provider.findUnique({ where: { userId: req.user.id } });
    if (!provider) return res.status(404).json({ error: 'Provider profile not found' });

    const bookings = await prisma.booking.findMany({
      where: { providerId: provider.id },
      orderBy: { createdAt: 'desc' },
      include: bookingInclude,
    });
    res.json(bookings);
  } catch {
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// GET /api/bookings/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: parseInt(req.params.id) },
      include: bookingInclude,
    });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const isCustomer = booking.customerId === req.user.id;
    const isProvider = booking.provider.userId === req.user.id;
    if (!isCustomer && !isProvider && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    res.json(booking);
  } catch {
    res.status(500).json({ error: 'Failed to fetch booking' });
  }
});

// PATCH /api/bookings/:id/status
router.patch('/:id/status', authenticate, async (req, res) => {
  try {
    const schema = z.object({ status: z.enum(['accepted', 'declined', 'completed', 'cancelled']) });
    const { status } = schema.parse(req.body);

    const booking = await prisma.booking.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { provider: true },
    });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const isProvider = booking.provider.userId === req.user.id;
    const isCustomer = booking.customerId === req.user.id;

    const providerActions = ['accepted', 'declined', 'completed'];
    const customerActions = ['cancelled'];

    if (providerActions.includes(status) && !isProvider && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only the provider can perform this action' });
    }
    if (customerActions.includes(status) && !isCustomer && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only the customer can perform this action' });
    }

    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: { status },
      include: bookingInclude,
    });

    res.json(updated);
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: 'Failed to update booking status' });
  }
});

// PATCH /api/bookings/:id/tracking
router.patch('/:id/tracking', authenticate, async (req, res) => {
  try {
    const schema = z.object({
      latitude: z.number(),
      longitude: z.number(),
      accuracy: z.number().optional().nullable(),
    });

    const { latitude, longitude } = schema.parse(req.body);

    const booking = await prisma.booking.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { provider: true },
    });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.status !== 'accepted') {
      return res.status(409).json({ error: 'Live tracking is only available for accepted bookings' });
    }

    const isProvider = booking.provider.userId === req.user.id;
    if (!isProvider && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only the provider can update tracking' });
    }

    const distanceKm =
      booking.customerLat != null && booking.customerLng != null
        ? haversineDistanceKm(latitude, longitude, booking.customerLat, booking.customerLng)
        : null;
    const etaMinutes = estimateEtaMinutes(distanceKm);

    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        providerLat: latitude,
        providerLng: longitude,
        providerLocationUpdatedAt: new Date(),
        distanceKm,
        etaMinutes,
      },
      include: bookingInclude,
    });

    res.json(updated);
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: 'Failed to update live tracking' });
  }
});

module.exports = router;
