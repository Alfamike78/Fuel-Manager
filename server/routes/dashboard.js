import express from 'express';
import { pool } from '../config/db.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();
router.use(verifyToken);

// GET /api/dashboard/charts
// Returns all data needed for dashboard charts in a single request
router.get('/charts', async (req, res, next) => {
  try {
    const cid = req.user.company_id;

    const [dailyResult, fuelTypeResult, topAircraftResult, recentOpsResult] = await Promise.all([
      // Consumi giornalieri ultimi 30 giorni
      pool.query(
        `SELECT
           TO_CHAR(DATE(operation_date), 'DD/MM') AS day,
           DATE(operation_date) AS raw_day,
           ROUND(SUM(liters)::numeric, 1) AS liters
         FROM fueling_operations
         WHERE company_id = $1
           AND operation_date >= NOW() - INTERVAL '30 days'
         GROUP BY DATE(operation_date)
         ORDER BY raw_day ASC`,
        [cid]
      ),

      // Distribuzione per tipo carburante (ultimi 30 giorni)
      pool.query(
        `SELECT
           fuel_type,
           ROUND(SUM(liters)::numeric, 1) AS liters,
           COUNT(*) AS ops
         FROM fueling_operations
         WHERE company_id = $1
           AND operation_date >= NOW() - INTERVAL '30 days'
           AND fuel_type IS NOT NULL
         GROUP BY fuel_type
         ORDER BY liters DESC`,
        [cid]
      ),

      // Top 5 aeromobili per consumo (ultimi 30 giorni)
      pool.query(
        `SELECT
           a.registration,
           a.model,
           ROUND(SUM(fo.liters)::numeric, 1) AS liters,
           COUNT(*) AS ops
         FROM fueling_operations fo
         JOIN aircraft a ON a.id = fo.dest_aircraft_id
         WHERE fo.company_id = $1
           AND fo.dest_type = 'aircraft'
           AND fo.operation_date >= NOW() - INTERVAL '30 days'
         GROUP BY a.registration, a.model
         ORDER BY liters DESC
         LIMIT 5`,
        [cid]
      ),

      // Ultime 8 operazioni
      pool.query(
        `SELECT
           fo.id,
           fo.operation_date,
           fo.liters,
           fo.fuel_type,
           fo.dest_type,
           a.registration  AS dest_aircraft_reg,
           gv.plate        AS dest_vehicle_plate,
           gv.name         AS dest_vehicle_name,
           dt.name         AS dest_tank_name,
           u.first_name    AS operator_first_name,
           u.last_name     AS operator_last_name
         FROM fueling_operations fo
         LEFT JOIN aircraft        a  ON a.id  = fo.dest_aircraft_id
         LEFT JOIN ground_vehicles gv ON gv.id = fo.dest_vehicle_id
         LEFT JOIN tanks           dt ON dt.id = fo.dest_tank_id
         LEFT JOIN users           u  ON u.id  = fo.operator_id
         WHERE fo.company_id = $1
         ORDER BY fo.operation_date DESC
         LIMIT 8`,
        [cid]
      ),
    ]);

    res.json({
      daily:       dailyResult.rows,
      byFuelType:  fuelTypeResult.rows,
      topAircraft: topAircraftResult.rows,
      recentOps:   recentOpsResult.rows,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
