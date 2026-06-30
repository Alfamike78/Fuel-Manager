import { Hono } from "hono";
import { db } from "../database";
import { companies, user as userTable, inviteTokens } from "../database/schema";
import { eq, and } from "drizzle-orm";
import { authMiddleware, requireAuth, requireAdmin, getCompanyId } from "../middleware";
import { randomUUID } from "crypto";
import { auth } from "../auth";

const app = new Hono()
  .use(authMiddleware)
  // GET own company info
  .get("/me", requireAuth, async (c) => {
    const cid = getCompanyId(c);
    if (!cid) return c.json(null, 200);
    const [co] = await db.select().from(companies).where(eq(companies.id, cid));
    return c.json(co ?? null, 200);
  })
  // PATCH own company settings
  .patch("/me", requireAdmin, async (c) => {
    const cid = getCompanyId(c);
    if (!cid) return c.json({ error: "No company" }, 400);
    const body = await c.req.json();
    const updates: any = {};
    const allowed = ["name", "brandName", "primaryColor", "bgColor", "logoUrl", "faviconUrl"];
    for (const k of allowed) {
      if (body[k] !== undefined) updates[k] = body[k];
    }
    await db.update(companies).set(updates).where(eq(companies.id, cid));
    const [updated] = await db.select().from(companies).where(eq(companies.id, cid));
    return c.json(updated, 200);
  })
  // GET company brand info (public - for invite page)
  .get("/brand", async (c) => {
    const token = c.req.query("token");
    if (!token) return c.json({ error: "No token" }, 400);
    const [invite] = await db.select().from(inviteTokens).where(eq(inviteTokens.token, token));
    if (!invite) return c.json({ error: "Invalid token" }, 404);
    const [co] = await db.select().from(companies).where(eq(companies.id, invite.companyId));
    if (!co) return c.json({ error: "Company not found" }, 404);
    return c.json({ name: co.name, brandName: co.brandName, primaryColor: co.primaryColor, logoUrl: co.logoUrl }, 200);
  })
  // GET users of my company
  .get("/me/users", requireAdmin, async (c) => {
    const cid = getCompanyId(c);
    if (!cid) return c.json({ error: "No company" }, 400);
    const users = await db.select({
      id: userTable.id, name: userTable.name, email: userTable.email, role: userTable.role,
    }).from(userTable).where(eq(userTable.companyId, cid));
    return c.json(users, 200);
  })
  // POST change email (no verify link)
  .post("/profile/email", requireAuth, async (c) => {
    const u = c.get("user") as any;
    const body = await c.req.json();
    const newEmail = body.email?.trim().toLowerCase();
    if (!newEmail) return c.json({ error: "Email required" }, 400);
    const [existing] = await db.select().from(userTable).where(eq(userTable.email, newEmail));
    if (existing && existing.id !== u.id) return c.json({ error: "Email già in uso" }, 409);
    await db.update(userTable).set({ email: newEmail }).where(eq(userTable.id, u.id));
    return c.json({ ok: true }, 200);
  })
  // POST self-register company (trial)
  .post("/register", async (c) => {
    const body = await c.req.json();
    const row = {
      id: randomUUID(),
      name: body.name,
      brandName: null as string | null,
      primaryColor: "#1b3a5c",
      bgColor: "#d6c4a0",
      faviconUrl: null as string | null,
      logoUrl: null as string | null,
      status: "trial",
      plan: "trial",
      trialEndsAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
      archivedAt: null as number | null,
      isInternal: 0,
      createdAt: Date.now(),
    };
    await db.insert(companies).values(row);
    return c.json(row, 201);
  })
  // POST link user to company after signup
  .post("/link", requireAuth, async (c) => {
    const u = c.get("user") as any;
    const body = await c.req.json();
    await db.update(userTable).set({ companyId: body.companyId, role: "admin" }).where(eq(userTable.id, u.id));
    return c.json({ ok: true }, 200);
  })
  // POST invite user
  .post("/me/invite", requireAdmin, async (c) => {
    const cid = getCompanyId(c);
    if (!cid) return c.json({ error: "No company" }, 400);
    const body = await c.req.json();
    const token = randomUUID().replace(/-/g, "");
    const row = {
      id: randomUUID(),
      token,
      companyId: cid,
      email: body.email ?? null,
      role: body.role ?? "operator",
      usedAt: null as number | null,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      createdAt: Date.now(),
    };
    await db.insert(inviteTokens).values(row);
    return c.json({ token, inviteUrl: `${process.env.WEBSITE_URL}?invite=${token}` }, 201);
  })
  // POST join via invite token (registration)
  .post("/invite/:token/join", async (c) => {
    const token = c.req.param("token");
    const body = await c.req.json();
    const [invite] = await db.select().from(inviteTokens).where(eq(inviteTokens.token, token));
    if (!invite || invite.usedAt || invite.expiresAt < Date.now()) {
      return c.json({ error: "Token non valido o scaduto" }, 400);
    }
    const result = await auth.api.signUpEmail({
      body: { name: body.name, email: body.email, password: body.password },
    });
    if (!result || !(result as any).user) return c.json({ error: "Registrazione fallita" }, 400);
    const newUser = (result as any).user;
    await db.update(userTable).set({ companyId: invite.companyId, role: invite.role ?? "operator" }).where(eq(userTable.id, newUser.id));
    await db.update(inviteTokens).set({ usedAt: Date.now() }).where(eq(inviteTokens.token, token));
    return c.json({ ok: true }, 200);
  });

export default app;
