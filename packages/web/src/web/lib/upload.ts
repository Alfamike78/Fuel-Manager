import { authHeaders } from "../hooks/useAuth";

// Upload diretto su storage con URL presigned: il file va dal browser
// direttamente a Tigris, non passa dal nostro server.
async function presign(filename: string, contentType: string, folder: string) {
  const r = await fetch("/api/uploads/presign", {
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

/** Carica una foto (File da <input type="file">). Ritorna la key da salvare in DB. */
export async function uploadFile(file: File, folder = "drain-photos"): Promise<string> {
  const ct = file.type || "image/jpeg";
  const { url, key } = await presign(file.name || "photo.jpg", ct, folder);
  const put = await fetch(url, { method: "PUT", body: file, headers: { "Content-Type": ct } });
  if (!put.ok) throw new Error(`Upload foto fallito (HTTP ${put.status})`);
  return key;
}

/** Carica la firma come file SVG. Ritorna la key. */
export async function uploadSignatureSvg(svg: string, folder = "signatures"): Promise<string> {
  const { url, key } = await presign("firma.svg", "image/svg+xml", folder);
  const put = await fetch(url, { method: "PUT", body: svg, headers: { "Content-Type": "image/svg+xml" } });
  if (!put.ok) throw new Error(`Upload firma fallito (HTTP ${put.status})`);
  return key;
}

/** URL temporaneo (1h) per visualizzare un file salvato. */
export async function viewUrl(key: string): Promise<string> {
  const r = await fetch(`/api/uploads/view?key=${encodeURIComponent(key)}`, { headers: authHeaders() });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const b = (await r.json()) as { url: string };
  return b.url;
}

/** Converte i tratti (path SVG) in un file SVG standalone. */
export function pathsToSvg(paths: string[]): string {
  const body = paths
    .map((d) => `<path d="${d}" stroke="#1b3a5c" stroke-width="2" fill="none" stroke-linecap="round"/>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 140" width="300" height="140"><rect width="300" height="140" fill="#ffffff"/>${body}</svg>`;
}
