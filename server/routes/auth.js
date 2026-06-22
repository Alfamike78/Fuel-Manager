import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

const router = express.Router();

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      company_id: user.company_id,
      first_name: user.first_name,
      last_name: user.last_name,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await pool.query(
      `SELECT u.*, c.name as company_name, c.slug as company_slug, c.status as company_status
       FROM users u
       LEFT JOIN companies c ON u.company_id = c.id
       WHERE u.email = $1 AND u.is_active = true`,
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

    const token = generateToken(user);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        company_id: user.company_id,
        company_name: user.company_name,
        company_slug: user.company_slug,
        language: user.language,
        avatar_url: user.avatar_url,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { company_name, first_name, last_name, email, password } = req.body;

    if (!company_name || !first_name || !last_name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    await client.query('BEGIN');

    // Get Trial plan
    const planResult = await client.query(
      "SELECT id FROM subscription_plans WHERE name = 'Trial' LIMIT 1"
    );
    const planId = planResult.rows[0]?.id || null;

    // Generate slug
    const slug = company_name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 100);

    // Check slug uniqueness and append random suffix if needed
    const slugCheck = await client.query('SELECT id FROM companies WHERE slug = $1', [slug]);
    const finalSlug = slugCheck.rows.length > 0 ? `${slug}-${Date.now()}` : slug;

    // Create company
    const companyResult = await client.query(
      `INSERT INTO companies (name, slug, plan_id, status, trial_ends_at)
       VALUES ($1, $2, $3, 'trial', NOW() + INTERVAL '14 days')
       RETURNING *`,
      [company_name.trim(), finalSlug, planId]
    );
    const company = companyResult.rows[0];

    // Hash password
    const password_hash = await bcrypt.hash(password, 12);

    // Create admin user
    const userResult = await client.query(
      `INSERT INTO users (company_id, email, password_hash, first_name, last_name, role)
       VALUES ($1, $2, $3, $4, $5, 'admin')
       RETURNING *`,
      [company.id, email.toLowerCase().trim(), password_hash, first_name.trim(), last_name.trim()]
    );
    const user = userResult.rows[0];

    await client.query('COMMIT');

    const token = generateToken({ ...user, company_id: company.id });

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        company_id: company.id,
        company_name: company.name,
        company_slug: company.slug,
        language: user.language,
        avatar_url: user.avatar_url,
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

export default router;
