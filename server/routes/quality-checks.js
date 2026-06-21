import express from 'express';
import { pool } from '../config/db.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(verifyToken);

// GET /api/quality-checks — list for company, optional filters
router.get('/', async (req, res, next) => {
  try {
    const { tank_id, aircraft_id, subject_type } = req.query;
    const params = [req.user.company_id];
    const filters = [];

    if (tank_id) {
      params.push(tank_id);
      filters.push(`qc.tank_id = $${params.length}`);
    }
    if (aircraft_id) {
      params.push(aircraft_id);
      filters.push(`qc.aircraft_id = $${params.length}`);
    }
    if (subject_type) {
      params.push(subject_type);
      filters.push(`qc.subject_type = $${params.length}`);
    }

    const where = filters.length ? `AND ${filters.join(' AND ')}` : '';

    const { rows } = await pool.query(
      `SELECT qc.*,
              u.first_name AS operator_first_name, u.last_name AS operator_last_name,
              t.name AS tank_name, t.code AS tank_code,
              a.registration AS aircraft_registration
       FROM quality_checks qc
       LEFT JOIN users u ON u.id = qc.operator_id
       LEFT JOIN tanks t ON t.id = qc.tank_id
       LEFT JOIN aircraft a ON a.id = qc.aircraft_id
       WHERE qc.company_id = $1 ${where}
       ORDER BY qc.check_date DESC`,
      params
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/quality-checks — create QC (operator+)
router.post('/', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const {
      check_date, subject_type, tank_id, aircraft_id,
      liters_drained, is_compliant, notes,
    } = req.body;

    if (!check_date || !subject_type || liters_drained === undefined || is_compliant === undefined) {
      return res.status(400).json({ error: 'check_date, subject_type, liters_drained, and is_compliant are required' });
    }
    if (!['tank', 'aircraft'].includes(subject_type)) {
      return res.status(400).json({ error: 'subject_type must be tank or aircraft' });
    }
    if (!is_compliant && (!notes || !notes.trim())) {
      return res.status(400).json({ error: 'notes are required when is_compliant is false' });
    }
    if (parseFloat(liters_drained) < 0) {
      return res.status(400).json({ error: 'liters_drained must be non-negative' });
    }

    await client.query('BEGIN');

    // If subject is tank, subtract liters_drained from current_liters
    if (subject_type === 'tank' && tank_id && parseFloat(liters_drained) > 0) {
      const tankResult = await client.query(
        'SELECT * FROM tanks WHERE id = $1 AND company_id = $2 AND is_active = true FOR UPDATE',
        [tank_id, req.user.company_id]
      );
      if (!tankResult.rows.length) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Tank not found' });
      }
      const tank = tankResult.rows[0];
      const newLevel = Math.max(0, parseFloat(tank.current_liters) - parseFloat(liters_drained));
      await client.query(
        'UPDATE tanks SET current_liters = $1, updated_at = NOW() WHERE id = $2',
        [newLevel, tank_id]
      );
    }

    const { rows } = await client.query(
      `INSERT INTO quality_checks
         (company_id, check_date, operator_id, subject_type, tank_id, aircraft_id, liters_drained, is_compliant, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        req.user.company_id,
        check_date,
        req.user.id,
        subject_type,
        tank_id || null,
        aircraft_id || null,
        liters_drained,
        is_compliant,
        notes || null,
      ]
    );

    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// GET /api/quality-checks/:id — detail
router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT qc.*,
              u.first_name AS operator_first_name, u.last_name AS operator_last_name,
              t.name AS tank_name, t.code AS tank_code,
              a.registration AS aircraft_registration
       FROM quality_checks qc
       LEFT JOIN users u ON u.id = qc.operator_id
       LEFT JOIN tanks t ON t.id = qc.tank_id
       LEFT JOIN aircraft a ON a.id = qc.aircraft_id
       WHERE qc.id = $1 AND qc.company_id = $2`,
      [req.params.id, req.user.company_id]
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'Quality check not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// PUT /api/quality-checks/:id — update (operator who created or admin)
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await pool.query(
      'SELECT * FROM quality_checks WHERE id = $1 AND company_id = $2',
      [id, req.user.company_id]
    );
    if (!existing.rows.length) {
      return res.status(404).json({ error: 'Quality check not found' });
    }

    const qc = existing.rows[0];
    const isOwner = qc.operator_id === req.user.id;
    const isAdmin = ['admin', 'superadmin'].includes(req.user.role);

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'You can only edit your own quality checks' });
    }

    const {
      check_date = qc.check_date,
      liters_drained = qc.liters_drained,
      is_compliant = qc.is_compliant,
      notes = qc.notes,
    } = req.body;

    if (!is_compliant && (!notes || !notes.trim())) {
      return res.status(400).json({ error: 'notes are required when is_compliant is false' });
    }

    const { rows } = await pool.query(
      `UPDATE quality_checks
       SET check_date = $1, liters_drained = $2, is_compliant = $3, notes = $4
       WHERE id = $5 AND company_id = $6
       RETURNING *`,
      [check_date, liters_drained, is_compliant, notes || null, id, req.user.company_id]
    );
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

export default router;
