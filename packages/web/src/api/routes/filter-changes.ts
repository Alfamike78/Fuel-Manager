import { Hono } from "hono";
import { db } from "../database";
import { filterChanges, tanks } from "../database/schema";
import { eq, and, desc } from "drizzle-orm";
import { authMiddleware, requireAuth, requireAdmin, getCompanyId } from "../middleware";
import { randomUUID } from "crypto";

// Somma mesi a una data "YYYY-MM-DD" e restituisce "YYYY-MM-DD".
function addMonths(dateStr: string, months: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const base = new Date(Date.UTC(y, (m - 1) + months, d));
  const yyyy = base.getUTCFullYear();
  const mm = String(base.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(base.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

const app = new Hono()
  .use(authMiddleware)
  .get("/", requireAuth, async (c) => {
    const cid = getCompanyId(c);
    if (!cid) return c.json({ error: "No company" }, 400);
    const tankId = c.req.query("tankId");
    const rows = await db
      .select()
      .from(filterChanges)
      .where(eq(filterChanges.companyId, cid))
      .orderBy(desc(filterChanges.createdAt))
      .limit(500);
    const filtered = tankId ? rows.filter((r) => r.tankId === tankId) : rows;
    return c.json(filtered, 200);
  })
  .post("/", requireAuth, async (c) => {
    const cid = getCompanyId(c);
    if (!cid) return c.json({ error: "No company" }, 400);
    const u = c.get("user") as any;
    const body = await c.req.json().catch(() => ({} as any));

    const tankId = body.tankId;
    const model = typeof body.model === "string" ? body.model.trim() : "";
    const installedDate = body.installedDate;
    const validityMonths = Number(body.validityMonths);

    if (!tankId) return c.json({ error: "Indica la cisterna" }, 400);
    if (!model) return c.json({ error: "Indica il modello del filtro" }, 400);
    if (!installedDate) return c.json({ error: "Indica la data di installazione" }, 400);
    if (![12, 24].includes(validityMonths)) {
      return c.json({ error: "Validità non valida (1 anno o 2 anni)" }, 400);
    }

    const [tank] = await db
      .select()
      .from(tanks)
      .where(and(eq(tanks.id, tankId), eq(tanks.companyId, cid)));
    if (!tank) return c.json({ error: "Cisterna non trovata" }, 404);

    const expiresDate = addMonths(installedDate, validityMonths);

    const row = {
      id: randomUUID(),
      tankId,
      companyId: cid,
      model,
      installedDate,
      validityMonths,
      expiresDate,
      notes: body.notes || null,
      operatorId: u?.id ?? null,
      operatorName: u?.name ?? null,
      createdAt: Date.now(),
    };
    await db.insert(filterChanges).values(row);
    return c.json(row, 201);
  })
  .delete("/:id", requireAdmin, async (c) => {
    const cid = getCompanyId(c);
    if (!cid) return c.json({ error: "No company" }, 400);
    const id = c.req.param("id");
    await db
      .delete(filterChanges)
      .where(and(eq(filterChanges.id, id), eq(filterChanges.companyId, cid)));
    return c.json({ ok: true }, 200);
  });

export default app;
