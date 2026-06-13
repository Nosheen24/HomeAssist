function deepToCamel(obj) {
  if (Array.isArray(obj)) return obj.map(deepToCamel);
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [
        k.replace(/_([a-z])/g, (_, c) => c.toUpperCase()),
        deepToCamel(v),
      ])
    );
  }
  return obj;
}

// Reusable SELECT that returns a booking row with all nested relations
// Use as: `${BOOKING_FULL_SELECT} WHERE b.id = $1`
const BOOKING_FULL_SELECT = `
  SELECT
    b.*,
    (SELECT jsonb_build_object(
      'id', ps.id, 'title', ps.title, 'price', ps.price, 'price_unit', ps.price_unit,
      'provider_id', ps.provider_id, 'category_id', ps.category_id,
      'category', (SELECT jsonb_build_object('id', sc.id, 'name', sc.name, 'slug', sc.slug, 'icon', sc.icon)
                   FROM service_categories sc WHERE sc.id = ps.category_id)
    ) FROM provider_services ps WHERE ps.id = b.service_id) AS service,
    (SELECT jsonb_build_object(
      'id', p.id, 'user_id', p.user_id, 'avg_rating', p.avg_rating, 'is_verified', p.is_verified,
      'profile_photo', p.profile_photo, 'service_area', p.service_area,
      'user', (SELECT jsonb_build_object('name', pu.name, 'phone', pu.phone)
               FROM users pu WHERE pu.id = p.user_id)
    ) FROM providers p WHERE p.id = b.provider_id) AS provider,
    (SELECT jsonb_build_object('id', cu.id, 'name', cu.name, 'phone', cu.phone, 'email', cu.email)
     FROM users cu WHERE cu.id = b.customer_id) AS customer,
    (SELECT jsonb_build_object('id', r.id, 'rating', r.rating, 'comment', r.comment,
                               'created_at', r.created_at, 'booking_id', r.booking_id, 'provider_id', r.provider_id)
     FROM reviews r WHERE r.booking_id = b.id) AS review
  FROM bookings b
`;

module.exports = { deepToCamel, BOOKING_FULL_SELECT };
