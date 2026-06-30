import { Hono } from "hono";
import { db } from "../database";
import { movements, tanks } from "../database/schema";
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
      .from(movements)
      .where(eq(movements.companyId, cid))
      .orderBy(desc(movements.createdAt))
      .limit(200);
    return c.json(rows, 200);
  })
  .post("/", requireAuth, async (c) => {
    const cid = getCompanyId(c);
    if (!cid) return c.json({ error: "No company" }, 400);
    const u = c.get("user") as any;
    const body = await c.req.json();

    // Validate tank belongs to company
    if (body.tankId) {
      const [tank] = await db.select().from(tanks).where(and(eq(tanks.id, body.tankId), eq(tanks.companyId, cid)));
      if (!tank) return c.json({ error: "Tank not found" }, 404);

      // Validate fuel type match for consumption (helicopter refuel)
      // No block on same-type transfers
      if (body.toTankId) {
        const [toTank] = await db.select().from(tanks).where(and(eq(tanks.id, body.toTankId), eq(tanks.companyId, cid)));
        if (!toTank) return c.json({ error: "Destination tank not found" }, 404);
        if (tank.fuelType !== toTank.fuelType) {
          return c.json({ error: "Cannot transfer between tanks with different fuel types" }, 400);
        }
      }

      // Update tank levels
      const liters = Number(body.liters);
      if (body.type === "refuel") {
        // Adding to tank from supplier
        await db.update(tanks).set({ currentLevel: Math.min(tank.capacity, (tank.currentLevel ?? 0) + liters) }).where(eq(tanks.id, tank.id));
      } else if (body.type === "consumption") {
        // Helicopter refuel from tank
        await db.update(tanks).set({ currentLevel: Math.max(0, (tank.currentLevel ?? 0) - liters) }).where(eq(tanks.id, tank.id));
      } else if (body.type === "transfer" && body.toTankId) {
        const [toTank] = await db.select().from(tanks).where(eq(tanks.id, body.toTankId));
        await db.update(tanks).set({ currentLevel: Math.max(0, (tank.currentLevel ?? 0) - liters) }).where(eq(tanks.id, tank.id));
        if (toTank) {
          await db.update(tanks).set({ currentLevel: Math.min(toTank.capacity, (toTank.currentLevel ?? 0) + liters) }).where(eq(tanks.id, toTank.id));
        }
      }
    }

    const now = new Date();
    const row = {
      id: randomUUID(),
      tankId: body.tankId ?? null,
      toTankId: body.toTankId ?? null,
      helicopterId: body.helicopterId ?? null,
      type: body.type,
      liters: Number(body.liters),
      date: body.date ?? now.toISOString().split("T")[0],
      time: body.time ?? now.toTimeString().slice(0, 5),
      operatorId: u.id,
      notes: body.notes ?? null,
      companyId: cid,
      createdAt: Date.now(),
    };
    await db.insert(movements).values(row);
    return c.json(row, 201);
  })
  .delete("/:id", requireAdmin, async (c) => {
    const cid = getCompanyId(c);
    if (!cid) return c.json({ error: "No company" }, 400);
    const id = c.req.param("id");
    await db.delete(movements).where(and(eq(movements.id, id), eq(movements.companyId, cid)));
    return c.json({ ok: true }, 200);
  });

export default app;
