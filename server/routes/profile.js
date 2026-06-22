import express from 'express';
import bcrypt from 'bcryptjs';
import pool from '../config/db.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

router.use(verifyToken);

// GET /api/profile — get current user profile
router.get('/', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.language,
              u.avatar_url, u.is_active, u.last_login, u.created_at,
              u.company_id, c.name as company_name, c.slug as company_slug,
              c.status as company_status, c.primary_color, c.secondary_color,
              c.logo_url as company_logo
       FROM users u
       LEFT JOIN companies c ON u.company_id = c.id
       WHERE u.id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/profile — update profile
router.patch('/', async (req, res, next) => {
  try {
    const { first_name, last_name, language } = req.body;

    const validLanguages = ['it', 'en', 'tr', 'es'];
    if (language && !validLanguages.includes(language)) {
      return res.status(400).json({ error: 'Invalid language', valid: validLanguages });
    }

    const result = await pool.query(
      `UPDATE users
       SET first_name = COALESCE($1, first_name),
           last_name = COALESCE($2, last_name),
           language = COALESCE($3, language)
       WHERE id = $4
       RETURNING id, email, first_name, last_name, role, language, avatar_url`,
      [first_name, last_name, language, req.user.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/profile/password — change password
router.patch('/password', async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }

    if (new_password.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }

    const result = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    const user = result.rows[0];

    const isValid = await bcrypt.compare(current_password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const new_hash = await bcrypt.hash(new_password, 12);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [new_hash, req.user.id]);

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
