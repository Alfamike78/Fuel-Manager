import { Hono } from "hono";
import { db } from "../database";
import { drainChecks, tanks, movements } from "../database/schema";
import { eq, and, desc } from "drizzle-orm";
import { authMiddleware, requireAuth, requireAdmin, getCompanyId } from "../middleware";
import { randomUUID } from "crypto";

const app = new Hono()
  .use(authMiddleware)
  .get("/", requireAuth, async (c) => {
    const cid = getCompanyId(c);
    if (!cid) return c.json({ error: "No company" }, 400);
    const rows = await db
      .select()
      .from(drainChecks)
      .where(eq(drainChecks.companyId, cid))
      .orderBy(desc(drainChecks.createdAt))
      .limit(200);
    return c.json(rows, 200);
  })
  .post("/", requireAuth, async (c) => {
    const cid = getCompanyId(c);
    if (!cid) return c.json({ error: "No company" }, 400);
    const u = c.get("user") as any;
    const body = await c.req.json();
    const liters = Number(body.liters ?? 0);
    const quality = body.quality; // ok|water|impurities
    const now = new Date();

    // If tank: update level + set lastDrainCheck
    if (body.tankId) {
      const [tank] = await db.select().from(tanks).where(and(eq(tanks.id, body.tankId), eq(tanks.companyId, cid)));
      if (!tank) return c.json({ error: "Tank not found" }, 404);
      const newLevel = Math.max(0, (tank.currentLevel ?? 0) - liters);
      await db.update(tanks).set({
        currentLevel: newLevel,
        lastDrainCheckQuality: quality,
        lastDrainCheckDate: body.date ?? now.toISOString().split("T")[0],
      }).where(eq(tanks.id, tank.id));
    }

    const row = {
      id: randomUUID(),
      tankId: body.tankId ?? null,
      helicopterId: body.helicopterId ?? null,
      liters,
      quality,
      notes: body.notes ?? null,
      photoUrl: body.photoUrl ?? null,
      operatorId: u.id,
      date: body.date ?? now.toISOString().split("T")[0],
      time: body.time ?? now.toTimeString().slice(0, 5),
      companyId: cid,
      createdAt: Date.now(),
    };
    await db.insert(drainChecks).values(row);

    // Also log as movement
    if (body.tankId && liters > 0) {
      await db.insert(movements).values({
        id: randomUUID(),
        tankId: body.tankId,
        toTankId: null,
        helicopterId: body.helicopterId ?? null,
        type: "drain_check",
        liters,
        date: row.date,
        time: row.time,
        operatorId: u.id,
        notes: `Drain check — ${quality}${body.notes ? ": " + body.notes : ""}`,
        companyId: cid,
        createdAt: Date.now(),
      });
    }

    return c.json(row, 201);
  })
  .delete("/:id", requireAdmin, async (c) => {
    const cid = getCompanyId(c);
    if (!cid) return c.json({ error: "No company" }, 400);
    const id = c.req.param("id");
    await db.delete(drainChecks).where(and(eq(drainChecks.id, id), eq(drainChecks.companyId, cid)));
    return c.json({ ok: true }, 200);
  });

export default app;
