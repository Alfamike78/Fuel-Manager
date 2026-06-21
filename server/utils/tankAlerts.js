import { pool } from '../config/db.js';

/**
 * After a fueling operation deducts from a source tank, check if the tank
 * has crossed below its minimum threshold and create a notification if so.
 * Avoids duplicates: skips if an unread alert for this tank already exists.
 *
 * @param {object} client  - pg transaction client (already committed)
 * @param {string} companyId
 * @param {string} tankId
 * @param {number} levelBefore  - liters before the deduction
 * @param {number} levelAfter   - liters after the deduction
 */
export async function checkTankThresholdAndNotify(companyId, tankId, levelBefore, levelAfter) {
  try {
    const { rows: tankRows } = await pool.query(
      'SELECT id, name, code, min_threshold_liters, capacity_liters FROM tanks WHERE id = $1',
      [tankId]
    );
    if (!tankRows.length) return;

    const tank = tankRows[0];
    const threshold = parseFloat(tank.min_threshold_liters);
    if (!threshold || threshold <= 0) return;

    // Only trigger when the level just crossed below the threshold
    if (levelBefore <= threshold) return; // was already below — notification already exists
    if (levelAfter > threshold) return;   // still above — no alert needed

    // Check for an existing unread alert for this tank to avoid spam
    const { rows: existing } = await pool.query(
      `SELECT id FROM notifications
       WHERE company_id = $1 AND reference_id = $2 AND type = 'tank_low' AND is_read = false
       LIMIT 1`,
      [companyId, tankId]
    );
    if (existing.length) return;

    const pct = (levelAfter / parseFloat(tank.capacity_liters)) * 100;
    const severity = pct <= 10 ? 'critical' : 'warning';
    const type = severity === 'critical' ? 'tank_critical' : 'tank_low';

    await pool.query(
      `INSERT INTO notifications (company_id, type, title, message, reference_id, reference_type, severity)
       VALUES ($1, $2, $3, $4, $5, 'tank', $6)`,
      [
        companyId,
        type,
        `Cisterna ${tank.name} (${tank.code}) sotto soglia`,
        `Livello attuale: ${levelAfter.toFixed(0)} L — Soglia: ${threshold.toFixed(0)} L (${pct.toFixed(1)}% capacità)`,
        tankId,
        severity,
      ]
    );
  } catch (_) {
    // Notifications are non-critical; never let a failure here break the main operation
  }
}

/**
 * When a tank is refilled above its threshold, auto-dismiss unread low-tank alerts for it.
 */
export async function dismissTankAlertIfResolved(companyId, tankId, newLevel) {
  try {
    const { rows: tankRows } = await pool.query(
      'SELECT min_threshold_liters FROM tanks WHERE id = $1',
      [tankId]
    );
    if (!tankRows.length) return;

    const threshold = parseFloat(tankRows[0].min_threshold_liters);
    if (!threshold || threshold <= 0) return;
    if (newLevel <= threshold) return; // still low

    await pool.query(
      `UPDATE notifications
       SET is_read = true, read_at = NOW()
       WHERE company_id = $1 AND reference_id = $2 AND type IN ('tank_low','tank_critical') AND is_read = false`,
      [companyId, tankId]
    );
  } catch (_) {}
}
