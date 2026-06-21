import express from 'express';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { pool } from '../config/db.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();
router.use(verifyToken);

// ─── helpers ────────────────────────────────────────────────────────────────

function buildFuelingWhere(cid, { date_from, date_to, dest_type, fuel_type, base_id, operator_id }) {
  const conditions = ['fo.company_id = $1'];
  const params = [cid];
  let p = 2;
  if (date_from)    { conditions.push(`fo.operation_date >= $${p++}`); params.push(date_from); }
  if (date_to)      { conditions.push(`fo.operation_date <= $${p++}`); params.push(date_to + ' 23:59:59'); }
  if (dest_type)    { conditions.push(`fo.dest_type = $${p++}`);       params.push(dest_type); }
  if (fuel_type)    { conditions.push(`fo.fuel_type = $${p++}`);       params.push(fuel_type); }
  if (base_id)      { conditions.push(`st.base_id = $${p++}`);         params.push(base_id); }
  if (operator_id)  { conditions.push(`fo.operator_id = $${p++}`);     params.push(operator_id); }
  return { where: conditions.join(' AND '), params, nextP: p };
}

const FUELING_SELECT = `
  SELECT fo.*,
         u.first_name AS operator_first_name, u.last_name AS operator_last_name,
         st.name AS source_tank_name, st.code AS source_tank_code, st.base_id AS source_base_id,
         b.name AS base_name,
         da.registration AS dest_aircraft_reg, da.model AS dest_aircraft_model,
         dv.plate AS dest_vehicle_plate, dv.name AS dest_vehicle_name,
         dt.name AS dest_tank_name, dt.code AS dest_tank_code
  FROM fueling_operations fo
  LEFT JOIN users u ON u.id = fo.operator_id
  LEFT JOIN tanks st ON st.id = fo.source_tank_id
  LEFT JOIN bases b ON b.id = st.base_id
  LEFT JOIN aircraft da ON da.id = fo.dest_aircraft_id
  LEFT JOIN ground_vehicles dv ON dv.id = fo.dest_vehicle_id
  LEFT JOIN tanks dt ON dt.id = fo.dest_tank_id`;

