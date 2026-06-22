import express from 'express';
import pool from '../config/db.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication and superadmin role
router.use(verifyToken);
router.use(requireRole(['superadmin']));

// GET /api/companies — list all companies
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let conditions = [];
    let params = [];
    let paramIndex = 1;

    if (status) {
      conditions.push(`c.status = $${paramIndex++}`);
      params.push(status);
    }

    if (search) {
      conditions.push(`(c.name ILIKE $${paramIndex} OR c.slug ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM companies c ${whereClause}`,
      params
    );

    params.push(parseInt(limit), offset);

    const result = await pool.query(
      `SELECT c.*,
              sp.name as plan_name,
              COUNT(DISTINCT u.id) as user_count
       FROM companies c
       LEFT JOIN subscription_plans sp ON c.plan_id = sp.id
       LEFT JOIN users u ON u.company_id = c.id
       ${whereClause}
       GROUP BY c.id, sp.name
       ORDER BY c.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      params
    );

    res.json({
      companies: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/companies/:id — company detail
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT c.*,
              sp.name as plan_name,
              sp.max_tanks,
              sp.max_vehicles,
              sp.max_users,
              sp.can_export_pdf,
              sp.can_export_excel,
              sp.can_import,
              COUNT(DISTINCT u.id) as user_count
       FROM companies c
       LEFT JOIN subscription_plans sp ON c.plan_id = sp.id
       LEFT JOIN users u ON u.company_id = c.id
       WHERE c.id = $1
       GROUP BY c.id, sp.name, sp.max_tanks, sp.max_vehicles, sp.max_users,
                sp.can_export_pdf, sp.can_export_excel, sp.can_import`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/companies/:id/plan — change subscription plan
router.patch('/:id/plan', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { plan_id } = req.body;

    if (!plan_id) {
      return res.status(400).json({ error: 'plan_id is required' });
    }

    // Verify plan exists
    const planCheck = await pool.query('SELECT id FROM subscription_plans WHERE id = $1', [plan_id]);
    if (planCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Subscription plan not found' });
    }

    const result = await pool.query(
      'UPDATE companies SET plan_id = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [plan_id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/companies/:id/status — change company status
router.patch('/:id/status', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['trial', 'active', 'suspended', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        error: 'Invalid status',
        valid: validStatuses,
      });
    }

    const result = await pool.query(
      'UPDATE companies SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

export default router;
