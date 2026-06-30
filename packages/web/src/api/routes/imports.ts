import { Hono } from "hono";
import { db } from "../database";
import { tanks, movements } from "../database/schema";
import { eq, and } from "drizzle-orm";
import { authMiddleware, requireAdmin, getCompanyId } from "../middleware";
import { randomUUID } from "crypto";

const app = new Hono()
  .use(authMiddleware)
  .post("/movements", requireAdmin, async (c) => {
    const cid = getCompanyId(c);
    if (!cid) return c.json({ error: "No company" }, 400);
    const u = c.get("user") as any;
    const body = await c.req.json();
    const rows: any[] = body.rows ?? [];
    const results: any[] = [];

    const allTanks = await db.select().from(tanks).where(eq(tanks.companyId, cid));

    for (const row of rows) {
      try {
        const tank = allTanks.find((t) => t.name.toLowerCase() === (row.tank ?? "").toLowerCase());
        if (!tank) { results.push({ ...row, error: "Cisterna non trovata" }); continue; }
        const liters = Number(row.liters);
        if (!liters || isNaN(liters)) { results.push({ ...row, error: "Litri non validi" }); continue; }
        const type = row.type === "consumption" ? "consumption" : "refuel";
        // Update tank level
        if (type === "refuel") {
          await db.update(tanks).set({ currentLevel: Math.min(tank.capacity, (tank.currentLevel ?? 0) + liters) }).where(eq(tanks.id, tank.id));
        } else {
          await db.update(tanks).set({ currentLevel: Math.max(0, (tank.currentLevel ?? 0) - liters) }).where(eq(tanks.id, tank.id));
        }
        const mov = {
          id: randomUUID(),
          tankId: tank.id,
          toTankId: null,
          helicopterId: null,
          type,
          liters,
          date: row.date ?? new Date().toISOString().split("T")[0],
          time: row.time ?? "00:00",
          operatorId: u.id,
          notes: row.notes ?? "Import",
          companyId: cid,
          createdAt: Date.now(),
        };
        await db.insert(movements).values(mov);
        results.push({ ...row, ok: true });
      } catch (e: any) {
        results.push({ ...row, error: e.message });
      }
    }
    return c.json({ results }, 200);
  });

export default app;