// ─── GET /api/reports/fueling ─────────────────────────────────────────────
router.get('/fueling', async (req, res, next) => {
  try {
    const cid = req.user.company_id;
    const { where, params, nextP } = buildFuelingWhere(cid, req.query);
    const p = nextP;

    const [rows, summary] = await Promise.all([
      pool.query(
        `${FUELING_SELECT} WHERE ${where} ORDER BY fo.operation_date DESC LIMIT $${p} OFFSET $${p + 1}`,
        [...params, parseInt(req.query.limit || 200), parseInt(req.query.offset || 0)]
      ),
      pool.query(
        `SELECT
           COUNT(*) AS total_ops,
           COALESCE(SUM(fo.liters), 0) AS total_liters,
           COUNT(DISTINCT fo.operator_id) AS operators_count,
           json_object_agg(DISTINCT fo.fuel_type, sub.s) FILTER (WHERE fo.fuel_type IS NOT NULL) AS liters_by_fuel
         FROM fueling_operations fo
         LEFT JOIN tanks st ON st.id = fo.source_tank_id
         LEFT JOIN (
           SELECT fuel_type, SUM(liters) AS s FROM fueling_operations WHERE company_id = $1 GROUP BY fuel_type
         ) sub ON sub.fuel_type = fo.fuel_type
         WHERE ${where}`,
        params
      ),
    ]);

    res.json({ data: rows.rows, summary: summary.rows[0] });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/reports/tanks ───────────────────────────────────────────────
router.get('/tanks', async (req, res, next) => {
  try {
    const cid = req.user.company_id;
    const { rows } = await pool.query(
      `SELECT t.*,
              b.name AS base_name,
              COALESCE(tl.loads_count, 0) AS loads_count,
              COALESCE(tl.total_loaded, 0) AS total_loaded,
              COALESCE(fo_out.ops_count, 0) AS ops_count,
              COALESCE(fo_out.total_dispensed, 0) AS total_dispensed
       FROM tanks t
       LEFT JOIN bases b ON b.id = t.base_id
       LEFT JOIN (
         SELECT source_tank_id AS tid, COUNT(*) AS loads_count, SUM(volume_liters) AS total_loaded
         FROM tank_loads WHERE company_id = $1 GROUP BY source_tank_id
       ) tl ON tl.tid = t.id
       LEFT JOIN (
         SELECT source_tank_id AS tid, COUNT(*) AS ops_count, SUM(liters) AS total_dispensed
         FROM fueling_operations WHERE company_id = $1 AND source_type = 'tank' GROUP BY source_tank_id
       ) fo_out ON fo_out.tid = t.id
       WHERE t.company_id = $1 AND t.is_active = true
       ORDER BY t.fuel_type, t.name`,
      [cid]
    );
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/reports/quality-checks ─────────────────────────────────────
router.get('/quality-checks', async (req, res, next) => {
  try {
    const cid = req.user.company_id;
    const { date_from, date_to } = req.query;
    const params = [cid];
    const conds = ['qc.company_id = $1'];
    let p = 2;
    if (date_from) { conds.push(`qc.check_date >= $${p++}`); params.push(date_from); }
    if (date_to)   { conds.push(`qc.check_date <= $${p++}`); params.push(date_to + ' 23:59:59'); }
    const where = conds.join(' AND ');

    const [rows, summary] = await Promise.all([
      pool.query(
        `SELECT qc.*,
                u.first_name AS operator_first_name, u.last_name AS operator_last_name,
                t.name AS tank_name, t.code AS tank_code,
                a.registration AS aircraft_registration
         FROM quality_checks qc
         LEFT JOIN users u ON u.id = qc.operator_id
         LEFT JOIN tanks t ON t.id = qc.tank_id
         LEFT JOIN aircraft a ON a.id = qc.aircraft_id
         WHERE ${where}
         ORDER BY qc.check_date DESC`,
        params
      ),
      pool.query(
        `SELECT COUNT(*) AS total,
                SUM(CASE WHEN is_compliant THEN 1 ELSE 0 END) AS compliant,
                SUM(CASE WHEN NOT is_compliant THEN 1 ELSE 0 END) AS non_compliant,
                COALESCE(SUM(liters_drained), 0) AS total_drained
         FROM quality_checks qc WHERE ${where}`,
        params
      ),
    ]);

    res.json({ data: rows.rows, summary: summary.rows[0] });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/reports/operators ──────────────────────────────────────────
router.get('/operators', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, first_name, last_name FROM users WHERE company_id = $1 AND is_active = true ORDER BY first_name`,
      [req.user.company_id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/reports/export/excel ───────────────────────────────────────
router.get('/export/excel', async (req, res, next) => {
  try {
    const cid = req.user.company_id;
    const { type = 'fueling', date_from, date_to, dest_type, fuel_type } = req.query;

    // Get company name
    const { rows: compRows } = await pool.query('SELECT name FROM companies WHERE id = $1', [cid]);
    const companyName = compRows[0]?.name || 'Fuel Manager';

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Fuel Manager — PilotCraft Solutions';
    workbook.created = new Date();

    const headerStyle = {
      font: { bold: true, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: {
        bottom: { style: 'thin', color: { argb: 'FFBFDBFE' } },
      },
    };
    const altRow = { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F9FF' } } };

    if (type === 'fueling' || type === 'all') {
      const { where, params, nextP } = buildFuelingWhere(cid, req.query);
      const { rows } = await pool.query(
        `${FUELING_SELECT} WHERE ${where} ORDER BY fo.operation_date DESC LIMIT 5000`,
        params
      );

      const sheet = workbook.addWorksheet('Operazioni Rifornimento');
      sheet.mergeCells('A1:I1');
      const titleCell = sheet.getCell('A1');
      titleCell.value = `${companyName} — Operazioni di Rifornimento`;
      if (date_from || date_to) {
        titleCell.value += ` (${date_from || '…'} → ${date_to || '…'})`;
      }
      titleCell.font = { bold: true, size: 13 };
      titleCell.alignment = { horizontal: 'center' };
      sheet.getRow(1).height = 24;

      const headers = ['Data/Ora', 'Sorgente', 'Destinazione', 'Tipo', 'Carburante', 'Litri', 'Operatore', 'Contatore', 'Note'];
      const colRow = sheet.addRow(headers);
      colRow.eachCell((cell) => Object.assign(cell, headerStyle));
      sheet.getRow(2).height = 18;

      rows.forEach((op, i) => {
        const dest = op.dest_type === 'aircraft' ? op.dest_aircraft_reg
          : op.dest_type === 'ground_vehicle' ? `${op.dest_vehicle_plate || ''} ${op.dest_vehicle_name || ''}`.trim()
          : op.dest_tank_name || '';
        const row = sheet.addRow([
          new Date(op.operation_date).toLocaleString('it-IT'),
          op.source_type === 'tank' ? (op.source_tank_name || '') : (op.external_source_name || ''),
          dest,
          op.dest_type,
          (op.fuel_type || '').toUpperCase().replace('_', ' '),
          parseFloat(op.liters),
          `${op.operator_first_name || ''} ${op.operator_last_name || ''}`.trim(),
          op.meter_reading_after != null ? parseFloat(op.meter_reading_after) : '',
          op.notes || '',
        ]);
        if (i % 2 === 1) row.eachCell((cell) => Object.assign(cell, altRow));
      });

      // Summary row
      sheet.addRow([]);
      const totRow = sheet.addRow(['TOTALE LITRI', '', '', '', '', { formula: `SUM(F3:F${rows.length + 2})` }, '', '', '']);
      totRow.getCell(1).font = { bold: true };
      totRow.getCell(6).font = { bold: true };

      sheet.columns = [
        { width: 20 }, { width: 22 }, { width: 22 }, { width: 16 },
        { width: 14 }, { width: 10 }, { width: 22 }, { width: 14 }, { width: 30 },
      ];
    }

    if (type === 'tanks' || type === 'all') {
      const { rows } = await pool.query(
        `SELECT t.*, b.name AS base_name,
                COALESCE(fo_out.total_dispensed, 0) AS total_dispensed
         FROM tanks t
         LEFT JOIN bases b ON b.id = t.base_id
         LEFT JOIN (
           SELECT source_tank_id, SUM(liters) AS total_dispensed
           FROM fueling_operations WHERE company_id = $1 AND source_type = 'tank' GROUP BY source_tank_id
         ) fo_out ON fo_out.source_tank_id = t.id
         WHERE t.company_id = $1 AND t.is_active = true ORDER BY t.fuel_type, t.name`,
        [cid]
      );

      const sheet = workbook.addWorksheet('Inventario Cisterne');
      sheet.mergeCells('A1:G1');
      const titleCell = sheet.getCell('A1');
      titleCell.value = `${companyName} — Inventario Cisterne`;
      titleCell.font = { bold: true, size: 13 };
      titleCell.alignment = { horizontal: 'center' };
      sheet.getRow(1).height = 24;

      const headers = ['Codice', 'Nome', 'Base', 'Carburante', 'Capacità (L)', 'Livello Attuale (L)', 'Erogato Totale (L)'];
      const colRow = sheet.addRow(headers);
      colRow.eachCell((cell) => Object.assign(cell, headerStyle));

      rows.forEach((t, i) => {
        const row = sheet.addRow([
          t.code, t.name, t.base_name || '',
          (t.fuel_type || '').toUpperCase().replace('_', ' '),
          parseFloat(t.capacity_liters),
          parseFloat(t.current_liters),
          parseFloat(t.total_dispensed),
        ]);
        if (i % 2 === 1) row.eachCell((cell) => Object.assign(cell, altRow));
      });

      sheet.columns = [{ width: 12 }, { width: 24 }, { width: 20 }, { width: 14 }, { width: 14 }, { width: 18 }, { width: 18 }];
    }

    if (type === 'qc' || type === 'all') {
      const { date_from, date_to } = req.query;
      const params = [cid];
      const conds = ['qc.company_id = $1'];
      let p = 2;
      if (date_from) { conds.push(`qc.check_date >= $${p++}`); params.push(date_from); }
      if (date_to)   { conds.push(`qc.check_date <= $${p++}`); params.push(date_to + ' 23:59:59'); }

      const { rows } = await pool.query(
        `SELECT qc.*, u.first_name, u.last_name, t.name AS tank_name, a.registration
         FROM quality_checks qc
         LEFT JOIN users u ON u.id = qc.operator_id
         LEFT JOIN tanks t ON t.id = qc.tank_id
         LEFT JOIN aircraft a ON a.id = qc.aircraft_id
         WHERE ${conds.join(' AND ')} ORDER BY qc.check_date DESC`,
        params
      );

      const sheet = workbook.addWorksheet('Controlli Qualità');
      sheet.mergeCells('A1:G1');
      const titleCell = sheet.getCell('A1');
      titleCell.value = `${companyName} — Controlli Qualità`;
      titleCell.font = { bold: true, size: 13 };
      titleCell.alignment = { horizontal: 'center' };
      sheet.getRow(1).height = 24;

      const headers = ['Data', 'Tipo', 'Soggetto', 'Litri Spurgo', 'Conforme', 'Operatore', 'Note'];
      const colRow = sheet.addRow(headers);
      colRow.eachCell((cell) => Object.assign(cell, headerStyle));

      rows.forEach((qc, i) => {
        const subject = qc.tank_name || qc.registration || '';
        const row = sheet.addRow([
          new Date(qc.check_date).toLocaleDateString('it-IT'),
          qc.subject_type,
          subject,
          parseFloat(qc.liters_drained),
          qc.is_compliant ? 'SÌ' : 'NO',
          `${qc.first_name || ''} ${qc.last_name || ''}`.trim(),
          qc.notes || '',
        ]);
        if (i % 2 === 1) row.eachCell((cell) => Object.assign(cell, altRow));
        // Color non-compliant red
        if (!qc.is_compliant) {
          row.getCell(5).font = { bold: true, color: { argb: 'FFDC2626' } };
        }
      });

      sheet.columns = [{ width: 14 }, { width: 12 }, { width: 22 }, { width: 14 }, { width: 10 }, { width: 22 }, { width: 30 }];
    }

    const label = date_from && date_to ? `_${date_from}_${date_to}` : '';
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="fuel-report${label}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/reports/export/pdf ─────────────────────────────────────────
router.get('/export/pdf', async (req, res, next) => {
  try {
    const cid = req.user.company_id;
    const { type = 'fueling', date_from, date_to } = req.query;

    const { rows: compRows } = await pool.query('SELECT name FROM companies WHERE id = $1', [cid]);
    const companyName = compRows[0]?.name || 'Fuel Manager';

    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });

    res.setHeader('Content-Type', 'application/pdf');
    const label = date_from && date_to ? `_${date_from}_${date_to}` : '';
    res.setHeader('Content-Disposition', `attachment; filename="fuel-report${label}.pdf"`);
    doc.pipe(res);

    // ── Header ──────────────────────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, 56).fill('#1D4ED8');
    doc.fillColor('#FFFFFF').fontSize(18).font('Helvetica-Bold')
      .text('FUEL MANAGER', 40, 14, { continued: true })
      .font('Helvetica').fontSize(11)
      .text(`  |  PilotCraft Solutions`, { continued: false });
    doc.fontSize(10).text(companyName, 40, 34);
    if (date_from || date_to) {
      doc.text(`Periodo: ${date_from || '…'} → ${date_to || '…'}`, 40, 46);
    }
    doc.fillColor('#000000');

    let y = 72;

    const drawLine = () => {
      doc.moveTo(40, y).lineTo(doc.page.width - 40, y).strokeColor('#E5E7EB').lineWidth(0.5).stroke();
    };

    const checkPage = (neededY = 20) => {
      if (y + neededY > doc.page.height - 40) {
        doc.addPage();
        y = 40;
      }
    };

    if (type === 'fueling') {
      const { where, params } = buildFuelingWhere(cid, req.query);
      const { rows } = await pool.query(
        `${FUELING_SELECT} WHERE ${where} ORDER BY fo.operation_date DESC LIMIT 2000`,
        params
      );

      // Summary box
      const totalLiters = rows.reduce((s, r) => s + parseFloat(r.liters), 0);
      doc.rect(40, y, doc.page.width - 80, 36).fill('#F0F9FF').stroke('#BFDBFE');
      doc.fillColor('#1E40AF').font('Helvetica-Bold').fontSize(10)
        .text(`${rows.length} operazioni`, 52, y + 8, { continued: true })
        .font('Helvetica').fillColor('#374151')
        .text(`   ·   Totale litri: ${totalLiters.toFixed(1)} L`, { continued: false });
      doc.fillColor('#374151').fontSize(9)
        .text(`Report generato il ${new Date().toLocaleString('it-IT')}`, 52, y + 22);
      y += 46;

      // Table header
      const cols = [
        { label: 'Data/Ora', w: 90 },
        { label: 'Sorgente', w: 100 },
        { label: 'Destinazione', w: 100 },
        { label: 'Carburante', w: 70 },
        { label: 'Litri', w: 55 },
        { label: 'Operatore', w: 105 },
        { label: 'Note', w: 130 },
      ];

      const drawTableHeader = () => {
        let x = 40;
        doc.rect(40, y, doc.page.width - 80, 18).fill('#1D4ED8');
        cols.forEach((c) => {
          doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8)
            .text(c.label, x + 3, y + 5, { width: c.w - 6, ellipsis: true });
          x += c.w;
        });
        y += 18;
      };

      drawTableHeader();

      rows.forEach((op, i) => {
        checkPage(16);
        if (i > 0 && i % 40 === 0) drawTableHeader();

        const bg = i % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
        doc.rect(40, y, doc.page.width - 80, 14).fill(bg);

        const dest = op.dest_type === 'aircraft' ? (op.dest_aircraft_reg || '')
          : op.dest_type === 'ground_vehicle' ? `${op.dest_vehicle_plate || ''} ${op.dest_vehicle_name || ''}`.trim()
          : (op.dest_tank_name || '');

        const cells = [
          new Date(op.operation_date).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }),
          op.source_type === 'tank' ? (op.source_tank_name || '') : (op.external_source_name || ''),
          dest,
          (op.fuel_type || '').toUpperCase().replace('_', ' '),
          `${parseFloat(op.liters).toFixed(1)} L`,
          `${op.operator_first_name || ''} ${op.operator_last_name || ''}`.trim(),
          op.notes || '',
        ];

        let x = 40;
        doc.fillColor('#374151').font('Helvetica').fontSize(7.5);
        cells.forEach((text, ci) => {
          doc.text(String(text), x + 3, y + 3, { width: cols[ci].w - 6, ellipsis: true });
          x += cols[ci].w;
        });
        drawLine();
        y += 14;
      });

      // Total footer
      checkPage(20);
      y += 4;
      doc.rect(40, y, doc.page.width - 80, 18).fill('#DBEAFE');
      doc.fillColor('#1E40AF').font('Helvetica-Bold').fontSize(9)
        .text(`TOTALE: ${totalLiters.toFixed(1)} L erogati in ${rows.length} operazioni`, 52, y + 5);
      y += 22;
    }

    if (type === 'tanks') {
      const { rows } = await pool.query(
        `SELECT t.*, b.name AS base_name FROM tanks t LEFT JOIN bases b ON b.id = t.base_id
         WHERE t.company_id = $1 AND t.is_active = true ORDER BY t.fuel_type, t.name`,
        [cid]
      );

      doc.font('Helvetica-Bold').fontSize(13).fillColor('#1E3A5F').text('Inventario Cisterne', 40, y);
      y += 20;

      const cols = [
        { label: 'Codice', w: 70 },
        { label: 'Nome', w: 150 },
        { label: 'Base', w: 120 },
        { label: 'Carburante', w: 80 },
        { label: 'Capacità (L)', w: 80 },
        { label: 'Livello (L)', w: 80 },
        { label: 'Livello %', w: 70 },
      ];

      let x = 40;
      doc.rect(40, y, doc.page.width - 80, 18).fill('#1D4ED8');
      cols.forEach((c) => {
        doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8)
          .text(c.label, x + 3, y + 5, { width: c.w - 6 });
        x += c.w;
      });
      y += 18;

      rows.forEach((t, i) => {
        checkPage(14);
        const pct = t.capacity_liters > 0 ? (parseFloat(t.current_liters) / parseFloat(t.capacity_liters) * 100).toFixed(1) : '0.0';
        const bg = i % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
        doc.rect(40, y, doc.page.width - 80, 14).fill(bg);

        const cells = [
          t.code, t.name, t.base_name || '',
          (t.fuel_type || '').toUpperCase().replace('_', ' '),
          parseFloat(t.capacity_liters).toFixed(0),
          parseFloat(t.current_liters).toFixed(0),
          `${pct}%`,
        ];
        x = 40;
        doc.fillColor('#374151').font('Helvetica').fontSize(7.5);
        cells.forEach((text, ci) => {
          doc.text(String(text), x + 3, y + 3, { width: cols[ci].w - 6, ellipsis: true });
          x += cols[ci].w;
        });
        drawLine();
        y += 14;
      });
    }

    if (type === 'qc') {
      const params = [cid];
      const conds = ['qc.company_id = $1'];
      let p = 2;
      if (date_from) { conds.push(`qc.check_date >= $${p++}`); params.push(date_from); }
      if (date_to)   { conds.push(`qc.check_date <= $${p++}`); params.push(date_to + ' 23:59:59'); }

      const { rows } = await pool.query(
        `SELECT qc.*, u.first_name, u.last_name, t.name AS tank_name, a.registration
         FROM quality_checks qc
         LEFT JOIN users u ON u.id = qc.operator_id
         LEFT JOIN tanks t ON t.id = qc.tank_id
         LEFT JOIN aircraft a ON a.id = qc.aircraft_id
         WHERE ${conds.join(' AND ')} ORDER BY qc.check_date DESC`,
        params
      );

      doc.font('Helvetica-Bold').fontSize(13).fillColor('#1E3A5F').text('Controlli Qualità', 40, y);
      y += 20;

      const cols = [
        { label: 'Data', w: 80 },
        { label: 'Tipo', w: 80 },
        { label: 'Soggetto', w: 130 },
        { label: 'Litri Spurgo', w: 80 },
        { label: 'Conforme', w: 70 },
        { label: 'Operatore', w: 120 },
        { label: 'Note', w: 150 },
      ];

      let x = 40;
      doc.rect(40, y, doc.page.width - 80, 18).fill('#1D4ED8');
      cols.forEach((c) => {
        doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8)
          .text(c.label, x + 3, y + 5, { width: c.w - 6 });
        x += c.w;
      });
      y += 18;

      rows.forEach((qc, i) => {
        checkPage(14);
        const bg = i % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
        doc.rect(40, y, doc.page.width - 80, 14).fill(bg);

        const cells = [
          new Date(qc.check_date).toLocaleDateString('it-IT'),
          qc.subject_type,
          qc.tank_name || qc.registration || '',
          parseFloat(qc.liters_drained).toFixed(1),
          qc.is_compliant ? 'SÌ' : 'NO',
          `${qc.first_name || ''} ${qc.last_name || ''}`.trim(),
          qc.notes || '',
        ];

        x = 40;
        cells.forEach((text, ci) => {
          const isCompliantCell = ci === 4;
          doc.fillColor(isCompliantCell && !qc.is_compliant ? '#DC2626' : '#374151')
            .font(isCompliantCell ? 'Helvetica-Bold' : 'Helvetica')
            .fontSize(7.5)
            .text(String(text), x + 3, y + 3, { width: cols[ci].w - 6, ellipsis: true });
          x += cols[ci].w;
        });
        drawLine();
        y += 14;
      });
    }

    // Page numbers
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      doc.fillColor('#9CA3AF').fontSize(8).font('Helvetica')
        .text(`Pagina ${i + 1} di ${pageCount}`, 40, doc.page.height - 28, {
          align: 'right', width: doc.page.width - 80,
        });
    }

    doc.end();
  } catch (err) {
    next(err);
  }
});

export default router;
