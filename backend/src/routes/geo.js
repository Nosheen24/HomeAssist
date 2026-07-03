const router = require('express').Router();

// Nominatim usage policy: identify the app via User-Agent and send <= 1 req/sec.
// Browsers can't set User-Agent, so we proxy through the backend.
const USER_AGENT = 'HomeAssist/1.0 (on-demand home services; contact: muhammadobaid38@gmail.com)';
const NOMINATIM = 'https://nominatim.openstreetmap.org';

let lastCall = 0;
async function throttle() {
  const wait = Math.max(0, 1000 - (Date.now() - lastCall));
  if (wait) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();
}

async function nominatim(path) {
  await throttle();
  const res = await fetch(`${NOMINATIM}${path}`, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  return res.json();
}

// GET /api/geo/reverse?lat=&lng= — coords -> human-readable address
router.get('/reverse', async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return res.status(400).json({ error: 'lat and lng required' });
  try {
    const j = await nominatim(`/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
    res.json({ label: j.display_name || null, lat, lng });
  } catch {
    res.status(502).json({ error: 'Reverse geocoding failed' });
  }
});

// GET /api/geo/search?q= — address text -> candidate coords (biased to Pakistan)
router.get('/search', async (req, res) => {
  const q = (req.query.q || '').toString().trim();
  if (q.length < 3) return res.json([]);
  try {
    const j = await nominatim(`/search?format=jsonv2&limit=5&countrycodes=pk&q=${encodeURIComponent(q)}`);
    res.json((Array.isArray(j) ? j : []).map((x) => ({
      label: x.display_name,
      lat: parseFloat(x.lat),
      lng: parseFloat(x.lon),
    })));
  } catch {
    res.status(502).json({ error: 'Geocoding failed' });
  }
});

module.exports = router;
