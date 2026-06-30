import { Hono } from "hono";
import { db } from "../database";
import { bases } from "../database/schema";
import { eq, and } from "drizzle-orm";
import { authMiddleware, requireAuth, requireAdmin, getCompanyId } from "../middleware";
import { randomUUID } from "crypto";

const app = new Hono()
  .use(authMiddleware)
  .get("/", requireAuth, async (c) => {
    const cid = getCompanyId(c);
    if (!cid) return c.json({ error: "No company" }, 400);
    const rows = await db.select().from(bases).where(eq(bases.companyId, cid));
    return c.json(rows, 200);
  })
  .post("/", requireAdmin, async (c) => {
    const cid = getCompanyId(c);
    if (!cid) return c.json({ error: "No company" }, 400);
    const body = await c.req.json();
    const row = {
      id: randomUUID(),
      name: body.name,
      location: body.location ?? null,
      companyId: cid,
      createdAt: Date.now(),
    };
    await db.insert(bases).values(row);
    return c.json(row, 201);
  })
  .patch("/:id", requireAdmin, async (c) => {
    const cid = getCompanyId(c);
    if (!cid) return c.json({ error: "No company" }, 400);
    const id = c.req.param("id");
    const body = await c.req.json();
    const updates: any = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.location !== undefined) updates.location = body.location;
    await db.update(bases).set(updates).where(and(eq(bases.id, id), eq(bases.companyId, cid)));
    const [updated] = await db.select().from(bases).where(and(eq(bases.id, id), eq(bases.companyId, cid)));
    return c.json(updated, 200);
  })
  .delete("/:id", requireAdmin, async (c) => {
    const cid = getCompanyId(c);
    if (!cid) return c.json({ error: "No company" }, 400);
    const id = c.req.param("id");
    await db.delete(bases).where(and(eq(bases.id, id), eq(bases.companyId, cid)));
    return c.json({ ok: true }, 200);
  });

export default app;
