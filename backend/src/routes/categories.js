const router = require('express').Router();
const pool = require('../lib/db');
const { deepToCamel } = require('../lib/utils');

router.get('/', async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM service_categories ORDER BY name ASC');
    res.json(deepToCamel(rows));
  } catch {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

module.exports = router;
