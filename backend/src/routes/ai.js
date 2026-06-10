const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

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
    const where = { services: { some: { category: { slug: { in: categories } } } } };
    if (location) {
      where.OR = [
        { serviceArea: { contains: location } },
        { user: { location: { contains: location } } },
      ];
    }

    const providers = await prisma.provider.findMany({
      where,
      orderBy: { avgRating: 'desc' },
      take: 5,
      include: {
        user: { select: { name: true, location: true } },
        services: { include: { category: true }, take: 3 },
      },
    });

    res.json({ categories, urgency, explanation, providers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Recommendation failed' });
  }
});

function keywordClassify(problem) {
  const text = problem.toLowerCase();
  const map = {
    plumbing: ['pipe', 'leak', 'drain', 'tap', 'water', 'toilet', 'flush', 'pani', 'nali'],
    electrical: ['electric', 'wire', 'switch', 'light', 'power', 'plug', 'bijli', 'bulb', 'fuse'],
    cleaning: ['clean', 'dirty', 'dust', 'sweep', 'mop', 'wash', 'safai', 'ganda'],
    carpentry: ['door', 'window', 'wood', 'furniture', 'cabinet', 'darwaza', 'carpenter'],
    'ac-repair': ['ac', 'air condition', 'cooling', 'hvac', 'aircon', 'thanda', 'cool'],
    painting: ['paint', 'wall', 'colour', 'color', 'rang', 'deewar', 'brush'],
    'appliance-repair': ['appliance', 'fridge', 'washing machine', 'microwave', 'oven', 'machine'],
    gardening: ['garden', 'plant', 'grass', 'tree', 'lawn', 'flower', 'baagh'],
  };

  const categories = Object.entries(map)
    .filter(([, words]) => words.some((w) => text.includes(w)))
    .map(([slug]) => slug)
    .slice(0, 3);

  if (categories.length === 0) categories.push('cleaning');

  let urgency = 'medium';
  if (['flood', 'fire', 'gas leak', 'no power', 'emergency', 'urgent'].some((w) => text.includes(w))) {
    urgency = 'high';
  } else if (['routine', 'whenever', 'no rush'].some((w) => text.includes(w))) {
    urgency = 'low';
  }

  return {
    categories,
    urgency,
    explanation: `Based on your description, you need ${categories.join(', ')} services.`,
  };
}

module.exports = router;
