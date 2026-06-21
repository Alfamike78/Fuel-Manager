import express from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

const generateToken = (user) =>
  jwt.sign(
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

// ─── Protected routes (admin only) ───────────────────────────────────────────

router.use(verifyToken);

// GET /api/users — list company users
router.get('/', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, email, first_name, last_name, role, language,
              is_active, last_login, created_at
       FROM users
       WHERE company_id = $1 AND role != 'superadmin'
       ORDER BY role ASC, first_name ASC`,
      [req.user.company_id]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/users/invite — create invitation token (admin only)
router.post('/invite', requireRole('admin'), async (req, res, next) => {
  try {
    const { email, role = 'operator' } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const validRoles = ['admin', 'operator'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists in this company
    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1 AND company_id = $2',
      [normalizedEmail, req.user.company_id]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'User already exists in this company' });
    }

    // Invalidate any pending invitations for this email + company
    await pool.query(
      `UPDATE invitation_tokens
       SET used_at = NOW()
       WHERE company_id = $1 AND email = $2 AND used_at IS NULL`,
      [req.user.company_id, normalizedEmail]
    );

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await pool.query(
      `INSERT INTO invitation_tokens (company_id, email, role, token, invited_by, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.user.company_id, normalizedEmail, role, token, req.user.id, expiresAt]
    );

    const companyResult = await pool.query('SELECT name FROM companies WHERE id = $1', [req.user.company_id]);
    const companyName = companyResult.rows[0]?.name || '';

    res.status(201).json({
      token,
      invite_link: `${process.env.CLIENT_URL || 'http://localhost:5173'}/invite/${token}`,
      email: normalizedEmail,
      role,
      company_name: companyName,
      expires_at: expiresAt,
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/users/:id/role — change user role (admin only)
router.patch('/:id/role', requireRole('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (id === req.user.id) {
      return res.status(400).json({ error: 'Cannot change your own role' });
    }

    const validRoles = ['admin', 'operator'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const result = await pool.query(
      `UPDATE users SET role = $1
       WHERE id = $2 AND company_id = $3 AND role != 'superadmin'
       RETURNING id, email, first_name, last_name, role, is_active`,
      [role, id, req.user.company_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/users/:id/status — toggle active/suspended (admin only)
router.patch('/:id/status', requireRole('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    if (id === req.user.id) {
      return res.status(400).json({ error: 'Cannot change your own status' });
    }

    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ error: 'is_active must be a boolean' });
    }

    const result = await pool.query(
      `UPDATE users SET is_active = $1
       WHERE id = $2 AND company_id = $3 AND role != 'superadmin'
       RETURNING id, email, first_name, last_name, role, is_active`,
      [is_active, id, req.user.company_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/users/:id — remove user (admin only)
router.delete('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;

    if (id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const result = await pool.query(
      `DELETE FROM users
       WHERE id = $1 AND company_id = $2 AND role != 'superadmin'
       RETURNING id`,
      [id, req.user.company_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted' });
  } catch (err) {
    next(err);
  }
});

// ─── Public invitation routes ─────────────────────────────────────────────────

// GET /api/users/invite/:token — verify token (public)
router.get('/invite/:token', async (req, res, next) => {
  try {
    const { token } = req.params;

    const result = await pool.query(
      `SELECT it.id, it.email, it.role, it.expires_at, it.used_at,
              c.name as company_name
       FROM invitation_tokens it
       JOIN companies c ON it.company_id = c.id
       WHERE it.token = $1`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid invitation link' });
    }

    const invite = result.rows[0];

    if (invite.used_at) {
      return res.status(410).json({ error: 'Invitation already used' });
    }

    if (new Date(invite.expires_at) < new Date()) {
      return res.status(410).json({ error: 'Invitation expired' });
    }

    res.json({
      email: invite.email,
      role: invite.role,
      company_name: invite.company_name,
      expires_at: invite.expires_at,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/users/invite/:token/accept — accept invitation (public)
router.post('/invite/:token/accept', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { token } = req.params;
    const { first_name, last_name, password } = req.body;

    if (!first_name || !last_name || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    await client.query('BEGIN');

    const inviteResult = await client.query(
      `SELECT it.*, c.name as company_name, c.slug as company_slug
       FROM invitation_tokens it
       JOIN companies c ON it.company_id = c.id
       WHERE it.token = $1 AND it.used_at IS NULL
       FOR UPDATE`,
      [token]
    );

    if (inviteResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Invalid or already used invitation' });
    }

    const invite = inviteResult.rows[0];

    if (new Date(invite.expires_at) < new Date()) {
      await client.query('ROLLBACK');
      return res.status(410).json({ error: 'Invitation expired' });
    }

    // Check if email already taken globally
    const emailCheck = await client.query('SELECT id FROM users WHERE email = $1', [invite.email]);
    if (emailCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Email already registered' });
    }

    const password_hash = await bcrypt.hash(password, 12);

    const userResult = await client.query(
      `INSERT INTO users (company_id, email, password_hash, first_name, last_name, role)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [invite.company_id, invite.email, password_hash, first_name.trim(), last_name.trim(), invite.role]
    );
    const user = userResult.rows[0];

    await client.query(
      'UPDATE invitation_tokens SET used_at = NOW() WHERE id = $1',
      [invite.id]
    );

    await client.query('COMMIT');

    const authToken = generateToken({ ...user, company_id: invite.company_id });

    res.status(201).json({
      token: authToken,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        company_id: invite.company_id,
        company_name: invite.company_name,
        company_slug: invite.company_slug,
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
