import { Hono } from "hono";
import { db } from "../database";
import { companies, user as userTable, tanks, helicopters, movements, drainChecks, bases, inviteTokens } from "../database/schema";
import { eq, ne, isNull, isNotNull } from "drizzle-orm";
import { authMiddleware, requireAuth, requireSuperAdmin } from "../middleware";
import { randomUUID } from "crypto";
import { auth } from "../auth";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const app = new Hono()
  .use(authMiddleware)
  .use(requireSuperAdmin)
  // List all companies (active or archived via ?archived=true)
  .get("/companies", async (c) => {
    const archived = c.req.query("archived") === "true";
    const rows = archived
      ? await db.select().from(companies).where(isNotNull(companies.archivedAt))
      : await db.select().from(companies).where(isNull(companies.archivedAt));
    // Attach admin email to each company
    const result = await Promise.all(rows.map(async (co) => {
      const admins = await db.select({ email: userTable.email }).from(userTable)
        .where(eq(userTable.companyId, co.id));
      return { ...co, email: admins[0]?.email ?? "" };
    }));
    return c.json(result, 200);
  })
  // Create company (super-admin)
  .post("/companies", async (c) => {
    const body = await c.req.json();
    const row = {
      id: randomUUID(),
      name: body.name,
      brandName: body.brandName ?? null,
      primaryColor: body.primaryColor ?? "#1b3a5c",
      bgColor: body.bgColor ?? "#d6c4a0",
      faviconUrl: null,
      logoUrl: null,
      status: "trial",
      plan: "trial",
      trialEndsAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
      archivedAt: null,
      isInternal: body.isInternal ? 1 : 0,
      createdAt: Date.now(),
    };
    await db.insert(companies).values(row);
    // Optionally create admin user
    if (body.adminEmail && body.adminPassword) {
      try {
        const result = await auth.api.signUpEmail({
          body: { name: body.adminName ?? body.adminEmail, email: body.adminEmail, password: body.adminPassword },
        });
        const newUser = (result as any)?.user;
        if (newUser) {
          await db.update(userTable).set({ companyId: row.id, role: "admin" }).where(eq(userTable.id, newUser.id));
        }
      } catch (e: any) {
        // Company created but user creation failed — return warning
        return c.json({ ...row, warning: e.message }, 201);
      }
    }
    return c.json(row, 201);
  })
  // Update company
  .patch("/companies/:id", async (c) => {
    const id = c.req.param("id");
    const body = await c.req.json();
    const updates: any = {};
    const allowed = ["name", "brandName", "primaryColor", "bgColor", "status", "plan", "trialEndsAt", "isInternal"];
    for (const k of allowed) {
      if (body[k] !== undefined) updates[k] = body[k];
    }
    await db.update(companies).set(updates).where(eq(companies.id, id));
    const [updated] = await db.select().from(companies).where(eq(companies.id, id));
    return c.json(updated, 200);
  })
  // Manage company subscription
  .patch("/companies/:id/subscription", async (c) => {
    const id = c.req.param("id");
    const body = await c.req.json();
    const updates: any = {};
    if (body.plan !== undefined) updates.plan = body.plan;
    if (body.status !== undefined) updates.status = body.status;
    if (body.trialEndsAt !== undefined) updates.trialEndsAt = body.trialEndsAt;
    if (body.extendDays !== undefined) {
      const [co] = await db.select().from(companies).where(eq(companies.id, id));
      const base = co?.trialEndsAt ?? Date.now();
      updates.trialEndsAt = base + body.extendDays * 24 * 60 * 60 * 1000;
    }
    await db.update(companies).set(updates).where(eq(companies.id, id));
    const [updated] = await db.select().from(companies).where(eq(companies.id, id));
    return c.json(updated, 200);
  })
  // Get company users
  .get("/companies/:id/users", async (c) => {
    const id = c.req.param("id");
    const users = await db.select({
      id: userTable.id, name: userTable.name, email: userTable.email, role: userTable.role
    }).from(userTable).where(eq(userTable.companyId, id));
    return c.json(users, 200);
  })
  // Add user to company
  .post("/companies/:id/users", async (c) => {
    const companyId = c.req.param("id");
    const body = await c.req.json();
    try {
      const result = await auth.api.signUpEmail({
        body: { name: body.name, email: body.email, password: body.password ?? "TempPass123!" },
      });
      const newUser = (result as any)?.user;
      if (!newUser) return c.json({ error: "Registrazione fallita" }, 400);
      await db.update(userTable).set({ companyId, role: body.role ?? "operator" }).where(eq(userTable.id, newUser.id));
      return c.json({ ok: true }, 201);
    } catch (e: any) {
      return c.json({ error: e.message ?? "Errore" }, 400);
    }
  })
  // Reset user password
  .post("/companies/:id/users/:userId/reset-password", async (c) => {
    const userId = c.req.param("userId");
    const body = await c.req.json();
    try {
      await auth.api.setPassword({ body: { userId, newPassword: body.password } } as any);
    } catch {}
    return c.json({ ok: true }, 200);
  })
  // Remove user from company
  .delete("/companies/:id/users/:userId", async (c) => {
    const userId = c.req.param("userId");
    await db.update(userTable).set({ companyId: null, role: "operator" }).where(eq(userTable.id, userId));
    return c.json({ ok: true }, 200);
  })
  // Delete company (soft or hard)
  .delete("/companies/:id", async (c) => {
    const id = c.req.param("id");
    const body = await c.req.json();
    const mode = body.mode ?? "archive"; // archive | purge

    // Build snapshot
    const [co] = await db.select().from(companies).where(eq(companies.id, id));
    const snapshot = {
      company: co,
      tanks: await db.select().from(tanks).where(eq(tanks.companyId, id)),
      helicopters: await db.select().from(helicopters).where(eq(helicopters.companyId, id)),
      movements: await db.select().from(movements).where(eq(movements.companyId, id)),
      bases: await db.select().from(bases).where(eq(bases.companyId, id)),
      drainChecks: await db.select().from(drainChecks).where(eq(drainChecks.companyId, id)),
    };

    // Save backup
    try {
      mkdirSync("archived-companies", { recursive: true });
      writeFileSync(join("archived-companies", `${mode}-${id}-${Date.now()}.json`), JSON.stringify(snapshot, null, 2));
    } catch {}

    if (mode === "purge") {
      await db.delete(movements).where(eq(movements.companyId, id));
      await db.delete(drainChecks).where(eq(drainChecks.companyId, id));
      await db.delete(tanks).where(eq(tanks.companyId, id));
      await db.delete(helicopters).where(eq(helicopters.companyId, id));
      await db.delete(bases).where(eq(bases.companyId, id));
      await db.delete(inviteTokens).where(eq(inviteTokens.companyId, id));
      await db.update(userTable).set({ companyId: null }).where(eq(userTable.companyId, id));
      await db.delete(companies).where(eq(companies.id, id));
    } else {
      await db.update(companies).set({ archivedAt: Date.now(), status: "cancelled" }).where(eq(companies.id, id));
    }

    return c.json({ ok: true }, 200);
  })
  // List archived companies
  .get("/companies/archived", async (c) => {
    const rows = await db.select().from(companies).where(ne(companies.archivedAt, 0));
    return c.json(rows, 200);
  });

export default app;
