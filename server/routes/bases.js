import express from 'express';
import { pool } from '../config/db.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// GET /api/bases — list bases for user's company
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT b.*, COUNT(t.id) FILTER (WHERE t.is_active = true) AS tanks_count
       FROM bases b
       LEFT JOIN tanks t ON t.base_id = b.id
       WHERE b.company_id = $1 AND b.is_active = true
       GROUP BY b.id
       ORDER BY b.name ASC`,
      [req.user.company_id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/bases — create base (admin+)
router.post('/', requireRole(['admin', 'superadmin']), async (req, res, next) => {
  try {
    const { name, location, latitude, longitude } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    const { rows } = await pool.query(
      `INSERT INTO bases (company_id, name, location, latitude, longitude)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [req.user.company_id, name, location || null, latitude || null, longitude || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// PUT /api/bases/:id — update base (admin+)
router.put('/:id', requireRole(['admin', 'superadmin']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, location, latitude, longitude } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    const { rows } = await pool.query(
      `UPDATE bases
       SET name = $1, location = $2, latitude = $3, longitude = $4
       WHERE id = $5 AND company_id = $6 AND is_active = true
       RETURNING *`,
      [name, location || null, latitude || null, longitude || null, id, req.user.company_id]
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'Base not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/bases/:id — soft delete (admin+)
router.delete('/:id', requireRole(['admin', 'superadmin']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      `UPDATE bases SET is_active = false
       WHERE id = $1 AND company_id = $2 AND is_active = true
       RETURNING id`,
      [id, req.user.company_id]
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'Base not found' });
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
