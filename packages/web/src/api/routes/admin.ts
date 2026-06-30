import { Hono } from "hono";
import { db } from "../database";
import { user as userTable } from "../database/schema";
import { eq } from "drizzle-orm";
import { authMiddleware, requireAuth, getCompanyId } from "../middleware";

const app = new Hono()
  .use(authMiddleware)
  .get("/me/role", requireAuth, async (c) => {
    const u = c.get("user") as any;
    // Always read fresh from DB (session may be cookie-cached with stale role)
    const [fresh] = await db.select().from(userTable).where(eq(userTable.id, u.id));
    const cid = getCompanyId(c) ?? fresh?.companyId ?? null;
    return c.json({
      role: fresh?.role ?? u.role,
      companyId: cid,
      name: fresh?.name ?? u.name,
      email: fresh?.email ?? u.email,
      id: u.id,
    }, 200);
  });

export default app;
