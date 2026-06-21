import { pool } from '../config/db.js';

/**
 * Insert an audit log entry (non-blocking, never throws).
 *
 * @param {object} entry
 * @param {string} entry.company_id
 * @param {string} entry.user_id
 * @param {string} entry.action     — e.g. "fueling_operation.create"
 * @param {string} entry.entity_type — e.g. "fueling_operation", "tank", "user"
 * @param {string} [entry.entity_id]
 * @param {object} [entry.metadata] — free-form JSON (e.g. { liters, tank_name })
 * @param {string} [entry.ip]
 */
export function logAudit({ company_id, user_id, action, entity_type, entity_id = null, metadata = null, ip = null }) {
  pool.query(
    `INSERT INTO audit_logs (company_id, user_id, action, entity_type, entity_id, metadata, ip)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [company_id, user_id, action, entity_type, entity_id, metadata ? JSON.stringify(metadata) : null, ip]
  ).catch(() => {});
}
