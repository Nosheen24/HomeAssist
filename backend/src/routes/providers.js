const router = require('express').Router();
const { z } = require('zod');
const pool = require('../lib/db');
const { deepToCamel } = require('../lib/utils');
const { authenticate, requireRole } = require('../middleware/auth');

// Same haversine used by dispatch.js — distance in km between two lat/lng points.
function haversineKm(lat1, lng1, lat2, lng2) {
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

const PROVIDER_FULL_SELECT = `
  SELECT
    p.*,
    (SELECT jsonb_build_object('name', u.name, 'email', u.email, 'phone', u.phone, 'location', u.location)
     FROM users u WHERE u.id = p.user_id) AS "user",
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', ps.id, 'title', ps.title, 'price', ps.price, 'price_unit', ps.price_unit,
        'provider_id', ps.provider_id, 'category_id', ps.category_id,
        'category', (SELECT jsonb_build_object('id', sc.id, 'name', sc.name, 'slug', sc.slug, 'icon', sc.icon)
                     FROM service_categories sc WHERE sc.id = ps.category_id)
      ))
      FROM provider_services ps WHERE ps.provider_id = p.id
    ), '[]') AS services,
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', av.id, 'day_of_week', av.day_of_week, 'start_time', av.start_time,
        'end_time', av.end_time, 'provider_id', av.provider_id
      ))
      FROM availability_slots av WHERE av.provider_id = p.id
    ), '[]') AS availability,
    COALESCE((
      SELECT jsonb_agg(r_data)
      FROM (
        SELECT jsonb_build_object(
          'id', r.id, 'rating', r.rating, 'comment', r.comment, 'created_at', r.created_at,
          'booking_id', r.booking_id, 'provider_id', r.provider_id,
          'booking', jsonb_build_object('customer', jsonb_build_object('name', cu.name))
        ) AS r_data
        FROM reviews r
        JOIN bookings rb ON rb.id = r.booking_id
        JOIN users cu ON cu.id = rb.customer_id
        WHERE r.provider_id = p.id
        ORDER BY r.created_at DESC
        LIMIT 10
      ) limited
    ), '[]') AS reviews
  FROM providers p
`;

// GET /api/providers
router.get('/', async (req, res) => {
  try {
    const { category, location, minRating, maxPrice, sort, page = 1, limit = 12 } = req.query;

    const conditions = [];
    const params = [];

    if (location) {
      params.push(`%${location}%`);
      conditions.push(`(p.service_area ILIKE $${params.length} OR u.location ILIKE $${params.length})`);
    }
    if (minRating) {
      params.push(parseFloat(minRating));
      conditions.push(`p.avg_rating >= $${params.length}`);
    }
    if (category) {
      params.push(category);
      conditions.push(
        `EXISTS (SELECT 1 FROM provider_services ps2 JOIN service_categories sc2 ON sc2.id = ps2.category_id WHERE ps2.provider_id = p.id AND sc2.slug = $${params.length})`
      );
    }
    if (maxPrice) {
      params.push(parseFloat(maxPrice));
      conditions.push(
        `EXISTS (SELECT 1 FROM provider_services ps3 WHERE ps3.provider_id = p.id AND ps3.price <= $${params.length})`
      );
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const orderBy = sort === 'reviews' ? 'p.review_count DESC' : 'p.avg_rating DESC';

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM providers p JOIN users u ON u.id = p.user_id ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    params.push(parseInt(limit));
    params.push((parseInt(page) - 1) * parseInt(limit));

    const { rows } = await pool.query(`
      SELECT
        p.*,
        (SELECT jsonb_build_object('name', u2.name, 'location', u2.location)
         FROM users u2 WHERE u2.id = p.user_id) AS "user",
        COALESCE((
          SELECT jsonb_agg(s_data)
          FROM (
            SELECT jsonb_build_object(
              'id', ps.id, 'title', ps.title, 'price', ps.price, 'price_unit', ps.price_unit,
              'provider_id', ps.provider_id, 'category_id', ps.category_id,
              'category', (SELECT jsonb_build_object('id', sc.id, 'name', sc.name, 'slug', sc.slug, 'icon', sc.icon)
                           FROM service_categories sc WHERE sc.id = ps.category_id)
            ) AS s_data
            FROM provider_services ps WHERE ps.provider_id = p.id LIMIT 3
          ) limited_svc
        ), '[]') AS services
      FROM providers p
      JOIN users u ON u.id = p.user_id
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    res.json({
      providers: deepToCamel(rows),
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch providers' });
  }
});

// GET /api/providers/me/profile
router.get('/me/profile', authenticate, requireRole('provider'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `${PROVIDER_FULL_SELECT} WHERE p.user_id = $1`,
      [req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Provider profile not found' });
    res.json(deepToCamel(rows[0]));
  } catch {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// PATCH /api/providers/me/availability — provider goes online/offline for dispatch
router.patch('/me/availability', authenticate, requireRole('provider'), async (req, res) => {
  try {
    const { isAvailable } = z.object({ isAvailable: z.boolean() }).parse(req.body);
    const { rows } = await pool.query(
      `UPDATE providers SET is_available = $1 WHERE user_id = $2 RETURNING id, is_available`,
      [isAvailable, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Provider profile not found' });
    res.json(deepToCamel(rows[0]));
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: 'Failed to update availability' });
  }
});

// PATCH /api/providers/me/location — provider broadcasts live GPS while available.
// Called on an interval from the dashboard whenever the provider is online.
router.patch('/me/location', authenticate, requireRole('provider'), async (req, res) => {
  try {
    const { latitude, longitude } = z.object({
      latitude: z.number(),
      longitude: z.number(),
      accuracy: z.number().optional().nullable(),
    }).parse(req.body);

    const { rows } = await pool.query(
      `UPDATE providers SET lat = $1, lng = $2 WHERE user_id = $3 RETURNING id, lat, lng`,
      [latitude, longitude, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Provider profile not found' });
    res.json(deepToCamel(rows[0]));
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: 'Failed to update location' });
  }
});

// GET /api/providers/nearby — live discovery of verified + available providers
// around a point, sorted by distance. Public (like GET /). Query: lat, lng,
// radius(km), category(slug), minRating, maxPrice.
router.get('/nearby', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return res.status(400).json({ error: 'lat and lng query params are required' });
    }
    const radius = req.query.radius ? parseFloat(req.query.radius) : 10;
    const { category, minRating, maxPrice } = req.query;

    const conditions = [
      'p.is_verified = TRUE',
      'p.is_available = TRUE',
      'p.lat IS NOT NULL',
      'p.lng IS NOT NULL',
    ];
    const params = [];

    if (category) {
      params.push(category);
      conditions.push(
        `EXISTS (SELECT 1 FROM provider_services ps2 JOIN service_categories sc2 ON sc2.id = ps2.category_id WHERE ps2.provider_id = p.id AND sc2.slug = $${params.length})`
      );
    }
    if (minRating) {
      params.push(parseFloat(minRating));
      conditions.push(`p.avg_rating >= $${params.length}`);
    }
    if (maxPrice) {
      params.push(parseFloat(maxPrice));
      conditions.push(
        `EXISTS (SELECT 1 FROM provider_services ps3 WHERE ps3.provider_id = p.id AND ps3.price <= $${params.length})`
      );
    }

    const { rows } = await pool.query(`
      SELECT
        p.id, p.lat, p.lng, p.avg_rating, p.review_count, p.profile_photo, p.service_area, p.is_verified,
        (SELECT jsonb_build_object('name', u2.name, 'location', u2.location)
         FROM users u2 WHERE u2.id = p.user_id) AS "user",
        COALESCE((
          SELECT jsonb_agg(s_data)
          FROM (
            SELECT jsonb_build_object(
              'id', ps.id, 'title', ps.title, 'price', ps.price, 'price_unit', ps.price_unit,
              'category', (SELECT jsonb_build_object('id', sc.id, 'name', sc.name, 'slug', sc.slug, 'icon', sc.icon)
                           FROM service_categories sc WHERE sc.id = ps.category_id)
            ) AS s_data
            FROM provider_services ps WHERE ps.provider_id = p.id ORDER BY ps.price ASC LIMIT 5
          ) limited_svc
        ), '[]') AS services
      FROM providers p
      JOIN users u ON u.id = p.user_id
      WHERE ${conditions.join(' AND ')}
    `, params);

    const providers = deepToCamel(rows)
      .map((p) => ({
        ...p,
        distanceKm: Math.round(haversineKm(lat, lng, Number(p.lat), Number(p.lng)) * 10) / 10,
      }))
      .filter((p) => p.distanceKm <= radius)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    res.json({ providers, center: { lat, lng }, radius });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch nearby providers' });
  }
});

// GET /api/providers/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `${PROVIDER_FULL_SELECT} WHERE p.id = $1`,
      [parseInt(req.params.id)]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Provider not found' });
    res.json(deepToCamel(rows[0]));
  } catch {
    res.status(500).json({ error: 'Failed to fetch provider' });
  }
});

// PUT /api/providers/:id
router.put('/:id', authenticate, async (req, res) => {
  try {
    const providerId = parseInt(req.params.id);
    const { rows: provRows } = await pool.query('SELECT * FROM providers WHERE id = $1', [providerId]);
    if (provRows.length === 0) return res.status(404).json({ error: 'Provider not found' });
    const provider = deepToCamel(provRows[0]);

    if (provider.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const schema = z.object({
      bio: z.string().optional(),
      experienceYears: z.number().int().min(0).optional(),
      serviceArea: z.string().optional(),
      phone: z.string().optional().nullable(),
      profilePhoto: z.string().optional(),
      cnicNumber: z.string().regex(/^\d{5}-\d{7}-\d{1}$/, 'Invalid CNIC format').optional().nullable(),
      cnicFront: z.string().optional().nullable(),
      cnicBack: z.string().optional().nullable(),
    });

    const data = schema.parse(req.body);
    const { phone, ...providerData } = data;

    if (req.user.role !== 'admin' && (providerData.cnicNumber !== undefined || providerData.cnicFront !== undefined || providerData.cnicBack !== undefined)) {
      providerData.isVerified = false;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      if (phone !== undefined) {
        await client.query('UPDATE users SET phone = $1 WHERE id = $2', [phone || null, provider.userId]);
      }

      const fieldMap = {
        bio: 'bio', experienceYears: 'experience_years', serviceArea: 'service_area',
        profilePhoto: 'profile_photo', cnicNumber: 'cnic_number', cnicFront: 'cnic_front',
        cnicBack: 'cnic_back', isVerified: 'is_verified',
      };
      const updates = [];
      const updateParams = [];
      for (const [jsKey, dbCol] of Object.entries(fieldMap)) {
        if (providerData[jsKey] !== undefined) {
          updateParams.push(providerData[jsKey]);
          updates.push(`${dbCol} = $${updateParams.length}`);
        }
      }
      if (updates.length > 0) {
        updateParams.push(providerId);
        await client.query(`UPDATE providers SET ${updates.join(', ')} WHERE id = $${updateParams.length}`, updateParams);
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    const { rows } = await pool.query(`${PROVIDER_FULL_SELECT} WHERE p.id = $1`, [providerId]);
    res.json(deepToCamel(rows[0]));
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: 'Update failed' });
  }
});

// POST /api/providers/:id/services
router.post('/:id/services', authenticate, async (req, res) => {
  try {
    const providerId = parseInt(req.params.id);
    const { rows: provRows } = await pool.query('SELECT * FROM providers WHERE id = $1', [providerId]);
    if (provRows.length === 0 || (provRows[0].user_id !== req.user.id && req.user.role !== 'admin')) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const schema = z.object({
      categoryId: z.number().int(),
      title: z.string().min(2),
      price: z.number().positive(),
      priceUnit: z.string().default('fixed'),
    });
    const data = schema.parse(req.body);

    const { rows } = await pool.query(
      `INSERT INTO provider_services (provider_id, category_id, title, price, price_unit)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [providerId, data.categoryId, data.title, data.price, data.priceUnit]
    );
    const service = deepToCamel(rows[0]);

    const { rows: catRows } = await pool.query('SELECT * FROM service_categories WHERE id = $1', [service.categoryId]);
    service.category = deepToCamel(catRows[0]);

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
    const { rows: provRows } = await pool.query('SELECT * FROM providers WHERE id = $1', [providerId]);
    if (provRows.length === 0 || (provRows[0].user_id !== req.user.id && req.user.role !== 'admin')) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await pool.query('DELETE FROM provider_services WHERE id = $1', [parseInt(req.params.serviceId)]);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete service' });
  }
});

// PUT /api/providers/:id/availability
router.put('/:id/availability', authenticate, async (req, res) => {
  try {
    const providerId = parseInt(req.params.id);
    const { rows: provRows } = await pool.query('SELECT * FROM providers WHERE id = $1', [providerId]);
    if (provRows.length === 0 || (provRows[0].user_id !== req.user.id && req.user.role !== 'admin')) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const slots = z.array(z.object({
      dayOfWeek: z.number().int().min(0).max(6),
      startTime: z.string(),
      endTime: z.string(),
    })).parse(req.body.slots);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM availability_slots WHERE provider_id = $1', [providerId]);
      for (const slot of slots) {
        await client.query(
          'INSERT INTO availability_slots (provider_id, day_of_week, start_time, end_time) VALUES ($1, $2, $3, $4)',
          [providerId, slot.dayOfWeek, slot.startTime, slot.endTime]
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    res.json({ created: slots.length });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: 'Failed to update availability' });
  }
});

module.exports = router;
