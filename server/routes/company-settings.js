import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { pool } from '../config/db.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads', 'logos');

// Ensure upload dir exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['.png', '.jpg', '.jpeg', '.svg', '.webp'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Only PNG, JPG, SVG, WEBP files are allowed'));
    }
  },
});

const router = express.Router();

router.use(verifyToken);
router.use(requireRole(['admin', 'superadmin']));

// GET /api/company-settings — get current company settings
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.id, c.name, c.slug, c.logo_url, c.primary_color, c.secondary_color,
              c.status, c.trial_ends_at, c.created_at,
              sp.name AS plan_name, sp.max_tanks, sp.max_vehicles, sp.max_users,
              sp.can_export_pdf, sp.can_export_excel, sp.can_import,
              sp.price_monthly, sp.price_yearly,
              (SELECT COUNT(*) FROM bases WHERE company_id = c.id AND is_active = true) AS bases_count,
              (SELECT COUNT(*) FROM tanks WHERE company_id = c.id AND is_active = true) AS tanks_count,
              (SELECT COUNT(*) FROM users WHERE company_id = c.id AND is_active = true) AS users_count
       FROM companies c
       LEFT JOIN subscription_plans sp ON c.plan_id = sp.id
       WHERE c.id = $1`,
      [req.user.company_id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Company not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// PUT /api/company-settings — update name and brand colors
router.put('/', async (req, res, next) => {
  try {
    const { name, primary_color, secondary_color } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Company name is required' });
    }

    const hexRegex = /^#[0-9A-Fa-f]{6}$/;
    if (primary_color && !hexRegex.test(primary_color)) {
      return res.status(400).json({ error: 'primary_color must be a valid hex color (e.g. #1e40af)' });
    }
    if (secondary_color && !hexRegex.test(secondary_color)) {
      return res.status(400).json({ error: 'secondary_color must be a valid hex color' });
    }

    const { rows } = await pool.query(
      `UPDATE companies
       SET name = $1,
           primary_color = COALESCE($2, primary_color),
           secondary_color = COALESCE($3, secondary_color),
           updated_at = NOW()
       WHERE id = $4
       RETURNING id, name, slug, logo_url, primary_color, secondary_color, status`,
      [name.trim(), primary_color || null, secondary_color || null, req.user.company_id]
    );

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// POST /api/company-settings/logo — upload logo file
router.post('/logo', upload.single('logo'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const logoUrl = `/uploads/logos/${req.file.filename}`;

    // Delete old logo file if it's a local upload
    const { rows: oldRows } = await pool.query(
      'SELECT logo_url FROM companies WHERE id = $1',
      [req.user.company_id]
    );
    if (oldRows.length && oldRows[0].logo_url?.startsWith('/uploads/')) {
      const oldPath = path.join(__dirname, '..', oldRows[0].logo_url);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const { rows } = await pool.query(
      'UPDATE companies SET logo_url = $1, updated_at = NOW() WHERE id = $2 RETURNING logo_url',
      [logoUrl, req.user.company_id]
    );

    res.json({ logo_url: rows[0].logo_url });
  } catch (err) {
    // If multer validation error, send 400
    if (err.message?.includes('Only')) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
});

// DELETE /api/company-settings/logo — remove logo
router.delete('/logo', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT logo_url FROM companies WHERE id = $1',
      [req.user.company_id]
    );
    if (rows.length && rows[0].logo_url?.startsWith('/uploads/')) {
      const oldPath = path.join(__dirname, '..', rows[0].logo_url);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    await pool.query(
      'UPDATE companies SET logo_url = NULL, updated_at = NOW() WHERE id = $1',
      [req.user.company_id]
    );

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
