import { API_BASE, authHeaders } from "./api";

// Carica un file su Tigris con URL presigned: il binario va dal telefono
// direttamente allo storage, non passa dal nostro server.
async function presign(filename: string, contentType: string, folder: string) {
  const r = await fetch(`${API_BASE}/api/uploads/presign`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ filename, contentType, folder }),
  });
  if (!r.ok) {
    const e: any = await r.json().catch(() => ({}));
    throw new Error(e?.error ?? `Presign HTTP ${r.status}`);
  }
  return (await r.json()) as { url: string; key: string };
}

/** Carica una foto scattata con la fotocamera. Ritorna la key da salvare in DB. */
export async function uploadPhoto(uri: string, folder = "drain-photos"): Promise<string> {
  const ext = (uri.split(".").pop() ?? "jpg").split("?")[0].toLowerCase();
  const contentType = ext === "png" ? "image/png" : "image/jpeg";
  const { url, key } = await presign(`photo.${ext}`, contentType, folder);

  const res = await fetch(uri);
  const blob = await res.blob();
  const put = await fetch(url, { method: "PUT", body: blob, headers: { "Content-Type": contentType } });
  if (!put.ok) throw new Error(`Upload foto fallito (HTTP ${put.status})`);
  return key;
}

/** Carica la firma come immagine SVG. Ritorna la key. */
export async function uploadSignatureSvg(svg: string, folder = "signatures"): Promise<string> {
  const { url, key } = await presign("firma.svg", "image/svg+xml", folder);
  const put = await fetch(url, { method: "PUT", body: svg, headers: { "Content-Type": "image/svg+xml" } });
  if (!put.ok) throw new Error(`Upload firma fallito (HTTP ${put.status})`);
  return key;
}

/** URL temporaneo per visualizzare un file salvato (foto o firma). */
export async function viewUrl(key: string): Promise<string> {
  const r = await fetch(`${API_BASE}/api/uploads/view?key=${encodeURIComponent(key)}`, { headers: authHeaders() });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const b = (await r.json()) as { url: string };
  return b.url;
}
