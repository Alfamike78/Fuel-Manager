import { Hono } from "hono";
import { cors } from "hono/cors";
import { auth } from "./auth";
import { authMiddleware } from "./middleware";
import tanksRouter from "./routes/tanks";
import helicoptersRouter from "./routes/helicopters";
import movementsRouter from "./routes/movements";
import drainChecksRouter from "./routes/drain-checks";
import basesRouter from "./routes/bases";
import companiesRouter from "./routes/companies";
import superadminRouter from "./routes/superadmin";
import adminRouter from "./routes/admin";
import importsRouter from "./routes/imports";

const app = new Hono()
  .basePath("api")
  .use(cors({ origin: (origin) => origin ?? "*", credentials: true, exposeHeaders: ["set-auth-token"] }))
  .use(authMiddleware)
  .on(["GET", "POST", "PUT", "PATCH", "DELETE"], "/auth/*", (c) => auth.handler(c.req.raw))
  .get("/ping", (c) => c.json({ message: `Pong! ${Date.now()}` }, 200))
  .get("/health", (c) => c.json({ status: "ok" }, 200))
  .route("/admin", adminRouter)
  .route("/tanks", tanksRouter)
  .route("/helicopters", helicoptersRouter)
  .route("/movements", movementsRouter)
  .route("/drain-checks", drainChecksRouter)
  .route("/bases", basesRouter)
  .route("/companies", companiesRouter)
  .route("/superadmin", superadminRouter)
  .route("/imports", importsRouter);

export type AppType = typeof app;
export default app;
