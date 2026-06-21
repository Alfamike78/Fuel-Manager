import express from 'express';
import { pool } from '../config/db.js';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { logAudit } from '../utils/auditLog.js';

const router = express.Router();

const FUEL_TYPE_COLORS = {
  jet_a1: '#1a1a1a',
  avgas: '#dc2626',
  diesel: '#16a34a',
  gasoline: '#ca8a04',
};

const VALID_FUEL_TYPES = Object.keys(FUEL_TYPE_COLORS);

router.use(verifyToken);

// GET /api/tanks — list all tanks for company joined with base name
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT t.*, b.name AS base_name
       FROM tanks t
       LEFT JOIN bases b ON b.id = t.base_id
       WHERE t.company_id = $1 AND t.is_active = true
       ORDER BY t.fuel_type ASC, t.name ASC`,
      [req.user.company_id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/tanks/:id — single tank detail with base info
router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT t.*, b.name AS base_name, b.location AS base_location
       FROM tanks t
       LEFT JOIN bases b ON b.id = t.base_id
       WHERE t.id = $1 AND t.company_id = $2 AND t.is_active = true`,
      [req.params.id, req.user.company_id]
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'Tank not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// POST /api/tanks — create tank (admin+)
router.post('/', requireRole(['admin', 'superadmin']), async (req, res, next) => {
  try {
    const {
      name, code, tank_type, fuel_type, base_id,
      capacity_liters, current_liters = 0, min_threshold_liters, instructions,
    } = req.body;

    if (!name || !code || !tank_type || !fuel_type || !capacity_liters) {
      return res.status(400).json({ error: 'name, code, tank_type, fuel_type, and capacity_liters are required' });
    }
    if (!VALID_FUEL_TYPES.includes(fuel_type)) {
      return res.status(400).json({ error: `fuel_type must be one of: ${VALID_FUEL_TYPES.join(', ')}` });
    }
    if (!['fixed', 'mobile'].includes(tank_type)) {
      return res.status(400).json({ error: 'tank_type must be fixed or mobile' });
    }
    if (parseFloat(capacity_liters) <= 0) {
      return res.status(400).json({ error: 'capacity_liters must be greater than 0' });
    }
    if (parseFloat(current_liters) > parseFloat(capacity_liters)) {
      return res.status(400).json({ error: 'current_liters cannot exceed capacity_liters' });
    }

    const color_code = FUEL_TYPE_COLORS[fuel_type];

    // Validate base belongs to company if provided
    if (base_id) {
      const baseCheck = await pool.query(
        'SELECT id FROM bases WHERE id = $1 AND company_id = $2 AND is_active = true',
        [base_id, req.user.company_id]
      );
      if (!baseCheck.rows.length) {
        return res.status(400).json({ error: 'Base not found or does not belong to your company' });
      }
    }

    const { rows } = await pool.query(
      `INSERT INTO tanks (company_id, base_id, name, code, tank_type, fuel_type, color_code,
        capacity_liters, current_liters, min_threshold_liters, instructions)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        req.user.company_id,
        base_id || null,
        name,
        code,
        tank_type,
        fuel_type,
        color_code,
        capacity_liters,
        current_liters,
        min_threshold_liters || null,
        instructions || null,
      ]
    );
    logAudit({ company_id: req.user.company_id, user_id: req.user.id, action: 'tank.create', entity_type: 'tank', entity_id: rows[0].id, metadata: { name, code, fuel_type }, ip: req.ip });
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// PUT /api/tanks/:id — update tank (admin+). Cannot change fuel_type.
router.put('/:id', requireRole(['admin', 'superadmin']), async (req, res, next) => {
  try {
    const { id } = req.params;

    // Fetch existing tank
    const existing = await pool.query(
      'SELECT * FROM tanks WHERE id = $1 AND company_id = $2 AND is_active = true',
      [id, req.user.company_id]
    );
    if (!existing.rows.length) {
      return res.status(404).json({ error: 'Tank not found' });
    }
    const tank = existing.rows[0];

    const {
      name = tank.name,
      code = tank.code,
      tank_type = tank.tank_type,
      base_id = tank.base_id,
      capacity_liters = tank.capacity_liters,
      min_threshold_liters = tank.min_threshold_liters,
      instructions = tank.instructions,
    } = req.body;

    if (!['fixed', 'mobile'].includes(tank_type)) {
      return res.status(400).json({ error: 'tank_type must be fixed or mobile' });
    }
    if (parseFloat(capacity_liters) <= 0) {
      return res.status(400).json({ error: 'capacity_liters must be greater than 0' });
    }
    if (parseFloat(tank.current_liters) > parseFloat(capacity_liters)) {
      return res.status(400).json({ error: 'capacity_liters cannot be less than current_liters' });
    }

    if (base_id && base_id !== tank.base_id) {
      const baseCheck = await pool.query(
        'SELECT id FROM bases WHERE id = $1 AND company_id = $2 AND is_active = true',
        [base_id, req.user.company_id]
      );
      if (!baseCheck.rows.length) {
        return res.status(400).json({ error: 'Base not found or does not belong to your company' });
      }
    }

    const { rows } = await pool.query(
      `UPDATE tanks
       SET name = $1, code = $2, tank_type = $3, base_id = $4,
           capacity_liters = $5, min_threshold_liters = $6, instructions = $7,
           updated_at = NOW()
       WHERE id = $8 AND company_id = $9
       RETURNING *`,
      [name, code, tank_type, base_id || null, capacity_liters, min_threshold_liters || null, instructions || null, id, req.user.company_id]
    );
    logAudit({ company_id: req.user.company_id, user_id: req.user.id, action: 'tank.update', entity_type: 'tank', entity_id: id, metadata: { name, code }, ip: req.ip });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/tanks/:id — soft delete (admin+)
router.delete('/:id', requireRole(['admin', 'superadmin']), async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `UPDATE tanks SET is_active = false, updated_at = NOW()
       WHERE id = $1 AND company_id = $2 AND is_active = true
       RETURNING id`,
      [req.params.id, req.user.company_id]
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'Tank not found' });
    }
    logAudit({ company_id: req.user.company_id, user_id: req.user.id, action: 'tank.delete', entity_type: 'tank', entity_id: req.params.id, ip: req.ip });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/tanks/:id/assign-base — assign/move mobile tank to a base (admin+)
router.patch('/:id/assign-base', requireRole(['admin', 'superadmin']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { base_id, campaign_start, campaign_end } = req.body;

    if (base_id) {
      const baseCheck = await pool.query(
        'SELECT id FROM bases WHERE id = $1 AND company_id = $2 AND is_active = true',
        [base_id, req.user.company_id]
      );
      if (!baseCheck.rows.length) {
        return res.status(400).json({ error: 'Base not found or does not belong to your company' });
      }
    }

    const { rows } = await pool.query(
      `UPDATE tanks
       SET base_id = $1, updated_at = NOW()
       WHERE id = $2 AND company_id = $3 AND is_active = true AND tank_type = 'mobile'
       RETURNING *`,
      [base_id || null, id, req.user.company_id]
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'Mobile tank not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// GET /api/tanks/:id/history — all fueling_operations + tank_loads for this tank
router.get('/:id/history', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verify tank belongs to company
    const tankCheck = await pool.query(
      'SELECT id FROM tanks WHERE id = $1 AND company_id = $2',
      [id, req.user.company_id]
    );
    if (!tankCheck.rows.length) {
      return res.status(404).json({ error: 'Tank not found' });
    }

    const [opsResult, loadsResult] = await Promise.all([
      pool.query(
        `SELECT fo.*,
                u.first_name AS operator_first_name, u.last_name AS operator_last_name,
                da.registration AS dest_aircraft_reg,
                dv.plate AS dest_vehicle_plate, dv.name AS dest_vehicle_name,
                dt.name AS dest_tank_name
         FROM fueling_operations fo
         LEFT JOIN users u ON u.id = fo.operator_id
         LEFT JOIN aircraft da ON da.id = fo.dest_aircraft_id
         LEFT JOIN ground_vehicles dv ON dv.id = fo.dest_vehicle_id
         LEFT JOIN tanks dt ON dt.id = fo.dest_tank_id
         WHERE fo.company_id = $1 AND (fo.source_tank_id = $2 OR fo.dest_tank_id = $2)
         ORDER BY fo.operation_date DESC
         LIMIT 50`,
        [req.user.company_id, id]
      ),
      pool.query(
        `SELECT tl.*, u.first_name AS operator_first_name, u.last_name AS operator_last_name
         FROM tank_loads tl
         LEFT JOIN users u ON u.id = tl.operator_id
         WHERE tl.company_id = $1 AND tl.tank_id = $2
         ORDER BY tl.load_date DESC
         LIMIT 50`,
        [req.user.company_id, id]
      ),
    ]);

    res.json({ operations: opsResult.rows, loads: loadsResult.rows });
  } catch (err) {
    next(err);
  }
});

export default router;
