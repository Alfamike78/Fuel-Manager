import { Hono } from "hono";
import { db } from "../database";
import { helicopters } from "../database/schema";
import { eq, and } from "drizzle-orm";
import { authMiddleware, requireAuth, requireAdmin, getCompanyId } from "../middleware";
import { randomUUID } from "crypto";

const app = new Hono()
  .use(authMiddleware)
  .get("/", requireAuth, async (c) => {
    const cid = getCompanyId(c);
    if (!cid) return c.json({ error: "No company" }, 400);
    const rows = await db.select().from(helicopters).where(eq(helicopters.companyId, cid));
    return c.json(rows, 200);
  })
  .post("/", requireAdmin, async (c) => {
    const cid = getCompanyId(c);
    if (!cid) return c.json({ error: "No company" }, 400);
    const body = await c.req.json();
    const row = {
      id: randomUUID(),
      name: body.name,
      identifier: body.identifier ?? null,
      model: body.model ?? null,
      capacity: body.capacity ? Number(body.capacity) : null,
      category: body.category ?? "aviation",
      vehicleType: body.vehicleType ?? null,
      companyId: cid,
      createdAt: Date.now(),
    };
    await db.insert(helicopters).values(row);
    return c.json(row, 201);
  })
  .patch("/:id", requireAdmin, async (c) => {
    const cid = getCompanyId(c);
    if (!cid) return c.json({ error: "No company" }, 400);
    const id = c.req.param("id");
    const body = await c.req.json();
    const updates: any = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.identifier !== undefined) updates.identifier = body.identifier;
    if (body.model !== undefined) updates.model = body.model;
    if (body.capacity !== undefined) updates.capacity = Number(body.capacity);
    if (body.category !== undefined) updates.category = body.category;
    if (body.vehicleType !== undefined) updates.vehicleType = body.vehicleType;
    await db.update(helicopters).set(updates).where(and(eq(helicopters.id, id), eq(helicopters.companyId, cid)));
    const [updated] = await db.select().from(helicopters).where(and(eq(helicopters.id, id), eq(helicopters.companyId, cid)));
    return c.json(updated, 200);
  })
  .delete("/:id", requireAdmin, async (c) => {
    const cid = getCompanyId(c);
    if (!cid) return c.json({ error: "No company" }, 400);
    const id = c.req.param("id");
    await db.delete(helicopters).where(and(eq(helicopters.id, id), eq(helicopters.companyId, cid)));
    return c.json({ ok: true }, 200);
  });

export default app;
