import { Hono } from "hono";
import { db } from "../database";
import { movements, tanks, helicopters } from "../database/schema";
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

    // ── COMPATIBILITA' CARBURANTE ────────────────────────────────────────
    // Un mezzo (aereo o terrestre) puo' essere rifornito SOLO da una cisterna
    // che contiene lo stesso tipo di carburante assegnato al mezzo.
    if (body.helicopterId && body.tankId) {
      const [veh] = await db
        .select()
        .from(helicopters)
        .where(and(eq(helicopters.id, body.helicopterId), eq(helicopters.companyId, cid)));
      if (!veh) return c.json({ error: "Mezzo non trovato" }, 404);
      const [srcTank] = await db
        .select()
        .from(tanks)
        .where(and(eq(tanks.id, body.tankId), eq(tanks.companyId, cid)));
      if (!srcTank) return c.json({ error: "Tank not found" }, 404);
      if (!veh.fuelType) {
        return c.json({
          error: `Il mezzo "${veh.name}" non ha un tipo di carburante assegnato. Impostalo nella sezione Flotta prima di registrare un rifornimento.`,
          code: "VEHICLE_FUEL_NOT_SET",
        }, 400);
      }
      if (veh.fuelType !== srcTank.fuelType) {
        return c.json({
          error: `Carburante incompatibile: il mezzo "${veh.name}" richiede ${veh.fuelType}, la cisterna "${srcTank.name}" contiene ${srcTank.fuelType}. Rifornimento non consentito.`,
          code: "FUEL_MISMATCH",
        }, 400);
      }
    }

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
  // PATCH: modifica movimento (solo admin/superadmin).
  // Ricalcola i livelli cisterna: annulla l'effetto dei litri vecchi, applica i nuovi.
  .patch("/:id", requireAdmin, async (c) => {
    const cid = getCompanyId(c);
    if (!cid) return c.json({ error: "No company" }, 400);
    const id = c.req.param("id");
    const body = await c.req.json().catch(() => ({} as any));

    const [mov] = await db.select().from(movements).where(and(eq(movements.id, id), eq(movements.companyId, cid)));
    if (!mov) return c.json({ error: "Movimento non trovato" }, 404);

    const updates: any = {};
    if (body.date !== undefined) updates.date = String(body.date);
    if (body.time !== undefined) updates.time = String(body.time);
    if (body.notes !== undefined) updates.notes = body.notes ?? null;

    let newLiters = mov.liters;
    if (body.liters !== undefined) {
      newLiters = Number(body.liters);
      if (!Number.isFinite(newLiters) || newLiters <= 0) {
        return c.json({ error: "Litri non validi" }, 400);
      }
      updates.liters = newLiters;
    }

    const delta = newLiters - mov.liters;
    if (delta !== 0 && mov.tankId) {
      const [tank] = await db.select().from(tanks).where(and(eq(tanks.id, mov.tankId), eq(tanks.companyId, cid)));
      if (tank) {
        // refuel: +delta sulla cisterna | consumption e transfer: -delta sulla cisterna di partenza
        const sign = mov.type === "refuel" ? 1 : -1;
        const next = Math.max(0, Math.min(tank.capacity, (tank.currentLevel ?? 0) + sign * delta));
        await db.update(tanks).set({ currentLevel: next }).where(eq(tanks.id, tank.id));
      }
      if (mov.type === "transfer" && mov.toTankId) {
        const [toTank] = await db.select().from(tanks).where(and(eq(tanks.id, mov.toTankId), eq(tanks.companyId, cid)));
        if (toTank) {
          const next = Math.max(0, Math.min(toTank.capacity, (toTank.currentLevel ?? 0) + delta));
          await db.update(tanks).set({ currentLevel: next }).where(eq(tanks.id, toTank.id));
        }
      }
    }

    if (Object.keys(updates).length > 0) {
      await db.update(movements).set(updates).where(and(eq(movements.id, id), eq(movements.companyId, cid)));
    }
    const [updated] = await db.select().from(movements).where(and(eq(movements.id, id), eq(movements.companyId, cid)));
    return c.json(updated, 200);
  })
  .delete("/:id", requireAdmin, async (c) => {
    const cid = getCompanyId(c);
    if (!cid) return c.json({ error: "No company" }, 400);
    const id = c.req.param("id");
    await db.delete(movements).where(and(eq(movements.id, id), eq(movements.companyId, cid)));
    return c.json({ ok: true }, 200);
  });

export default app;
