import { Context, Next } from "hono";
import { auth } from "./auth";
import { db } from "./database";
import { user as userTable, companies } from "./database/schema";
import { eq } from "drizzle-orm";

export async function authMiddleware(c: Context, next: Next) {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (session?.user) {
    // Always read fresh user from DB to bypass session cookie cache
    const [fresh] = await db.select().from(userTable).where(eq(userTable.id, session.user.id));
    c.set("user", fresh ?? session.user);
  } else {
    c.set("user", null);
  }
  c.set("session", session?.session ?? null);
  await next();
}

export async function requireAuth(c: Context, next: Next) {
  const u = c.get("user");
  if (!u) return c.json({ error: "Unauthorized" }, 401);
  await next();
}

export async function requireAdmin(c: Context, next: Next) {
  const u = c.get("user");
  if (!u) return c.json({ error: "Unauthorized" }, 401);
  const role = (u as any).role;
  if (role !== "admin" && role !== "superadmin") {
    return c.json({ error: "Forbidden" }, 403);
  }
  await next();
}

export async function requireSuperAdmin(c: Context, next: Next) {
  const u = c.get("user");
  if (!u) return c.json({ error: "Unauthorized" }, 401);
  const role = (u as any).role;
  if (role !== "superadmin") return c.json({ error: "Forbidden" }, 403);
  await next();
}

/** Returns the effective companyId: from impersonation header or user's own */
export function getCompanyId(c: Context): string | null {
  const u = c.get("user") as any;
  if (!u) return null;
  const impersonated = c.req.header("X-Company-Id");
  if (impersonated && u.role === "superadmin") return impersonated;
  return u.companyId ?? null;
}
