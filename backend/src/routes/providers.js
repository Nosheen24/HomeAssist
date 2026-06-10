const router = require('express').Router();
const { z } = require('zod');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireRole } = require('../middleware/auth');

const prisma = new PrismaClient();

const providerInclude = {
  user: { select: { name: true, email: true, phone: true, location: true } },
  services: {
    include: { category: true },
  },
  availability: true,
  reviews: {
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: { booking: { include: { customer: { select: { name: true } } } } },
  },
};

// GET /api/providers
router.get('/', async (req, res) => {
  try {
    const { category, location, minRating, maxPrice, sort, page = 1, limit = 12 } = req.query;

    const where = {};

    if (location) {
      where.OR = [
        { serviceArea: { contains: location } },
        { user: { location: { contains: location } } },
      ];
    }

    if (minRating) {
      where.avgRating = { gte: parseFloat(minRating) };
    }

    if (category) {
      where.services = {
        some: { category: { slug: category } },
      };
    }

    if (maxPrice) {
      where.services = {
        ...(where.services || {}),
        some: {
          ...(where.services?.some || {}),
          price: { lte: parseFloat(maxPrice) },
        },
      };
    }

    const orderBy = {};
    if (sort === 'rating') orderBy.avgRating = 'desc';
    else if (sort === 'reviews') orderBy.reviewCount = 'desc';
    else orderBy.avgRating = 'desc';

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [providers, total] = await Promise.all([
      prisma.provider.findMany({
        where,
        orderBy,
        skip,
        take: parseInt(limit),
        include: {
          user: { select: { name: true, location: true } },
          services: { include: { category: true }, take: 3 },
        },
      }),
      prisma.provider.count({ where }),
    ]);

    res.json({
      providers,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch providers' });
  }
});

// GET /api/providers/me/profile  — must be before /:id to avoid "me" being parsed as an id
router.get('/me/profile', authenticate, requireRole('provider'), async (req, res) => {
  try {
    const provider = await prisma.provider.findUnique({
      where: { userId: req.user.id },
      include: providerInclude,
    });
    if (!provider) return res.status(404).json({ error: 'Provider profile not found' });
    res.json(provider);
  } catch {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// GET /api/providers/:id
router.get('/:id', async (req, res) => {
  try {
    const provider = await prisma.provider.findUnique({
      where: { id: parseInt(req.params.id) },
      include: providerInclude,
    });
    if (!provider) return res.status(404).json({ error: 'Provider not found' });
    res.json(provider);
  } catch {
    res.status(500).json({ error: 'Failed to fetch provider' });
  }
});

// PUT /api/providers/:id — update provider profile
router.put('/:id', authenticate, async (req, res) => {
  try {
    const providerId = parseInt(req.params.id);
    const provider = await prisma.provider.findUnique({ where: { id: providerId } });
    if (!provider) return res.status(404).json({ error: 'Provider not found' });
    if (provider.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const schema = z.object({
      bio: z.string().optional(),
      experienceYears: z.number().int().min(0).optional(),
      serviceArea: z.string().optional(),
      profilePhoto: z.string().optional(),
    });

    const data = schema.parse(req.body);
    const updated = await prisma.provider.update({ where: { id: providerId }, data });
    res.json(updated);
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: 'Update failed' });
  }
});

// POST /api/providers/:id/services
router.post('/:id/services', authenticate, async (req, res) => {
  try {
    const providerId = parseInt(req.params.id);
    const provider = await prisma.provider.findUnique({ where: { id: providerId } });
    if (!provider || (provider.userId !== req.user.id && req.user.role !== 'admin')) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const schema = z.object({
      categoryId: z.number().int(),
      title: z.string().min(2),
      price: z.number().positive(),
      priceUnit: z.string().default('fixed'),
    });

    const data = schema.parse(req.body);
    const service = await prisma.providerService.create({
      data: { providerId, ...data },
      include: { category: true },
    });
    res.status(201).json(service);
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: 'Failed to add service' });
  }
});

// DELETE /api/providers/:id/services/:serviceId
router.delete('/:id/services/:serviceId', authenticate, async (req, res) => {
  try {
    const providerId = parseInt(req.params.id);
    const provider = await prisma.provider.findUnique({ where: { id: providerId } });
    if (!provider || (provider.userId !== req.user.id && req.user.role !== 'admin')) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await prisma.providerService.delete({ where: { id: parseInt(req.params.serviceId) } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete service' });
  }
});

// PUT /api/providers/:id/availability
router.put('/:id/availability', authenticate, async (req, res) => {
  try {
    const providerId = parseInt(req.params.id);
    const provider = await prisma.provider.findUnique({ where: { id: providerId } });
    if (!provider || (provider.userId !== req.user.id && req.user.role !== 'admin')) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const slots = z.array(z.object({
      dayOfWeek: z.number().int().min(0).max(6),
      startTime: z.string(),
      endTime: z.string(),
    })).parse(req.body.slots);

    await prisma.availabilitySlot.deleteMany({ where: { providerId } });
    const created = await prisma.availabilitySlot.createMany({
      data: slots.map(s => ({ ...s, providerId })),
    });
    res.json({ created: created.count });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: 'Failed to update availability' });
  }
});

module.exports = router;
