import express from 'express';
import { pool } from '../config/db.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(verifyToken);
router.use(requireRole(['admin', 'superadmin']));

// GET /api/audit-log — paginated audit log for this company
router.get('/', async (req, res, next) => {
  try {
    const {
      entity_type,
      user_id,
      action,
      date_from,
      date_to,
      limit = 50,
      offset = 0,
    } = req.query;

    const conditions = ['al.company_id = $1'];
    const params = [req.user.company_id];
    let p = 2;

    if (entity_type) { conditions.push(`al.entity_type = $${p++}`); params.push(entity_type); }
    if (user_id)      { conditions.push(`al.user_id = $${p++}`);    params.push(user_id); }
    if (action)       { conditions.push(`al.action ILIKE $${p++}`); params.push(`%${action}%`); }
    if (date_from)    { conditions.push(`al.created_at >= $${p++}`); params.push(date_from); }
    if (date_to)      { conditions.push(`al.created_at <= $${p++}`); params.push(date_to + ' 23:59:59'); }

    const where = conditions.join(' AND ');

    const [rows, countResult] = await Promise.all([
      pool.query(
        `SELECT al.*,
                u.first_name AS user_first_name, u.last_name AS user_last_name,
                u.email AS user_email, u.role AS user_role
         FROM audit_logs al
         LEFT JOIN users u ON u.id = al.user_id
         WHERE ${where}
         ORDER BY al.created_at DESC
         LIMIT $${p++} OFFSET $${p++}`,
        [...params, parseInt(limit), parseInt(offset)]
      ),
      pool.query(`SELECT COUNT(*) FROM audit_logs al WHERE ${where}`, params),
    ]);

    res.json({
      data: rows.rows,
      total: parseInt(countResult.rows[0].count),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/audit-log/entity-types — distinct entity types for filter UI
router.get('/entity-types', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT DISTINCT entity_type FROM audit_logs WHERE company_id = $1 AND entity_type IS NOT NULL ORDER BY entity_type`,
      [req.user.company_id]
    );
    res.json(rows.map((r) => r.entity_type));
  } catch (err) {
    next(err);
  }
});

export default router;
