import { Hono } from "hono";
import { db } from "../database";
import { drainChecks, tanks, movements, helicopters } from "../database/schema";
import { eq, and, desc } from "drizzle-orm";
import { authMiddleware, requireAuth, requireAdmin, getCompanyId } from "../middleware";
import { randomUUID, createHash } from "crypto";

// Punti di prelievo ammessi per i mezzi aerei (l'ultimo consente testo libero).
export const SAMPLE_POINTS = [
  "Serbatoio principale",
  "Serbatoio ausiliario",
  "Sump / drenaggio serbatoio",
  "Sump ala sinistra",
  "Sump ala destra",
  "Filtro carburante / gascolator",
  "Altro",
] as const;

// Impronta del record sigillato: se qualcuno cambia un dato a posteriori,
// l'hash ricalcolato non coincide piu' e il record risulta alterato.
function sealHash(input: Record<string, unknown>) {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

const app = new Hono()
  .use(authMiddleware)
  .get("/", requireAuth, async (c) => {
    const cid = getCompanyId(c);
    if (!cid) return c.json({ error: "No company" }, 400);
    // ?target=tank|aircraft filtra il registro
    const target = c.req.query("target");
    const rows = await db
      .select()
      .from(drainChecks)
      .where(eq(drainChecks.companyId, cid))
      .orderBy(desc(drainChecks.createdAt))
      .limit(300);
    const filtered = target
      ? rows.filter((r) => (r.targetType ?? (r.helicopterId ? "aircraft" : "tank")) === target)
      : rows;
    return c.json(filtered, 200);
  })
  .post("/", requireAuth, async (c) => {
    const cid = getCompanyId(c);
    if (!cid) return c.json({ error: "No company" }, 400);
    const u = c.get("user") as any;
    const body = await c.req.json().catch(() => ({} as any));
    const liters = Number(body.liters ?? 0);
    const quality = body.quality; // ok|water|impurities
    if (!["ok", "water", "impurities"].includes(quality)) {
      return c.json({ error: "Esito non valido" }, 400);
    }
    const now = new Date();
    const targetType: "tank" | "aircraft" = body.helicopterId ? "aircraft" : "tank";

    if (targetType === "tank" && !body.tankId) {
      return c.json({ error: "Indica la cisterna o il mezzo su cui è stato fatto il drain check" }, 400);
    }

    // ── Drain check su MEZZO AEREO ────────────────────────────────────────
    let vehicle: any = null;
    if (targetType === "aircraft") {
      const [veh] = await db
        .select()
        .from(helicopters)
        .where(and(eq(helicopters.id, body.helicopterId), eq(helicopters.companyId, cid)));
      if (!veh) return c.json({ error: "Mezzo non trovato" }, 404);
      if ((veh.category ?? "aviation") !== "aviation") {
        return c.json({ error: "Il drain check è previsto solo per i mezzi aerei (elicotteri e aerei)" }, 400);
      }
      vehicle = veh;
      await db
        .update(helicopters)
        .set({
          lastDrainCheckQuality: quality,
          lastDrainCheckDate: body.date ?? now.toISOString().split("T")[0],
        })
        .where(eq(helicopters.id, veh.id));
    }

    // ── Drain check su CISTERNA: scala i litri spurgati ───────────────────
    if (targetType === "tank") {
      const [tank] = await db.select().from(tanks).where(and(eq(tanks.id, body.tankId), eq(tanks.companyId, cid)));
      if (!tank) return c.json({ error: "Tank not found" }, 404);
      const newLevel = Math.max(0, (tank.currentLevel ?? 0) - liters);
      await db.update(tanks).set({
        currentLevel: newLevel,
        lastDrainCheckQuality: quality,
        lastDrainCheckDate: body.date ?? now.toISOString().split("T")[0],
      }).where(eq(tanks.id, tank.id));
    }

    const photoCounterKey = body.photoCounterKey ?? null;
    const photoSampleKey = body.photoSampleKey ?? null;
    // Foto opzionali: se manca almeno una, il record e' valido ma "incompleto".
    const isIncomplete = photoCounterKey && photoSampleKey ? 0 : 1;

    const date = body.date ?? now.toISOString().split("T")[0];
    const time = body.time ?? now.toTimeString().slice(0, 5);
    const signedAt = Date.now();

    const base = {
      id: randomUUID(),
      tankId: targetType === "tank" ? body.tankId : null,
      helicopterId: targetType === "aircraft" ? body.helicopterId : null,
      liters,
      quality,
      notes: body.notes ?? null,
      photoUrl: null,
      targetType,
      samplePoint: body.samplePoint ?? null,
      photoCounterKey,
      photoSampleKey,
      isIncomplete,
      signatureKey: body.signatureKey ?? null,
      signaturePath: body.signaturePath ? String(body.signaturePath).slice(0, 20000) : null,
      signedByName: u.name ?? u.email,
      signedByEmail: u.email,
      signedAt,
      signedDevice: body.device ?? c.req.header("user-agent")?.slice(0, 120) ?? null,
      voidedAt: null,
      voidedBy: null,
      voidReason: null,
      operatorId: u.id,
      date,
      time,
      companyId: cid,
      createdAt: Date.now(),
    };

    const row = {
      ...base,
      integrityHash: sealHash({
        id: base.id,
        target: targetType,
        tankId: base.tankId,
        helicopterId: base.helicopterId,
        liters,
        quality,
        samplePoint: base.samplePoint,
        photoCounterKey,
        photoSampleKey,
        signaturePath: base.signaturePath,
        signedByEmail: base.signedByEmail,
        signedAt,
        date,
        time,
        companyId: cid,
      }),
    };

    await db.insert(drainChecks).values(row);

    // Registra anche il movimento (solo per le cisterne: i litri escono dalla cisterna)
    if (targetType === "tank" && liters > 0) {
      await db.insert(movements).values({
        id: randomUUID(),
        tankId: body.tankId,
        toTankId: null,
        helicopterId: null,
        type: "drain_check",
        liters,
        date: row.date,
        time: row.time,
        operatorId: u.id,
        notes: `Drain check — ${quality}${body.notes ? ": " + body.notes : ""}`,
        companyId: cid,
        createdAt: Date.now(),
      });
    }

    return c.json({ ...row, vehicleName: vehicle?.name ?? null }, 201);
  })
  // Verifica l'integrita' di un record firmato: ricalcola l'hash e lo confronta.
  .get("/:id/verify", requireAuth, async (c) => {
    const cid = getCompanyId(c);
    if (!cid) return c.json({ error: "No company" }, 400);
    const id = c.req.param("id");
    const [r] = await db.select().from(drainChecks).where(and(eq(drainChecks.id, id), eq(drainChecks.companyId, cid)));
    if (!r) return c.json({ error: "Record non trovato" }, 404);
    const recomputed = sealHash({
      id: r.id,
      target: r.targetType ?? (r.helicopterId ? "aircraft" : "tank"),
      tankId: r.tankId,
      helicopterId: r.helicopterId,
      liters: r.liters,
      quality: r.quality,
      samplePoint: r.samplePoint,
      photoCounterKey: r.photoCounterKey,
      photoSampleKey: r.photoSampleKey,
      signaturePath: r.signaturePath,
      signedByEmail: r.signedByEmail,
      signedAt: r.signedAt,
      date: r.date,
      time: r.time,
      companyId: r.companyId,
    });
    const valid = !!r.integrityHash && recomputed === r.integrityHash;
    return c.json({ id: r.id, valid, signedByName: r.signedByName, signedAt: r.signedAt, voidedAt: r.voidedAt }, 200);
  })
  // Un record firmato NON si modifica: si annulla indicando il motivo.
  .post("/:id/void", requireAdmin, async (c) => {
    const cid = getCompanyId(c);
    if (!cid) return c.json({ error: "No company" }, 400);
    const u = c.get("user") as any;
    const id = c.req.param("id");
    const body = await c.req.json().catch(() => ({} as any));
    const reason = String(body.reason ?? "").trim();
    if (reason.length < 3) return c.json({ error: "Indica il motivo dell'annullamento" }, 400);

    const [r] = await db.select().from(drainChecks).where(and(eq(drainChecks.id, id), eq(drainChecks.companyId, cid)));
    if (!r) return c.json({ error: "Record non trovato" }, 404);
    if (r.voidedAt) return c.json({ error: "Record già annullato" }, 400);

    await db
      .update(drainChecks)
      .set({ voidedAt: Date.now(), voidedBy: u.name ?? u.email, voidReason: reason })
      .where(and(eq(drainChecks.id, id), eq(drainChecks.companyId, cid)));

    // Se era l'ultimo check del mezzo, azzera lo stato allarme sul mezzo.
    if (r.helicopterId) {
      await db
        .update(helicopters)
        .set({ lastDrainCheckQuality: null, lastDrainCheckDate: null })
        .where(and(eq(helicopters.id, r.helicopterId), eq(helicopters.companyId, cid)));
    }
    return c.json({ ok: true }, 200);
  })
  // Modifica consentita solo su record NON firmati (retrocompatibilita' vecchi dati).
  .patch("/:id", requireAdmin, async (c) => {
    const cid = getCompanyId(c);
    if (!cid) return c.json({ error: "No company" }, 400);
    const id = c.req.param("id");
    const body = await c.req.json().catch(() => ({} as any));
    const [r] = await db.select().from(drainChecks).where(and(eq(drainChecks.id, id), eq(drainChecks.companyId, cid)));
    if (!r) return c.json({ error: "Record non trovato" }, 404);
    if (r.signedAt) {
      return c.json({
        error: "Questo drain check è firmato e non è modificabile. Puoi solo annullarlo indicando il motivo.",
        code: "SIGNED_IMMUTABLE",
      }, 403);
    }
    const updates: any = {};
    if (body.liters !== undefined) updates.liters = Number(body.liters);
    if (body.quality !== undefined) updates.quality = body.quality;
    if (body.notes !== undefined) updates.notes = body.notes ?? null;
    if (body.date !== undefined) updates.date = String(body.date);
    if (body.time !== undefined) updates.time = String(body.time);
    if (Object.keys(updates).length) {
      await db.update(drainChecks).set(updates).where(and(eq(drainChecks.id, id), eq(drainChecks.companyId, cid)));
    }
    const [updated] = await db.select().from(drainChecks).where(and(eq(drainChecks.id, id), eq(drainChecks.companyId, cid)));
    return c.json(updated, 200);
  })
  .delete("/:id", requireAdmin, async (c) => {
    const cid = getCompanyId(c);
    if (!cid) return c.json({ error: "No company" }, 400);
    const id = c.req.param("id");
    const [r] = await db.select().from(drainChecks).where(and(eq(drainChecks.id, id), eq(drainChecks.companyId, cid)));
    if (!r) return c.json({ error: "Record non trovato" }, 404);
    if (r.signedAt) {
      return c.json({
        error: "Un drain check firmato non può essere eliminato: usa l'annullamento con motivo.",
        code: "SIGNED_IMMUTABLE",
      }, 403);
    }
    await db.delete(drainChecks).where(and(eq(drainChecks.id, id), eq(drainChecks.companyId, cid)));
    return c.json({ ok: true }, 200);
  });

export default app;
