import express from 'express';
import { pool } from '../config/db.js';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { dismissTankAlertIfResolved } from '../utils/tankAlerts.js';

const router = express.Router();

router.use(verifyToken);

// GET /api/tank-loads — list all loads for company, optional ?tank_id= filter
router.get('/', async (req, res, next) => {
  try {
    const { tank_id } = req.query;
    const params = [req.user.company_id];
    let filter = '';
    if (tank_id) {
      params.push(tank_id);
      filter = `AND tl.tank_id = $${params.length}`;
    }

    const { rows } = await pool.query(
      `SELECT tl.*, t.name AS tank_name, t.code AS tank_code,
              u.first_name AS operator_first_name, u.last_name AS operator_last_name
       FROM tank_loads tl
       JOIN tanks t ON t.id = tl.tank_id
       LEFT JOIN users u ON u.id = tl.operator_id
       WHERE tl.company_id = $1 ${filter}
       ORDER BY tl.load_date DESC`,
      params
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/tank-loads — create load (operator+). Updates tank current_liters in transaction.
router.post('/', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { tank_id, load_date, provider_name, liters, delivery_note, notes } = req.body;

    if (!tank_id || !load_date || !liters) {
      return res.status(400).json({ error: 'tank_id, load_date, and liters are required' });
    }
    if (parseFloat(liters) <= 0) {
      return res.status(400).json({ error: 'liters must be greater than 0' });
    }

    await client.query('BEGIN');

    // Lock the tank row and verify ownership
    const tankResult = await client.query(
      'SELECT * FROM tanks WHERE id = $1 AND company_id = $2 AND is_active = true FOR UPDATE',
      [tank_id, req.user.company_id]
    );
    if (!tankResult.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Tank not found' });
    }

    const tank = tankResult.rows[0];
    const newLevel = parseFloat(tank.current_liters) + parseFloat(liters);
    if (newLevel > parseFloat(tank.capacity_liters)) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: `Load would exceed tank capacity. Available space: ${(parseFloat(tank.capacity_liters) - parseFloat(tank.current_liters)).toFixed(2)} L`,
      });
    }

    // Update tank level
    await client.query(
      'UPDATE tanks SET current_liters = $1, updated_at = NOW() WHERE id = $2',
      [newLevel, tank_id]
    );

    // Create load record
    const { rows } = await client.query(
      `INSERT INTO tank_loads (company_id, tank_id, load_date, operator_id, provider_name, liters, delivery_note, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [req.user.company_id, tank_id, load_date, req.user.id, provider_name || null, liters, delivery_note || null, notes || null]
    );

    await client.query('COMMIT');

    // Auto-dismiss low-tank alerts when the tank is refilled above threshold (non-blocking)
    dismissTankAlertIfResolved(req.user.company_id, tank_id, newLevel);

    res.status(201).json({ ...rows[0], tank_level_after: newLevel });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// GET /api/tank-loads/:id — single load detail
router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT tl.*, t.name AS tank_name, t.code AS tank_code,
              u.first_name AS operator_first_name, u.last_name AS operator_last_name
       FROM tank_loads tl
       JOIN tanks t ON t.id = tl.tank_id
       LEFT JOIN users u ON u.id = tl.operator_id
       WHERE tl.id = $1 AND tl.company_id = $2`,
      [req.params.id, req.user.company_id]
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'Load not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/tank-loads/:id — admin only, reverts tank current_liters
router.delete('/:id', requireRole(['admin', 'superadmin']), async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const loadResult = await client.query(
      'SELECT * FROM tank_loads WHERE id = $1 AND company_id = $2',
      [req.params.id, req.user.company_id]
    );
    if (!loadResult.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Load not found' });
    }

    const load = loadResult.rows[0];

    // Revert tank level
    await client.query(
      `UPDATE tanks
       SET current_liters = GREATEST(0, current_liters - $1), updated_at = NOW()
       WHERE id = $2 AND company_id = $3`,
      [load.liters, load.tank_id, req.user.company_id]
    );

    await client.query('DELETE FROM tank_loads WHERE id = $1', [req.params.id]);

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

export default router;
