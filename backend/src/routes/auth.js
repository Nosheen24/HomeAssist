const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const pool = require('../lib/db');
const { deepToCamel } = require('../lib/utils');

const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().optional(),
  location: z.string().optional(),
  role: z.enum(['customer', 'provider']).default('customer'),
  bio: z.string().optional(),
  experienceYears: z.number().int().min(0).optional(),
  serviceArea: z.string().optional(),
  cnicNumber: z.string().regex(/^\d{5}-\d{7}-\d{1}$/, 'Invalid CNIC format (XXXXX-XXXXXXX-X)').optional().nullable(),
  cnicFront: z.string().optional().nullable(),
  cnicBack: z.string().optional().nullable(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

router.post('/register', async (req, res) => {
  try {
    const data = registerSchema.parse(req.body);

    const { rows: existing } = await pool.query('SELECT id FROM users WHERE email = $1', [data.email]);
    if (existing.length > 0) return res.status(409).json({ error: 'Email already registered' });

    const passwordHash = await bcrypt.hash(data.password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash, phone, location, role)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [data.name, data.email, passwordHash, data.phone || null, data.location || null, data.role]
    );
    const user = deepToCamel(rows[0]);

    if (data.role === 'provider') {
      await pool.query(
        `INSERT INTO providers (user_id, bio, experience_years, service_area, cnic_number, cnic_front, cnic_back)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [user.id, data.bio || '', data.experienceYears || 0, data.serviceArea || data.location || '',
         data.cnicNumber || null, data.cnicFront || null, data.cnicBack || null]
      );
    }

    const token = signToken(user);
    res.status(201).json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
    const user = deepToCamel(rows[0]);

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signToken(user);
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: 'Login failed' });
  }
});

router.get('/me', require('../middleware/auth').authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.*,
         (SELECT row_to_json(p) FROM providers p WHERE p.user_id = u.id) AS provider
       FROM users u WHERE u.id = $1`,
      [req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const user = deepToCamel(rows[0]);
    const { passwordHash, ...safe } = user;
    res.json(safe);
  } catch {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

module.exports = router;
