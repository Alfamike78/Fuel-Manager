import express from 'express';
import { pool } from '../config/db.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

const VALID_FUEL_TYPES = ['diesel', 'gasoline'];

router.use(verifyToken);

// GET /api/ground-vehicles
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM ground_vehicles
       WHERE company_id = $1 AND is_active = true
       ORDER BY name ASC`,
      [req.user.company_id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/ground-vehicles/:id
router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM ground_vehicles
       WHERE id = $1 AND company_id = $2 AND is_active = true`,
      [req.params.id, req.user.company_id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Ground vehicle not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// POST /api/ground-vehicles — admin+
router.post('/', requireRole(['admin', 'superadmin']), async (req, res, next) => {
  try {
    const { plate, name, fuel_type, total_km = 0, notes } = req.body;

    if (!plate || !name || !fuel_type) {
      return res.status(400).json({ error: 'plate, name, and fuel_type are required' });
    }
    if (!VALID_FUEL_TYPES.includes(fuel_type)) {
      return res.status(400).json({ error: `fuel_type must be one of: ${VALID_FUEL_TYPES.join(', ')}` });
    }
    if (parseFloat(total_km) < 0) {
      return res.status(400).json({ error: 'total_km cannot be negative' });
    }

    // Check for duplicate plate within company
    const dup = await pool.query(
      'SELECT id FROM ground_vehicles WHERE plate = $1 AND company_id = $2 AND is_active = true',
      [plate.toUpperCase(), req.user.company_id]
    );
    if (dup.rows.length) {
      return res.status(409).json({ error: 'A vehicle with this plate already exists' });
    }

    const { rows } = await pool.query(
      `INSERT INTO ground_vehicles (company_id, plate, name, fuel_type, total_km, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        req.user.company_id,
        plate.toUpperCase(),
        name,
        fuel_type,
        total_km,
        notes || null,
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// PUT /api/ground-vehicles/:id — admin+
router.put('/:id', requireRole(['admin', 'superadmin']), async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await pool.query(
      'SELECT * FROM ground_vehicles WHERE id = $1 AND company_id = $2 AND is_active = true',
      [id, req.user.company_id]
    );
    if (!existing.rows.length) return res.status(404).json({ error: 'Ground vehicle not found' });
    const v = existing.rows[0];

    const {
      plate = v.plate,
      name = v.name,
      fuel_type = v.fuel_type,
      total_km = v.total_km,
      notes = v.notes,
    } = req.body;

    if (!VALID_FUEL_TYPES.includes(fuel_type)) {
      return res.status(400).json({ error: `fuel_type must be one of: ${VALID_FUEL_TYPES.join(', ')}` });
    }
    if (parseFloat(total_km) < 0) {
      return res.status(400).json({ error: 'total_km cannot be negative' });
    }

    const plateUpper = plate.toUpperCase();
    if (plateUpper !== v.plate) {
      const dup = await pool.query(
        'SELECT id FROM ground_vehicles WHERE plate = $1 AND company_id = $2 AND is_active = true AND id != $3',
        [plateUpper, req.user.company_id, id]
      );
      if (dup.rows.length) {
        return res.status(409).json({ error: 'A vehicle with this plate already exists' });
      }
    }

    const { rows } = await pool.query(
      `UPDATE ground_vehicles
       SET plate = $1, name = $2, fuel_type = $3, total_km = $4, notes = $5
       WHERE id = $6 AND company_id = $7
       RETURNING *`,
      [plateUpper, name, fuel_type, total_km, notes || null, id, req.user.company_id]
    );
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/ground-vehicles/:id — soft delete, admin+
router.delete('/:id', requireRole(['admin', 'superadmin']), async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `UPDATE ground_vehicles SET is_active = false
       WHERE id = $1 AND company_id = $2 AND is_active = true
       RETURNING id`,
      [req.params.id, req.user.company_id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Ground vehicle not found' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
