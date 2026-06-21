import express from 'express';
import { pool } from '../config/db.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(verifyToken);

// GET /api/notifications — list notifications for this company (most recent first)
router.get('/', async (req, res, next) => {
  try {
    const { unread_only = 'false', limit = 50, offset = 0 } = req.query;
    const params = [req.user.company_id];
    let filter = '';
    if (unread_only === 'true') {
      filter = 'AND is_read = false';
    }

    const [rows, countResult] = await Promise.all([
      pool.query(
        `SELECT * FROM notifications
         WHERE company_id = $1 ${filter}
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [req.user.company_id, parseInt(limit), parseInt(offset)]
      ),
      pool.query(
        `SELECT COUNT(*) FROM notifications WHERE company_id = $1 AND is_read = false`,
        [req.user.company_id]
      ),
    ]);

    res.json({
      data: rows.rows,
      unread_count: parseInt(countResult.rows[0].count),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/notifications/unread-count — lightweight count for badge polling
router.get('/unread-count', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT COUNT(*) FROM notifications WHERE company_id = $1 AND is_read = false',
      [req.user.company_id]
    );
    res.json({ count: parseInt(rows[0].count) });
  } catch (err) {
    next(err);
  }
});

// PUT /api/notifications/read-all — mark all as read
router.put('/read-all', async (req, res, next) => {
  try {
    await pool.query(
      `UPDATE notifications SET is_read = true, read_at = NOW()
       WHERE company_id = $1 AND is_read = false`,
      [req.user.company_id]
    );
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// PUT /api/notifications/:id/read — mark single notification as read
router.put('/:id/read', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `UPDATE notifications SET is_read = true, read_at = NOW()
       WHERE id = $1 AND company_id = $2
       RETURNING *`,
      [req.params.id, req.user.company_id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Notification not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/notifications/:id — admin only
router.delete('/:id', requireRole(['admin', 'superadmin']), async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'DELETE FROM notifications WHERE id = $1 AND company_id = $2 RETURNING id',
      [req.params.id, req.user.company_id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Notification not found' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/notifications — delete all read notifications (admin)
router.delete('/', requireRole(['admin', 'superadmin']), async (req, res, next) => {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM notifications WHERE company_id = $1 AND is_read = true',
      [req.user.company_id]
    );
    res.json({ deleted: rowCount });
  } catch (err) {
    next(err);
  }
});

export default router;
