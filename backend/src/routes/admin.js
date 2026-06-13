const router = require('express').Router();
const pool = require('../lib/db');
const { deepToCamel } = require('../lib/utils');
const { authenticate, requireRole } = require('../middleware/auth');

// GET /api/admin/providers/unverified
router.get('/providers/unverified', authenticate, requireRole('admin'), async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        p.*,
        (SELECT jsonb_build_object('name', u.name, 'email', u.email, 'phone', u.phone, 'location', u.location, 'created_at', u.created_at)
         FROM users u WHERE u.id = p.user_id) AS "user",
        COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'id', ps.id, 'title', ps.title, 'price', ps.price, 'price_unit', ps.price_unit,
            'category', (SELECT jsonb_build_object('id', sc.id, 'name', sc.name, 'slug', sc.slug)
                         FROM service_categories sc WHERE sc.id = ps.category_id)
          ))
          FROM provider_services ps WHERE ps.provider_id = p.id
        ), '[]') AS services
      FROM providers p
      WHERE p.is_verified = false
      ORDER BY p.id ASC
    `);
    res.json(deepToCamel(rows));
  } catch {
    res.status(500).json({ error: 'Failed to fetch unverified providers' });
  }
});

// PATCH /api/admin/providers/:id/verify
router.patch('/providers/:id/verify', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE providers SET is_verified = true WHERE id = $1
       RETURNING *, (SELECT jsonb_build_object('name', u.name, 'email', u.email) FROM users u WHERE u.id = providers.user_id) AS "user"`,
      [parseInt(req.params.id)]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Provider not found' });
    res.json(deepToCamel(rows[0]));
  } catch {
    res.status(500).json({ error: 'Failed to verify provider' });
  }
});

// GET /api/admin/stats
router.get('/stats', authenticate, requireRole('admin'), async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM users)                                        AS total_users,
        (SELECT COUNT(*) FROM providers)                                    AS total_providers,
        (SELECT COUNT(*) FROM providers WHERE is_verified = true)          AS verified_providers,
        (SELECT COUNT(*) FROM bookings)                                     AS total_bookings,
        (SELECT COUNT(*) FROM bookings WHERE status = 'pending')           AS pending_bookings,
        (SELECT COUNT(*) FROM bookings WHERE status IN ('completed','reviewed')) AS completed_bookings,
        (SELECT COUNT(*) FROM reviews)                                      AS total_reviews
    `);
    const r = rows[0];
    res.json({
      users:    { total: parseInt(r.total_users) },
      providers: { total: parseInt(r.total_providers), verified: parseInt(r.verified_providers) },
      bookings:  { total: parseInt(r.total_bookings), pending: parseInt(r.pending_bookings), completed: parseInt(r.completed_bookings) },
      reviews:   { total: parseInt(r.total_reviews) },
    });
  } catch {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;
