import { Hono } from "hono";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3, S3_BUCKET } from "../lib/s3";
import { authMiddleware, requireAuth, getCompanyId } from "../middleware";

// Upload di foto/firme su Tigris tramite URL presigned: il file va dal client
// direttamente allo storage, non passa dal server.
const app = new Hono()
  .use(authMiddleware)
  // Chiede un URL per CARICARE un file. Ritorna anche la key da salvare in DB.
  .post("/presign", requireAuth, async (c) => {
    const cid = getCompanyId(c);
    if (!cid) return c.json({ error: "No company" }, 400);
    const body = (await c.req.json().catch(() => ({}))) as any;
    const filename = String(body.filename ?? "file.bin").replace(/[^a-zA-Z0-9._-]/g, "_");
    const contentType = String(body.contentType ?? "application/octet-stream");
    const folder = String(body.folder ?? "uploads").replace(/[^a-z0-9-]/gi, "");

    const key = `${cid}/${folder}/${Date.now()}-${filename}`;
    try {
      const url = await getSignedUrl(
        s3,
        new PutObjectCommand({ Bucket: S3_BUCKET, Key: key, ContentType: contentType }),
        { expiresIn: 900 },
      );
      return c.json({ url, key }, 200);
    } catch (e: any) {
      return c.json({ error: `Storage non disponibile: ${e?.message ?? "errore"}` }, 500);
    }
  })
  // Chiede un URL temporaneo per VISUALIZZARE un file. Solo file della propria azienda.
  .get("/view", requireAuth, async (c) => {
    const cid = getCompanyId(c);
    if (!cid) return c.json({ error: "No company" }, 400);
    const key = c.req.query("key");
    if (!key) return c.json({ error: "key mancante" }, 400);
    if (!key.startsWith(`${cid}/`)) return c.json({ error: "Accesso negato al file" }, 403);
    try {
      const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }), { expiresIn: 3600 });
      return c.json({ url }, 200);
    } catch (e: any) {
      return c.json({ error: `Storage non disponibile: ${e?.message ?? "errore"}` }, 500);
    }
  });

export default app;
