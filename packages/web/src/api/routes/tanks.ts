import { Hono } from "hono";
import { db } from "../database";
import { tanks } from "../database/schema";
import { eq, and } from "drizzle-orm";
import { authMiddleware, requireAuth, requireAdmin, getCompanyId } from "../middleware";
import { randomUUID } from "crypto";

const app = new Hono()
  .use(authMiddleware)
  .get("/", requireAuth, async (c) => {
    const cid = getCompanyId(c);
    if (!cid) return c.json({ error: "No company" }, 400);
    const rows = await db.select().from(tanks).where(eq(tanks.companyId, cid));
    return c.json(rows, 200);
  })
  .post("/", requireAdmin, async (c) => {
    const cid = getCompanyId(c);
    if (!cid) return c.json({ error: "No company" }, 400);
    const body = await c.req.json();
    const row = {
      id: randomUUID(),
      name: body.name,
      capacity: Number(body.capacity),
      currentLevel: Number(body.currentLevel ?? 0),
      fuelType: body.fuelType ?? "Jet-A1",
      baseId: body.baseId ?? null,
      companyId: cid,
      alertThreshold: Number(body.alertThreshold ?? 1500),
      lastDrainCheckQuality: null,
      lastDrainCheckDate: null,
      createdAt: Date.now(),
    };
    await db.insert(tanks).values(row);
    return c.json(row, 201);
  })
  .patch("/:id", requireAuth, async (c) => {
    const cid = getCompanyId(c);
    if (!cid) return c.json({ error: "No company" }, 400);
    const id = c.req.param("id");
    const body = await c.req.json();
    const u = c.get("user") as any;
    // fuel_type change: only superadmin
    if (body.fuelType !== undefined && u.role !== "superadmin") {
      return c.json({ error: "Only superadmin can change fuel type" }, 403);
    }
    const updates: any = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.capacity !== undefined) updates.capacity = Number(body.capacity);
    if (body.currentLevel !== undefined) updates.currentLevel = Number(body.currentLevel);
    if (body.fuelType !== undefined) updates.fuelType = body.fuelType;
    if (body.baseId !== undefined) updates.baseId = body.baseId;
    if (body.alertThreshold !== undefined) updates.alertThreshold = Number(body.alertThreshold);
    if (body.lastDrainCheckQuality !== undefined) updates.lastDrainCheckQuality = body.lastDrainCheckQuality;
    if (body.lastDrainCheckDate !== undefined) updates.lastDrainCheckDate = body.lastDrainCheckDate;
    await db.update(tanks).set(updates).where(and(eq(tanks.id, id), eq(tanks.companyId, cid)));
    const [updated] = await db.select().from(tanks).where(and(eq(tanks.id, id), eq(tanks.companyId, cid)));
    return c.json(updated, 200);
  })
  .delete("/:id", requireAdmin, async (c) => {
    const cid = getCompanyId(c);
    if (!cid) return c.json({ error: "No company" }, 400);
    const id = c.req.param("id");
    await db.delete(tanks).where(and(eq(tanks.id, id), eq(tanks.companyId, cid)));
    return c.json({ ok: true }, 200);
  });

export default app;
