const router = require('express').Router();
const pool = require('../lib/db');
const { deepToCamel } = require('../lib/utils');

router.post('/recommend', async (req, res) => {
  const { problem, location } = req.body;
  if (!problem || typeof problem !== 'string') {
    return res.status(400).json({ error: 'problem text is required' });
  }

  let classificationResult = null;

  if (process.env.GROQ_API_KEY) {
    try {
      const Groq = require('groq-sdk');
      const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
      const response = await client.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 512,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `You are a home service classification assistant for a Pakistani service marketplace.
Given a customer problem description, respond ONLY with valid JSON in this exact format:
{"categories":["slug1"],"urgency":"low|medium|high|emergency","explanation":"brief explanation"}

Available slugs: plumbing, electrical, cleaning, carpentry, ac-repair, painting, appliance-repair, gardening

Urgency: emergency=safety hazard, high=same-day needed, medium=within days, low=routine`,
          },
          { role: 'user', content: problem },
        ],
      });
      classificationResult = JSON.parse(response.choices[0].message.content);
    } catch (err) {
      console.error('Groq API error:', err.message);
    }
  }

  if (!classificationResult) {
    classificationResult = keywordClassify(problem);
  }

  const { categories, urgency, explanation } = classificationResult;

  try {
    const conditions = [
      `EXISTS (SELECT 1 FROM provider_services ps_ai JOIN service_categories sc_ai ON sc_ai.id = ps_ai.category_id WHERE ps_ai.provider_id = p.id AND sc_ai.slug = ANY($1))`,
    ];
    const params = [categories];

    if (location) {
      params.push(`%${location}%`);
      conditions.push(`(p.service_area ILIKE $${params.length} OR u.location ILIKE $${params.length})`);
    }

    const { rows } = await pool.query(`
      SELECT
        p.*,
        (SELECT jsonb_build_object('name', u2.name, 'location', u2.location) FROM users u2 WHERE u2.id = p.user_id) AS "user",
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
      WHERE ${conditions.join(' AND ')}
      ORDER BY p.avg_rating DESC
      LIMIT 5
    `, params);

    res.json({ categories, urgency, explanation, providers: deepToCamel(rows) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Recommendation failed' });
  }
});

function keywordClassify(problem) {
  const text = problem.toLowerCase();
  const map = {
    plumbing:          ['pipe', 'leak', 'drain', 'tap', 'water', 'toilet', 'flush', 'pani', 'nali'],
    electrical:        ['electric', 'wire', 'switch', 'light', 'power', 'plug', 'bijli', 'bulb', 'fuse'],
    cleaning:          ['clean', 'dirty', 'dust', 'sweep', 'mop', 'wash', 'safai', 'ganda'],
    carpentry:         ['door', 'window', 'wood', 'furniture', 'cabinet', 'darwaza', 'carpenter'],
    'ac-repair':       ['ac', 'air condition', 'cooling', 'hvac', 'aircon', 'thanda', 'cool'],
    painting:          ['paint', 'wall', 'colour', 'color', 'rang', 'deewar', 'brush'],
    'appliance-repair':['appliance', 'fridge', 'washing machine', 'microwave', 'oven', 'machine'],
    gardening:         ['garden', 'plant', 'grass', 'tree', 'lawn', 'flower', 'baagh'],
  };

  const categories = Object.entries(map)
    .filter(([, words]) => words.some((w) => text.includes(w)))
    .map(([slug]) => slug)
    .slice(0, 3);

  if (categories.length === 0) categories.push('cleaning');

  let urgency = 'medium';
  if (['flood', 'fire', 'gas leak', 'no power', 'emergency', 'urgent'].some((w) => text.includes(w))) urgency = 'high';
  else if (['routine', 'whenever', 'no rush'].some((w) => text.includes(w))) urgency = 'low';

  return {
    categories,
    urgency,
    explanation: `Based on your description, you need ${categories.join(', ')} services.`,
  };
}

module.exports = router;
