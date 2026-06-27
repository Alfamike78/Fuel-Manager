import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { pool } from '../config/db.js';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { checkTankThresholdAndNotify } from '../utils/tankAlerts.js';
import { logAudit } from '../utils/auditLog.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OPS_DIR = path.join(__dirname, '..', 'uploads', 'operations');
if (!fs.existsSync(OPS_DIR)) fs.mkdirSync(OPS_DIR, { recursive: true });

const opsUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, OPS_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) return cb(null, true);
    cb(new Error('Solo immagini consentite'));
  },
});

const router = express.Router();

router.use(verifyToken);

// GET /api/fueling-operations/stats — today's summary for dashboard
router.get('/stats', async (req, res, next) => {
  try {
    const cid = req.user.company_id;
    const [opsToday, litersToday, tanks, aircraft, vehicles] = await Promise.all([
      pool.query(
        `SELECT COUNT(*) FROM fueling_operations
         WHERE company_id = $1 AND operation_date >= CURRENT_DATE`,
        [cid]
      ),
      pool.query(
        `SELECT COALESCE(SUM(liters), 0) AS total
         FROM fueling_operations
         WHERE company_id = $1 AND operation_date >= CURRENT_DATE`,
        [cid]
      ),
      pool.query('SELECT COUNT(*) FROM tanks WHERE company_id = $1 AND is_active = true', [cid]),
      pool.query('SELECT COUNT(*) FROM aircraft WHERE company_id = $1 AND is_active = true', [cid]),
      pool.query('SELECT COUNT(*) FROM ground_vehicles WHERE company_id = $1 AND is_active = true', [cid]),
    ]);
    res.json({
      operations_today: parseInt(opsToday.rows[0].count),
      liters_today: parseFloat(litersToday.rows[0].total),
      tanks_count: parseInt(tanks.rows[0].count),
      aircraft_count: parseInt(aircraft.rows[0].count),
      vehicles_count: parseInt(vehicles.rows[0].count),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/fueling-operations — list with filters
router.get('/', async (req, res, next) => {
  try {
    const cid = req.user.company_id;
    const { date_from, date_to, dest_type, source_type, limit = 100, offset = 0 } = req.query;

    const conditions = ['fo.company_id = $1'];
    const params = [cid];
    let p = 2;

    if (date_from) { conditions.push(`fo.operation_date >= $${p++}`); params.push(date_from); }
    if (date_to)   { conditions.push(`fo.operation_date <= $${p++}`); params.push(date_to + ' 23:59:59'); }
    if (dest_type) { conditions.push(`fo.dest_type = $${p++}`); params.push(dest_type); }
    if (source_type) { conditions.push(`fo.source_type = $${p++}`); params.push(source_type); }

    const where = conditions.join(' AND ');

    const [rows, countResult] = await Promise.all([
      pool.query(
        `SELECT fo.*,
                u.first_name AS operator_first_name, u.last_name AS operator_last_name,
                st.name AS source_tank_name, st.code AS source_tank_code,
                da.registration AS dest_aircraft_reg, da.model AS dest_aircraft_model,
                dv.plate AS dest_vehicle_plate, dv.name AS dest_vehicle_name,
                dt.name AS dest_tank_name, dt.code AS dest_tank_code
         FROM fueling_operations fo
         LEFT JOIN users u ON u.id = fo.operator_id
         LEFT JOIN tanks st ON st.id = fo.source_tank_id
         LEFT JOIN aircraft da ON da.id = fo.dest_aircraft_id
         LEFT JOIN ground_vehicles dv ON dv.id = fo.dest_vehicle_id
         LEFT JOIN tanks dt ON dt.id = fo.dest_tank_id
         WHERE ${where}
         ORDER BY fo.operation_date DESC
         LIMIT $${p++} OFFSET $${p++}`,
        [...params, parseInt(limit), parseInt(offset)]
      ),
      pool.query(`SELECT COUNT(*) FROM fueling_operations fo WHERE ${where}`, params),
    ]);

    res.json({ data: rows.rows, total: parseInt(countResult.rows[0].count) });
  } catch (err) {
    next(err);
  }
});

// GET /api/fueling-operations/:id
router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT fo.*,
              u.first_name AS operator_first_name, u.last_name AS operator_last_name,
              st.name AS source_tank_name, st.code AS source_tank_code,
              da.registration AS dest_aircraft_reg, da.model AS dest_aircraft_model,
              dv.plate AS dest_vehicle_plate, dv.name AS dest_vehicle_name,
              dt.name AS dest_tank_name, dt.code AS dest_tank_code
       FROM fueling_operations fo
       LEFT JOIN users u ON u.id = fo.operator_id
       LEFT JOIN tanks st ON st.id = fo.source_tank_id
       LEFT JOIN aircraft da ON da.id = fo.dest_aircraft_id
       LEFT JOIN ground_vehicles dv ON dv.id = fo.dest_vehicle_id
       LEFT JOIN tanks dt ON dt.id = fo.dest_tank_id
       WHERE fo.id = $1 AND fo.company_id = $2`,
      [req.params.id, req.user.company_id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Operation not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// POST /api/fueling-operations — create with transactional side-effects
router.post('/', async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const {
      operation_date,
      source_type,
      source_tank_id,
      external_source_name,
      dest_type,
      dest_aircraft_id,
      dest_vehicle_id,
      dest_tank_id,
      liters,
      meter_reading_before,
      meter_reading_after,
      flight_hours_at_fueling,
      km_at_fueling,
      notes,
    } = req.body;

    const cid = req.user.company_id;

    // --- Validation ---
    if (!operation_date || !source_type || !dest_type || !liters) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'operation_date, source_type, dest_type, and liters are required' });
    }
    if (!['tank', 'external'].includes(source_type)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'source_type must be tank or external' });
    }
    if (!['aircraft', 'ground_vehicle', 'tank'].includes(dest_type)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'dest_type must be aircraft, ground_vehicle, or tank' });
    }
    if (parseFloat(liters) <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'liters must be greater than 0' });
    }

    let fuel_type = null;

    // --- Resolve source ---
    let sourceTank = null;
    if (source_type === 'tank') {
      if (!source_tank_id) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'source_tank_id is required when source_type is tank' });
      }
      const { rows: tankRows } = await client.query(
        'SELECT * FROM tanks WHERE id = $1 AND company_id = $2 AND is_active = true',
        [source_tank_id, cid]
      );
      if (!tankRows.length) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Source tank not found' });
      }
      sourceTank = tankRows[0];
      fuel_type = sourceTank.fuel_type;

      if (parseFloat(sourceTank.current_liters) < parseFloat(liters)) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: `Insufficient fuel: tank has ${sourceTank.current_liters} L, operation requires ${liters} L`,
        });
      }
    } else {
      if (!external_source_name || !external_source_name.trim()) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'external_source_name is required when source_type is external' });
      }
    }

    // --- Resolve destination & determine/validate fuel_type ---
    if (dest_type === 'aircraft') {
      if (!dest_aircraft_id) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'dest_aircraft_id is required when dest_type is aircraft' });
      }
      const { rows } = await client.query(
        'SELECT * FROM aircraft WHERE id = $1 AND company_id = $2 AND is_active = true',
        [dest_aircraft_id, cid]
      );
      if (!rows.length) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Destination aircraft not found' });
      }
      const ac = rows[0];
      if (fuel_type && fuel_type !== ac.fuel_type) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: `Fuel type mismatch: tank has ${fuel_type}, aircraft requires ${ac.fuel_type}`,
        });
      }
      fuel_type = fuel_type || ac.fuel_type;

    } else if (dest_type === 'ground_vehicle') {
      if (!dest_vehicle_id) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'dest_vehicle_id is required when dest_type is ground_vehicle' });
      }
      const { rows } = await client.query(
        'SELECT * FROM ground_vehicles WHERE id = $1 AND company_id = $2 AND is_active = true',
        [dest_vehicle_id, cid]
      );
      if (!rows.length) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Destination vehicle not found' });
      }
      const v = rows[0];
      if (fuel_type && fuel_type !== v.fuel_type) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: `Fuel type mismatch: tank has ${fuel_type}, vehicle requires ${v.fuel_type}`,
        });
      }
      fuel_type = fuel_type || v.fuel_type;

    } else if (dest_type === 'tank') {
      if (!dest_tank_id) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'dest_tank_id is required when dest_type is tank' });
      }
      if (dest_tank_id === source_tank_id) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Source and destination tank cannot be the same' });
      }
      const { rows } = await client.query(
        'SELECT * FROM tanks WHERE id = $1 AND company_id = $2 AND is_active = true',
        [dest_tank_id, cid]
      );
      if (!rows.length) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Destination tank not found' });
      }
      const dt = rows[0];
      if (fuel_type && fuel_type !== dt.fuel_type) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: `Fuel type mismatch: source has ${fuel_type}, destination tank has ${dt.fuel_type}`,
        });
      }
      fuel_type = fuel_type || dt.fuel_type;
      // Check capacity
      if (parseFloat(dt.current_liters) + parseFloat(liters) > parseFloat(dt.capacity_liters)) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: `Destination tank capacity exceeded: available space is ${parseFloat(dt.capacity_liters) - parseFloat(dt.current_liters)} L`,
        });
      }
    }

    if (!fuel_type) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Could not determine fuel_type' });
    }

    // --- Insert operation ---
    const { rows: opRows } = await client.query(
      `INSERT INTO fueling_operations (
         company_id, operation_date, operator_id,
         source_type, source_tank_id, external_source_name,
         dest_type, dest_aircraft_id, dest_vehicle_id, dest_tank_id,
         fuel_type, liters,
         meter_reading_before, meter_reading_after,
         flight_hours_at_fueling, km_at_fueling, notes
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
       RETURNING *`,
      [
        cid,
        operation_date,
        req.user.id,
        source_type,
        source_tank_id || null,
        source_type === 'external' ? (external_source_name || '').trim() : null,
        dest_type,
        dest_aircraft_id || null,
        dest_vehicle_id || null,
        dest_tank_id || null,
        fuel_type,
        parseFloat(liters),
        meter_reading_before != null ? parseFloat(meter_reading_before) : null,
        meter_reading_after  != null ? parseFloat(meter_reading_after)  : null,
        flight_hours_at_fueling != null ? parseFloat(flight_hours_at_fueling) : null,
        km_at_fueling != null ? parseFloat(km_at_fueling) : null,
        notes?.trim() || null,
      ]
    );
    const operation = opRows[0];

    // --- Side-effects ---
    // Deduct from source tank
    if (source_type === 'tank' && source_tank_id) {
      await client.query(
        `UPDATE tanks SET current_liters = current_liters - $1, updated_at = NOW()
         WHERE id = $2`,
        [parseFloat(liters), source_tank_id]
      );
    }

    // Add to destination tank
    if (dest_type === 'tank' && dest_tank_id) {
      await client.query(
        `UPDATE tanks SET current_liters = current_liters + $1, updated_at = NOW()
         WHERE id = $2`,
        [parseFloat(liters), dest_tank_id]
      );
    }

    // Update aircraft total hours (current reading at fueling time)
    if (dest_type === 'aircraft' && dest_aircraft_id && flight_hours_at_fueling != null) {
      await client.query(
        `UPDATE aircraft SET total_flight_hours = $1 WHERE id = $2 AND $1 > total_flight_hours`,
        [parseFloat(flight_hours_at_fueling), dest_aircraft_id]
      );
    }

    // Update vehicle odometer (current km at fueling time)
    if (dest_type === 'ground_vehicle' && dest_vehicle_id && km_at_fueling != null) {
      await client.query(
        `UPDATE ground_vehicles SET total_km = $1 WHERE id = $2 AND $1 > total_km`,
        [parseFloat(km_at_fueling), dest_vehicle_id]
      );
    }

    await client.query('COMMIT');

    // Audit log
    logAudit({
      company_id: cid,
      user_id: req.user.id,
      action: 'fueling_operation.create',
      entity_type: 'fueling_operation',
      entity_id: operation.id,
      metadata: { liters: parseFloat(liters), fuel_type, dest_type, source_type },
      ip: req.ip,
    });

    // Post-commit: check tank threshold and fire alert if needed (non-blocking)
    if (source_type === 'tank' && source_tank_id && sourceTank) {
      const levelBefore = parseFloat(sourceTank.current_liters);
      const levelAfter = levelBefore - parseFloat(liters);
      checkTankThresholdAndNotify(cid, source_tank_id, levelBefore, levelAfter);
    }

    // Return full record with joined fields
    const { rows: full } = await pool.query(
      `SELECT fo.*,
              u.first_name AS operator_first_name, u.last_name AS operator_last_name,
              st.name AS source_tank_name,
              da.registration AS dest_aircraft_reg,
              dv.plate AS dest_vehicle_plate, dv.name AS dest_vehicle_name,
              dt.name AS dest_tank_name
       FROM fueling_operations fo
       LEFT JOIN users u ON u.id = fo.operator_id
       LEFT JOIN tanks st ON st.id = fo.source_tank_id
       LEFT JOIN aircraft da ON da.id = fo.dest_aircraft_id
       LEFT JOIN ground_vehicles dv ON dv.id = fo.dest_vehicle_id
       LEFT JOIN tanks dt ON dt.id = fo.dest_tank_id
       WHERE fo.id = $1`,
      [operation.id]
    );

    res.status(201).json(full[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// POST /api/fueling-operations/:id/attachments — upload meter photo and/or signature
router.post(
  '/:id/attachments',
  opsUpload.fields([
    { name: 'meter_photo', maxCount: 1 },
    { name: 'signature', maxCount: 1 },
  ]),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const cid = req.user.company_id;

      const { rows } = await pool.query(
        'SELECT id, meter_photo_url, signature_url FROM fueling_operations WHERE id = $1 AND company_id = $2',
        [id, cid]
      );
      if (!rows.length) return res.status(404).json({ error: 'Operation not found' });

      const op = rows[0];
      const updates = {};

      if (req.files?.meter_photo?.[0]) {
        if (op.meter_photo_url?.startsWith('/uploads/')) {
          const old = path.join(__dirname, '..', op.meter_photo_url);
          if (fs.existsSync(old)) fs.unlinkSync(old);
        }
        updates.meter_photo_url = `/uploads/operations/${req.files.meter_photo[0].filename}`;
      }

      if (req.files?.signature?.[0]) {
        if (op.signature_url?.startsWith('/uploads/')) {
          const old = path.join(__dirname, '..', op.signature_url);
          if (fs.existsSync(old)) fs.unlinkSync(old);
        }
        updates.signature_url = `/uploads/operations/${req.files.signature[0].filename}`;
      }

      if (!Object.keys(updates).length) {
        return res.status(400).json({ error: 'Nessun file inviato' });
      }

      const fields = Object.keys(updates).map((k, i) => `${k} = $${i + 1}`).join(', ');
      const values = [...Object.values(updates), id];

      const { rows: updated } = await pool.query(
        `UPDATE fueling_operations SET ${fields} WHERE id = $${values.length} RETURNING meter_photo_url, signature_url`,
        values
      );

      res.json(updated[0]);
    } catch (err) {
      if (err.message?.includes('Solo immagini')) return res.status(400).json({ error: err.message });
      next(err);
    }
  }
);

// DELETE /api/fueling-operations/:id — admin only, reverses tank changes
router.delete('/:id', requireRole(['admin', 'superadmin']), async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      'SELECT * FROM fueling_operations WHERE id = $1 AND company_id = $2',
      [req.params.id, req.user.company_id]
    );
    if (!rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Operation not found' });
    }
    const op = rows[0];

    // Reverse tank deduction
    if (op.source_type === 'tank' && op.source_tank_id) {
      await client.query(
        `UPDATE tanks SET current_liters = LEAST(current_liters + $1, capacity_liters), updated_at = NOW()
         WHERE id = $2`,
        [parseFloat(op.liters), op.source_tank_id]
      );
    }

    // Reverse tank addition
    if (op.dest_type === 'tank' && op.dest_tank_id) {
      await client.query(
        `UPDATE tanks SET current_liters = GREATEST(current_liters - $1, 0), updated_at = NOW()
         WHERE id = $2`,
        [parseFloat(op.liters), op.dest_tank_id]
      );
    }

    await client.query('DELETE FROM fueling_operations WHERE id = $1', [op.id]);
    await client.query('COMMIT');

    logAudit({
      company_id: req.user.company_id,
      user_id: req.user.id,
      action: 'fueling_operation.delete',
      entity_type: 'fueling_operation',
      entity_id: op.id,
      metadata: { liters: parseFloat(op.liters), fuel_type: op.fuel_type },
      ip: req.ip,
    });

    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

export default router;
