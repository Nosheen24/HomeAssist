const router = require('express').Router();
const { z } = require('zod');
const pool = require('../lib/db');
const { deepToCamel, BOOKING_FULL_SELECT } = require('../lib/utils');
const { authenticate, requireRole } = require('../middleware/auth');

function haversineKm(lat1, lng1, lat2, lng2) {
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
const etaMinutes = (km) => (km == null ? null : Math.max(1, Math.round((km / 26) * 60)));

// Find the nearest available, verified provider that offers the given category.
// Returns { providerId, name, lat, lng, avgRating, serviceId, km } or null.
async function findNearest({ categorySlug, customerLat, customerLng, excludeProviderIds = [] }) {
  const exclude = excludeProviderIds.length
    ? `AND p.id NOT IN (${excludeProviderIds.map((n) => parseInt(n, 10)).filter((n) => !Number.isNaN(n)).join(',') || '0'})`
    : '';
  const { rows } = await pool.query(
    `SELECT p.id AS provider_id, p.lat, p.lng, p.avg_rating, u.name,
        (SELECT ps.id FROM provider_services ps
           JOIN service_categories sc ON sc.id = ps.category_id
          WHERE ps.provider_id = p.id AND sc.slug = $1
          ORDER BY ps.price ASC LIMIT 1) AS service_id
     FROM providers p
     JOIN users u ON u.id = p.user_id
     WHERE p.is_verified = TRUE AND p.is_available = TRUE
       AND p.lat IS NOT NULL AND p.lng IS NOT NULL
       AND EXISTS (SELECT 1 FROM provider_services ps2
                     JOIN service_categories sc2 ON sc2.id = ps2.category_id
                    WHERE ps2.provider_id = p.id AND sc2.slug = $1)
       ${exclude}`,
    [categorySlug]
  );
  let best = null;
  for (const r of rows) {
    if (!r.service_id) continue;
    const km = haversineKm(customerLat, customerLng, Number(r.lat), Number(r.lng));
    if (!best || km < best.km) {
      best = {
        providerId: r.provider_id,
        name: r.name,
        lat: Number(r.lat),
        lng: Number(r.lng),
        avgRating: Number(r.avg_rating),
        serviceId: r.service_id,
        km,
      };
    }
  }
  return best;
}

// POST /api/dispatch — describe a need, get matched to the nearest available pro.
router.post('/', authenticate, requireRole('customer'), async (req, res) => {
  try {
    const data = z.object({
      categorySlug: z.string().min(1),
      customerLat: z.number(),
      customerLng: z.number(),
      address: z.string().min(3),
      customerLocationLabel: z.string().optional().nullable(),
      problemDescription: z.string().optional().nullable(),
    }).parse(req.body);

    const match = await findNearest({
      categorySlug: data.categorySlug,
      customerLat: data.customerLat,
      customerLng: data.customerLng,
    });
    if (!match) return res.status(404).json({ error: 'No available providers nearby for this service' });

    const km = Math.round(match.km * 10) / 10;
    const eta = etaMinutes(match.km);

    const { rows: ins } = await pool.query(
      `INSERT INTO bookings
         (customer_id, provider_id, service_id, scheduled_at, address,
          customer_lat, customer_lng, customer_location_label, problem_description, distance_km, eta_minutes, status)
       VALUES ($1,$2,$3,NOW(),$4,$5,$6,$7,$8,$9,$10,'pending') RETURNING id`,
      [req.user.id, match.providerId, match.serviceId, data.address,
       data.customerLat, data.customerLng, data.customerLocationLabel || 'Customer location',
       data.problemDescription || null, km, eta]
    );

    const { rows } = await pool.query(`${BOOKING_FULL_SELECT} WHERE b.id = $1`, [ins[0].id]);
    res.status(201).json({
      booking: deepToCamel(rows[0]),
      match: { ...match, distanceKm: km, etaMinutes: eta },
    });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: 'Dispatch failed' });
  }
});

// POST /api/dispatch/:bookingId/rematch — reassign to the next nearest provider.
router.post('/:bookingId/rematch', authenticate, requireRole('customer'), async (req, res) => {
  try {
    const bookingId = parseInt(req.params.bookingId, 10);
    const { rows } = await pool.query(
      `SELECT b.id, b.customer_id, b.provider_id, b.customer_lat, b.customer_lng,
         (SELECT sc.slug FROM service_categories sc
            JOIN provider_services ps ON ps.category_id = sc.id WHERE ps.id = b.service_id) AS category_slug
       FROM bookings b WHERE b.id = $1`,
      [bookingId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Booking not found' });
    const b = rows[0];
    if (b.customer_id !== req.user.id) return res.status(403).json({ error: 'Not your request' });

    const match = await findNearest({
      categorySlug: b.category_slug,
      customerLat: Number(b.customer_lat),
      customerLng: Number(b.customer_lng),
      excludeProviderIds: [b.provider_id],
    });
    if (!match) return res.status(409).json({ error: 'No other providers available right now' });

    const km = Math.round(match.km * 10) / 10;
    const eta = etaMinutes(match.km);

    await pool.query(
      `UPDATE bookings
         SET provider_id = $1, service_id = $2, distance_km = $3, eta_minutes = $4,
             status = 'pending', provider_lat = NULL, provider_lng = NULL, provider_location_updated_at = NULL
       WHERE id = $5`,
      [match.providerId, match.serviceId, km, eta, bookingId]
    );
    // Keep any held escrow pointed at the provider who will actually do the job.
    await pool.query(
      `UPDATE transactions SET provider_id = $1 WHERE booking_id = $2 AND status = 'held'`,
      [match.providerId, bookingId]
    );

    const { rows: updated } = await pool.query(`${BOOKING_FULL_SELECT} WHERE b.id = $1`, [bookingId]);
    res.json({
      booking: deepToCamel(updated[0]),
      match: { ...match, distanceKm: km, etaMinutes: eta },
    });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: 'Rematch failed' });
  }
});

module.exports = router;
