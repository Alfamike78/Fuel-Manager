import express from 'express';
import pool from '../config/db.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication and superadmin role
router.use(verifyToken);
router.use(requireRole(['superadmin']));

// GET /api/companies/stats — global platform metrics
router.get('/stats', async (_req, res, next) => {
  try {
    const [
      companiesResult,
      usersResult,
      operationsResult,
      litersResult,
      revenueResult,
      plansResult,
    ] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE status = 'active') AS active,
          COUNT(*) FILTER (WHERE status = 'trial') AS trial,
          COUNT(*) FILTER (WHERE status = 'suspended') AS suspended,
          COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled
        FROM companies
      `),
      pool.query('SELECT COUNT(*) AS total FROM users WHERE role != \'superadmin\''),
      pool.query('SELECT COUNT(*) AS total FROM fueling_operations'),
      pool.query('SELECT COALESCE(SUM(liters), 0) AS total FROM fueling_operations'),
      pool.query(`
        SELECT COALESCE(SUM(sp.price_monthly), 0) AS mrr
        FROM companies c
        JOIN subscription_plans sp ON c.plan_id = sp.id
        WHERE c.status = 'active'
      `),
      pool.query(`
        SELECT sp.id, sp.name, sp.price_monthly, COUNT(c.id) AS company_count
        FROM subscription_plans sp
        LEFT JOIN companies c ON c.plan_id = sp.id AND c.status NOT IN ('cancelled')
        GROUP BY sp.id, sp.name, sp.price_monthly
        ORDER BY sp.price_monthly ASC NULLS FIRST
      `),
    ]);

    const c = companiesResult.rows[0];
    res.json({
      companies: {
        total: parseInt(c.total),
        active: parseInt(c.active),
        trial: parseInt(c.trial),
        suspended: parseInt(c.suspended),
        cancelled: parseInt(c.cancelled),
      },
      users_total: parseInt(usersResult.rows[0].total),
      operations_total: parseInt(operationsResult.rows[0].total),
      liters_total: parseFloat(litersResult.rows[0].total),
      mrr: parseFloat(revenueResult.rows[0].mrr),
      plans: plansResult.rows.map((p) => ({
        ...p,
        company_count: parseInt(p.company_count),
        price_monthly: parseFloat(p.price_monthly) || 0,
      })),
    });
  } catch (err) {
    next(err);
  }
});

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

// GET /api/companies/:id/stats — company-level metrics for detail panel
router.get('/:id/stats', async (req, res, next) => {
  try {
    const { id } = req.params;
    const [ops, liters, tanks, users, lastOp] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM fueling_operations WHERE company_id = $1', [id]),
      pool.query('SELECT COALESCE(SUM(liters), 0) AS total FROM fueling_operations WHERE company_id = $1', [id]),
      pool.query('SELECT COUNT(*) FROM tanks WHERE company_id = $1 AND is_active = true', [id]),
      pool.query('SELECT COUNT(*) FROM users WHERE company_id = $1 AND is_active = true', [id]),
      pool.query('SELECT operation_date FROM fueling_operations WHERE company_id = $1 ORDER BY operation_date DESC LIMIT 1', [id]),
    ]);
    res.json({
      operations_total: parseInt(ops.rows[0].count),
      liters_total: parseFloat(liters.rows[0].total),
      tanks_count: parseInt(tanks.rows[0].count),
      users_count: parseInt(users.rows[0].count),
      last_operation_at: lastOp.rows[0]?.operation_date || null,
    });
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
