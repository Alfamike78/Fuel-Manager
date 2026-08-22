import { Hono } from "hono";
import { db } from "../database";
import { movements, drainChecks, tanks, helicopters, companies, user as userTable } from "../database/schema";
import { eq, and } from "drizzle-orm";
import { authMiddleware, requireAuth, getCompanyId } from "../middleware";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

const MOV_LABEL: Record<string, string> = {
  refuel: "Rifornimento",
  consumption: "Consumo",
  transfer: "Trasferimento",
  drain_check: "Drain Check",
};
const QUALITY_LABEL: Record<string, string> = {
  ok: "Regolare",
  water: "Acqua presente",
  impurities: "Impurita",
};

function addHeader(doc: jsPDF, title: string, companyName: string) {
  doc.setFillColor(27, 58, 92);
  doc.rect(0, 0, 210, 28, "F");
  doc.setTextColor(214, 196, 160);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(companyName || "PilotCraft Solutions", 14, 14);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(title, 14, 21);
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(`Generato il ${new Date().toLocaleString("it-IT")}`, 196, 21, { align: "right" });
  doc.setTextColor(0, 0, 0);
}

/** Filtra per intervallo date (YYYY-MM-DD) e/o lista di id espliciti. */
function applyFilters<T extends { id: string; date: string }>(
  rows: T[],
  body: { from?: string; to?: string; ids?: string[] },
): T[] {
  let out = rows;
  if (Array.isArray(body.ids) && body.ids.length > 0) {
    const set = new Set(body.ids);
    out = out.filter((r) => set.has(r.id));
  }
  if (body.from) out = out.filter((r) => r.date >= body.from!);
  if (body.to) out = out.filter((r) => r.date <= body.to!);
  return out.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

const app = new Hono()
  .use(authMiddleware)
  // POST /api/reports/movements → { filename, mime, base64 }
  .post("/movements", requireAuth, async (c) => {
    const cid = getCompanyId(c);
    if (!cid) return c.json({ error: "No company" }, 400);
    const body = await c.req.json().catch(() => ({} as any));
    const format = body?.format === "xlsx" ? "xlsx" : "pdf";

    const [co] = await db.select().from(companies).where(eq(companies.id, cid));
    const companyName = co?.brandName || co?.name || "PilotCraft Solutions";
    const allMovs = await db.select().from(movements).where(eq(movements.companyId, cid));
    const rows = applyFilters(allMovs as any[], body ?? {});
    if (rows.length === 0) return c.json({ error: "Nessun movimento nel periodo selezionato" }, 404);

    const tankRows = await db.select().from(tanks).where(eq(tanks.companyId, cid));
    const fleetRows = await db.select().from(helicopters).where(eq(helicopters.companyId, cid));
    const users = await db.select({ id: userTable.id, name: userTable.name }).from(userTable).where(eq(userTable.companyId, cid));
    const tankMap = Object.fromEntries(tankRows.map((t) => [t.id, t.name]));
    const fleetMap = Object.fromEntries(fleetRows.map((h) => [h.id, h.identifier || h.name]));
    const userMap = Object.fromEntries(users.map((u) => [u.id, u.name]));

    const table = rows.map((m: any) => ({
      Data: m.date,
      Ora: m.time ?? "",
      Tipo: MOV_LABEL[m.type] ?? m.type,
      Cisterna: m.tankId ? (tankMap[m.tankId] ?? "-") : "-",
      Destinazione: m.toTankId ? (tankMap[m.toTankId] ?? "-") : m.helicopterId ? (fleetMap[m.helicopterId] ?? "-") : "-",
      Litri: Math.round((m.liters ?? 0) * 100) / 100,
      Operatore: m.operatorId ? (userMap[m.operatorId] ?? "-") : "-",
      Note: m.notes ?? "",
    }));

    const stamp = new Date().toISOString().split("T")[0];

    if (format === "xlsx") {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(table);
      ws["!cols"] = [{ wch: 11 }, { wch: 7 }, { wch: 15 }, { wch: 18 }, { wch: 18 }, { wch: 10 }, { wch: 16 }, { wch: 30 }];
      XLSX.utils.book_append_sheet(wb, ws, "Movimenti");
      const totRefuel = rows.filter((m: any) => m.type === "refuel").reduce((s, m: any) => s + (m.liters ?? 0), 0);
      const totCons = rows.filter((m: any) => m.type === "consumption").reduce((s, m: any) => s + (m.liters ?? 0), 0);
      const totDrain = rows.filter((m: any) => m.type === "drain_check").reduce((s, m: any) => s + (m.liters ?? 0), 0);
      const wsSum = XLSX.utils.json_to_sheet([
        { Voce: "Azienda", Valore: companyName },
        { Voce: "Movimenti totali", Valore: rows.length },
        { Voce: "Rifornimenti (L)", Valore: Math.round(totRefuel * 100) / 100 },
        { Voce: "Consumi (L)", Valore: Math.round(totCons * 100) / 100 },
        { Voce: "Spurghi (L)", Valore: Math.round(totDrain * 100) / 100 },
        { Voce: "Generato il", Valore: new Date().toLocaleString("it-IT") },
      ]);
      wsSum["!cols"] = [{ wch: 22 }, { wch: 26 }];
      XLSX.utils.book_append_sheet(wb, wsSum, "Riepilogo");
      const base64 = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
      return c.json({
        filename: `movimenti-${stamp}.xlsx`,
        mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        base64,
        count: rows.length,
      }, 200);
    }

    const doc = new jsPDF();
    addHeader(doc, "Report Movimenti Carburante", companyName);
    const totRefuel = rows.filter((m: any) => m.type === "refuel").reduce((s, m: any) => s + (m.liters ?? 0), 0);
    const totCons = rows.filter((m: any) => m.type === "consumption").reduce((s, m: any) => s + (m.liters ?? 0), 0);
    const totDrain = rows.filter((m: any) => m.type === "drain_check").reduce((s, m: any) => s + (m.liters ?? 0), 0);
    doc.setFontSize(10);
    doc.setTextColor(30, 30, 30);
    const periodo = body?.from || body?.to ? `Periodo: ${body?.from ?? "inizio"} → ${body?.to ?? "oggi"}` : "Periodo: tutti i movimenti";
    doc.text(periodo, 14, 36);
    doc.text(`Rifornimenti totali: ${totRefuel.toLocaleString("it-IT")} L`, 14, 42);
    doc.text(`Consumi totali: ${totCons.toLocaleString("it-IT")} L`, 14, 48);
    doc.text(`Spurghi totali: ${totDrain.toLocaleString("it-IT")} L`, 14, 54);
    doc.text(`Movimenti totali: ${rows.length}`, 14, 60);
    autoTable(doc, {
      startY: 66,
      head: [["Data/Ora", "Tipo", "Cisterna", "Destinazione/Mezzo", "Litri", "Operatore", "Note"]],
      body: table.map((r) => [`${r.Data} ${r.Ora}`, r.Tipo, r.Cisterna, r.Destinazione, `${r.Litri} L`, r.Operatore, r.Note]),
      headStyles: { fillColor: [27, 58, 92], textColor: [214, 196, 160] },
      styles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });
    const base64 = doc.output("datauristring").split(",")[1] ?? "";
    return c.json({ filename: `movimenti-${stamp}.pdf`, mime: "application/pdf", base64, count: rows.length }, 200);
  })
  // POST /api/reports/drain-checks → { filename, mime, base64 }
  .post("/drain-checks", requireAuth, async (c) => {
    const cid = getCompanyId(c);
    if (!cid) return c.json({ error: "No company" }, 400);
    const body = await c.req.json().catch(() => ({} as any));
    const format = body?.format === "xlsx" ? "xlsx" : "pdf";

    const [co] = await db.select().from(companies).where(eq(companies.id, cid));
    const companyName = co?.brandName || co?.name || "PilotCraft Solutions";
    const allChecks = await db.select().from(drainChecks).where(eq(drainChecks.companyId, cid));
    const rows = applyFilters(allChecks as any[], body ?? {});
    if (rows.length === 0) return c.json({ error: "Nessun drain check nel periodo selezionato" }, 404);

    const tankRows = await db.select().from(tanks).where(eq(tanks.companyId, cid));
    const fleetRows = await db.select().from(helicopters).where(eq(helicopters.companyId, cid));
    const users = await db.select({ id: userTable.id, name: userTable.name }).from(userTable).where(eq(userTable.companyId, cid));
    const tankMap = Object.fromEntries(tankRows.map((t) => [t.id, t.name]));
    const fleetMap = Object.fromEntries(fleetRows.map((h) => [h.id, h.identifier || h.name]));
    const userMap = Object.fromEntries(users.map((u) => [u.id, u.name]));

    const table = rows.map((d: any) => ({
      Data: d.date,
      Ora: d.time ?? "",
      "Cisterna/Mezzo": d.tankId ? (tankMap[d.tankId] ?? "-") : d.helicopterId ? (fleetMap[d.helicopterId] ?? "-") : "-",
      Litri: Math.round((d.liters ?? 0) * 100) / 100,
      Esito: QUALITY_LABEL[d.quality] ?? d.quality,
      Operatore: d.operatorId ? (userMap[d.operatorId] ?? "-") : "-",
      Note: d.notes ?? "",
    }));

    const stamp = new Date().toISOString().split("T")[0];

    if (format === "xlsx") {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(table);
      ws["!cols"] = [{ wch: 11 }, { wch: 7 }, { wch: 20 }, { wch: 10 }, { wch: 16 }, { wch: 16 }, { wch: 30 }];
      XLSX.utils.book_append_sheet(wb, ws, "Drain Check");
      const base64 = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
      return c.json({
        filename: `drain-check-${stamp}.xlsx`,
        mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        base64,
        count: rows.length,
      }, 200);
    }

    const doc = new jsPDF();
    addHeader(doc, "Report Drain Check", companyName);
    doc.setFontSize(10);
    doc.setTextColor(30, 30, 30);
    const periodo = body?.from || body?.to ? `Periodo: ${body?.from ?? "inizio"} → ${body?.to ?? "oggi"}` : "Periodo: tutti i controlli";
    doc.text(periodo, 14, 36);
    doc.text(`Controlli totali: ${rows.length}`, 14, 42);
    const anomalie = rows.filter((d: any) => d.quality !== "ok").length;
    doc.text(`Anomalie rilevate: ${anomalie}`, 14, 48);
    autoTable(doc, {
      startY: 54,
      head: [["Data/Ora", "Cisterna/Mezzo", "Litri", "Esito", "Operatore", "Note"]],
      body: table.map((r) => [`${r.Data} ${r.Ora}`, r["Cisterna/Mezzo"], `${r.Litri} L`, r.Esito, r.Operatore, r.Note]),
      headStyles: { fillColor: [27, 58, 92], textColor: [214, 196, 160] },
      styles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 3) {
          const val = String(data.cell.raw ?? "");
          if (val !== "Regolare") {
            data.cell.styles.textColor = [239, 68, 68];
            data.cell.styles.fontStyle = "bold";
          }
        }
      },
    });
    const base64 = doc.output("datauristring").split(",")[1] ?? "";
    return c.json({ filename: `drain-check-${stamp}.pdf`, mime: "application/pdf", base64, count: rows.length }, 200);
  });

export default app;
