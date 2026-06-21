import express from 'express';
import { pool } from '../config/db.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

const VALID_FUEL_TYPES = ['jet_a1', 'avgas'];

router.use(verifyToken);

// GET /api/aircraft
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM aircraft
       WHERE company_id = $1 AND is_active = true
       ORDER BY registration ASC`,
      [req.user.company_id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/aircraft/:id
router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM aircraft
       WHERE id = $1 AND company_id = $2 AND is_active = true`,
      [req.params.id, req.user.company_id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Aircraft not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// POST /api/aircraft — admin+
router.post('/', requireRole(['admin', 'superadmin']), async (req, res, next) => {
  try {
    const { registration, model, fuel_type, total_flight_hours = 0, notes } = req.body;

    if (!registration || !model || !fuel_type) {
      return res.status(400).json({ error: 'registration, model, and fuel_type are required' });
    }
    if (!VALID_FUEL_TYPES.includes(fuel_type)) {
      return res.status(400).json({ error: `fuel_type must be one of: ${VALID_FUEL_TYPES.join(', ')}` });
    }
    if (parseFloat(total_flight_hours) < 0) {
      return res.status(400).json({ error: 'total_flight_hours cannot be negative' });
    }

    // Check for duplicate registration within company
    const dup = await pool.query(
      'SELECT id FROM aircraft WHERE registration = $1 AND company_id = $2 AND is_active = true',
      [registration.toUpperCase(), req.user.company_id]
    );
    if (dup.rows.length) {
      return res.status(409).json({ error: 'An aircraft with this registration already exists' });
    }

    const { rows } = await pool.query(
      `INSERT INTO aircraft (company_id, registration, model, fuel_type, total_flight_hours, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        req.user.company_id,
        registration.toUpperCase(),
        model,
        fuel_type,
        total_flight_hours,
        notes || null,
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// PUT /api/aircraft/:id — admin+
router.put('/:id', requireRole(['admin', 'superadmin']), async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await pool.query(
      'SELECT * FROM aircraft WHERE id = $1 AND company_id = $2 AND is_active = true',
      [id, req.user.company_id]
    );
    if (!existing.rows.length) return res.status(404).json({ error: 'Aircraft not found' });
    const ac = existing.rows[0];

    const {
      registration = ac.registration,
      model = ac.model,
      fuel_type = ac.fuel_type,
      total_flight_hours = ac.total_flight_hours,
      notes = ac.notes,
    } = req.body;

    if (!VALID_FUEL_TYPES.includes(fuel_type)) {
      return res.status(400).json({ error: `fuel_type must be one of: ${VALID_FUEL_TYPES.join(', ')}` });
    }
    if (parseFloat(total_flight_hours) < 0) {
      return res.status(400).json({ error: 'total_flight_hours cannot be negative' });
    }

    // Check duplicate registration (exclude self)
    const regUpper = registration.toUpperCase();
    if (regUpper !== ac.registration) {
      const dup = await pool.query(
        'SELECT id FROM aircraft WHERE registration = $1 AND company_id = $2 AND is_active = true AND id != $3',
        [regUpper, req.user.company_id, id]
      );
      if (dup.rows.length) {
        return res.status(409).json({ error: 'An aircraft with this registration already exists' });
      }
    }

    const { rows } = await pool.query(
      `UPDATE aircraft
       SET registration = $1, model = $2, fuel_type = $3, total_flight_hours = $4, notes = $5
       WHERE id = $6 AND company_id = $7
       RETURNING *`,
      [regUpper, model, fuel_type, total_flight_hours, notes || null, id, req.user.company_id]
    );
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/aircraft/:id — soft delete, admin+
router.delete('/:id', requireRole(['admin', 'superadmin']), async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `UPDATE aircraft SET is_active = false
       WHERE id = $1 AND company_id = $2 AND is_active = true
       RETURNING id`,
      [req.params.id, req.user.company_id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Aircraft not found' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
