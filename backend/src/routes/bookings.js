const router = require('express').Router();
const { z } = require('zod');
const pool = require('../lib/db');
const { deepToCamel, BOOKING_FULL_SELECT } = require('../lib/utils');
const { authenticate, requireRole } = require('../middleware/auth');

function haversineDistanceKm(lat1, lng1, lat2, lng2) {
  const toRadians = (v) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function estimateEtaMinutes(distanceKm) {
  if (distanceKm == null) return null;
  return Math.max(1, Math.round((distanceKm / 26) * 60));
}

// POST /api/bookings
router.post('/', authenticate, requireRole('customer'), async (req, res) => {
  try {
    const schema = z.object({
      providerId: z.number().int(),
      serviceId: z.number().int(),
      scheduledAt: z.string().min(1),
      address: z.string().min(5),
      customerLat: z.number().optional().nullable(),
      customerLng: z.number().optional().nullable(),
      customerLocationLabel: z.string().optional().nullable(),
      problemDescription: z.string().optional(),
    }).refine((d) => (d.customerLat != null) === (d.customerLng != null), {
      message: 'Customer location must include both latitude and longitude',
    });

    const data = schema.parse(req.body);

    const { rows: provRows } = await pool.query('SELECT id FROM providers WHERE id = $1', [data.providerId]);
    if (provRows.length === 0) return res.status(404).json({ error: 'Provider not found' });

    const { rows: svcRows } = await pool.query('SELECT * FROM provider_services WHERE id = $1', [data.serviceId]);
    if (svcRows.length === 0 || svcRows[0].provider_id !== data.providerId) {
      return res.status(400).json({ error: 'Invalid service for this provider' });
    }

    const { rows: inserted } = await pool.query(
      `INSERT INTO bookings
         (customer_id, provider_id, service_id, scheduled_at, address, customer_lat, customer_lng, customer_location_label, problem_description, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending') RETURNING id`,
      [req.user.id, data.providerId, data.serviceId, new Date(data.scheduledAt),
       data.address, data.customerLat ?? null, data.customerLng ?? null,
       data.customerLocationLabel ?? null, data.problemDescription || null]
    );

    const { rows } = await pool.query(`${BOOKING_FULL_SELECT} WHERE b.id = $1`, [inserted[0].id]);
    res.status(201).json(deepToCamel(rows[0]));
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

// GET /api/bookings/mine
router.get('/mine', authenticate, requireRole('customer'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `${BOOKING_FULL_SELECT} WHERE b.customer_id = $1 ORDER BY b.created_at DESC`,
      [req.user.id]
    );
    res.json(deepToCamel(rows));
  } catch {
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// GET /api/bookings/provider
router.get('/provider', authenticate, requireRole('provider'), async (req, res) => {
  try {
    const { rows: provRows } = await pool.query('SELECT id FROM providers WHERE user_id = $1', [req.user.id]);
    if (provRows.length === 0) return res.status(404).json({ error: 'Provider profile not found' });

    const { rows } = await pool.query(
      `${BOOKING_FULL_SELECT} WHERE b.provider_id = $1 ORDER BY b.created_at DESC`,
      [provRows[0].id]
    );
    res.json(deepToCamel(rows));
  } catch {
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// GET /api/bookings/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(`${BOOKING_FULL_SELECT} WHERE b.id = $1`, [parseInt(req.params.id)]);
    if (rows.length === 0) return res.status(404).json({ error: 'Booking not found' });
    const booking = deepToCamel(rows[0]);

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

    const { rows } = await pool.query(`${BOOKING_FULL_SELECT} WHERE b.id = $1`, [parseInt(req.params.id)]);
    if (rows.length === 0) return res.status(404).json({ error: 'Booking not found' });
    const booking = deepToCamel(rows[0]);

    const isProvider = booking.provider.userId === req.user.id;
    const isCustomer = booking.customerId === req.user.id;

    if (['accepted', 'declined', 'completed'].includes(status) && !isProvider && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only the provider can perform this action' });
    }
    if (status === 'cancelled' && !isCustomer && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only the customer can perform this action' });
    }

    await pool.query('UPDATE bookings SET status = $1 WHERE id = $2', [status, booking.id]);

    const { rows: updated } = await pool.query(`${BOOKING_FULL_SELECT} WHERE b.id = $1`, [booking.id]);
    res.json(deepToCamel(updated[0]));
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

    const { rows } = await pool.query(`${BOOKING_FULL_SELECT} WHERE b.id = $1`, [parseInt(req.params.id)]);
    if (rows.length === 0) return res.status(404).json({ error: 'Booking not found' });
    const booking = deepToCamel(rows[0]);

    if (booking.status !== 'accepted') {
      return res.status(409).json({ error: 'Live tracking is only available for accepted bookings' });
    }
    if (booking.provider.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only the provider can update tracking' });
    }

    const distanceKm = booking.customerLat != null && booking.customerLng != null
      ? haversineDistanceKm(latitude, longitude, booking.customerLat, booking.customerLng)
      : null;
    const etaMinutes = estimateEtaMinutes(distanceKm);

    await pool.query(
      `UPDATE bookings SET provider_lat=$1, provider_lng=$2, provider_location_updated_at=NOW(), distance_km=$3, eta_minutes=$4 WHERE id=$5`,
      [latitude, longitude, distanceKm, etaMinutes, booking.id]
    );

    const { rows: updated } = await pool.query(`${BOOKING_FULL_SELECT} WHERE b.id = $1`, [booking.id]);
    res.json(deepToCamel(updated[0]));
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: 'Failed to update live tracking' });
  }
});

module.exports = router;
