import { useRef, useState } from "react";
import { uploadFile, uploadSignatureSvg, viewUrl, pathsToSvg } from "../lib/upload";
import { authHeaders } from "../hooks/useAuth";

export const SAMPLE_POINTS = [
  "Serbatoio principale",
  "Serbatoio ausiliario",
  "Sump / drenaggio serbatoio",
  "Sump ala sinistra",
  "Sump ala destra",
  "Filtro carburante / gascolator",
  "Altro",
];

const W = 300;
const H = 140;

// ── Firma a mano (mouse o dito) ───────────────────────────────────────────
export function SignaturePad({ paths, onChange, t }: { paths: string[]; onChange: (p: string[]) => void; t: any }) {
  const box = useRef<HTMLDivElement>(null);
  const drawing = useRef(false);
  const current = useRef("");
  const [live, setLive] = useState("");

  const pt = (e: React.PointerEvent) => {
    const r = box.current!.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W;
    const y = ((e.clientY - r.top) / r.height) * H;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  };

  return (
    <div>
      <div
        ref={box}
        onPointerDown={(e) => { drawing.current = true; current.current = `M${pt(e)}`; setLive(current.current); }}
        onPointerMove={(e) => { if (!drawing.current) return; current.current += ` L${pt(e)}`; setLive(current.current); }}
        onPointerUp={() => {
          drawing.current = false;
          if (current.current.includes("L")) onChange([...paths, current.current]);
          current.current = ""; setLive("");
        }}
        onPointerLeave={() => {
          if (!drawing.current) return;
          drawing.current = false;
          if (current.current.includes("L")) onChange([...paths, current.current]);
          current.current = ""; setLive("");
        }}
        style={{
          border: "1px solid var(--pc-border)", borderRadius: 8, background: "var(--pc-bg)",
          height: 140, touchAction: "none", cursor: "crosshair", position: "relative", overflow: "hidden",
        }}
      >
        {paths.length === 0 && !live && (
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "var(--pc-muted)", fontSize: "0.8rem", pointerEvents: "none" }}>
            ✍️ {t("signHere")}
          </div>
        )}
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "100%", display: "block" }}>
          {[...paths, live].filter(Boolean).map((d, i) => (
            <path key={i} d={d} stroke="var(--pc-text)" strokeWidth={2} fill="none" strokeLinecap="round" />
          ))}
        </svg>
      </div>
      <button type="button" onClick={() => onChange([])}
        style={{ background: "none", border: "none", color: "var(--pc-muted)", cursor: "pointer", fontSize: "0.75rem", marginTop: 4 }}>
        ✕ {t("clearSignature")}
      </button>
    </div>
  );
}

export function SignatureView({ signaturePath }: { signaturePath?: string | null }) {
  let paths: string[] = [];
  try { paths = signaturePath ? JSON.parse(signaturePath) : []; } catch { paths = []; }
  if (!paths.length) return null;
  return (
    <div style={{ border: "1px solid var(--pc-border)", borderRadius: 8, background: "var(--pc-bg)", maxWidth: 300 }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block" }}>
        {paths.map((d, i) => <path key={i} d={d} stroke="var(--pc-text)" strokeWidth={2} fill="none" strokeLinecap="round" />)}
      </svg>
    </div>
  );
}

// ── Modale drain check su mezzo aereo ─────────────────────────────────────
export function AircraftDrainModal({ aircraft, t, onClose, onSaved, Modal }: any) {
  const now = new Date();
  const [date, setDate] = useState(now.toISOString().split("T")[0]);
  const [time, setTime] = useState(now.toTimeString().slice(0, 5));
  const [samplePoint, setSamplePoint] = useState(SAMPLE_POINTS[0]);
  const [customPoint, setCustomPoint] = useState("");
  const [liters, setLiters] = useState("");
  const [quality, setQuality] = useState<"ok" | "water" | "impurities">("ok");
  const [notes, setNotes] = useState("");
  const [counter, setCounter] = useState<File | null>(null);
  const [sample, setSample] = useState<File | null>(null);
  const [sig, setSig] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sig.length) { alert(t("signatureRequired")); return; }
    const point = samplePoint === "Altro" ? customPoint.trim() : samplePoint;
    if (!point) { alert(t("specifyPoint")); return; }
    setSaving(true);
    try {
      let photoCounterKey: string | null = null;
      let photoSampleKey: string | null = null;
      if (counter) { setStep(t("uploading")); photoCounterKey = await uploadFile(counter); }
      if (sample) { setStep(t("uploading")); photoSampleKey = await uploadFile(sample); }
      const signatureKey = await uploadSignatureSvg(pathsToSvg(sig));
      const r = await fetch("/api/drain-checks", {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          helicopterId: aircraft.id, quality, liters: Number(liters || 0),
          notes: notes.trim() || null, date, time, samplePoint: point,
          photoCounterKey, photoSampleKey, signatureKey,
          signaturePath: JSON.stringify(sig), device: "web",
        }),
      });
      if (!r.ok) {
        const b: any = await r.json().catch(() => ({}));
        throw new Error(b?.error ?? `HTTP ${r.status}`);
      }
      onSaved();
      onClose();
    } catch (err: any) {
      alert(err?.message ?? "Errore");
    } finally {
      setSaving(false); setStep("");
    }
  };

  return (
    <Modal title={`🔍 ${t("aircraftDrainCheck")} — ${aircraft.identifier ?? aircraft.name}`} onClose={onClose}>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <div style={{ flex: 1 }}>
            <label>{t("date")}</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div style={{ width: 130 }}>
            <label>{t("time")}</label>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
          </div>
        </div>

        <div>
          <label>{t("samplePoint")}</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.25rem" }}>
            {SAMPLE_POINTS.map((p) => (
              <button key={p} type="button" onClick={() => setSamplePoint(p)}
                style={{
                  padding: "0.35rem 0.6rem", borderRadius: 16, cursor: "pointer", fontSize: "0.75rem",
                  border: "1px solid", borderColor: samplePoint === p ? "var(--pc-sand)" : "var(--pc-border)",
                  background: samplePoint === p ? "rgba(214,196,160,0.12)" : "transparent",
                  color: samplePoint === p ? "var(--pc-sand)" : "var(--pc-muted)",
                }}>
                {p}
              </button>
            ))}
          </div>
          {samplePoint === "Altro" && (
            <input value={customPoint} onChange={(e) => setCustomPoint(e.target.value)} placeholder={t("specifyPoint")} style={{ marginTop: "0.5rem" }} />
          )}
        </div>

        <div>
          <label>{t("liters")} (L)</label>
          <input type="number" min="0" step="0.1" value={liters} onChange={(e) => setLiters(e.target.value)} required />
        </div>

        <div>
          <label>{t("result")}</label>
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}>
            {(["ok", "water", "impurities"] as const).map((q) => {
              const col = q === "ok" ? "#22c55e" : q === "water" ? "#3b82f6" : "#ef4444";
              return (
                <button key={q} type="button" onClick={() => setQuality(q)}
                  style={{
                    flex: 1, padding: "0.5rem", borderRadius: 8, cursor: "pointer", fontSize: "0.8rem",
                    border: "1px solid", borderColor: quality === q ? col : "var(--pc-border)",
                    background: quality === q ? col + "1a" : "transparent",
                    color: quality === q ? col : "var(--pc-muted)",
                  }}>
                  {q === "ok" ? t("qualityOk") : q === "water" ? t("qualityWater") : t("qualityImpurities")}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label>📷 {t("photos")}</label>
          <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.25rem" }}>
            <PhotoInput label={t("photoCounter")} file={counter} onPick={setCounter} />
            <PhotoInput label={t("photoSample")} file={sample} onPick={setSample} />
          </div>
          {(!counter || !sample) && (
            <div style={{ color: "#f59e0b", fontSize: "0.75rem", marginTop: "0.4rem" }}>⚠︎ {t("photosOptionalWarning")}</div>
          )}
        </div>

        <div>
          <label>✍️ {t("signature")}</label>
          <SignaturePad paths={sig} onChange={setSig} t={t} />
        </div>

        <div>
          <label>{t("notes")}</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </div>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button type="button" onClick={onClose} className="btn btn-ghost" style={{ flex: 1 }}>{t("cancel")}</button>
          <button type="submit" disabled={saving} className="btn btn-primary" style={{ flex: 2 }}>
            {saving ? (step || t("loading")) : `🔒 ${t("signAndSave")}`}
          </button>
        </div>
        <div style={{ color: "var(--pc-muted)", fontSize: "0.7rem", textAlign: "center" }}>{t("sealHint")}</div>
      </form>
    </Modal>
  );
}

function PhotoInput({ label, file, onPick }: any) {
  const [preview, setPreview] = useState<string | null>(null);
  return (
    <label style={{
      flex: 1, height: 110, border: "1px dashed var(--pc-border)", borderRadius: 8, cursor: "pointer",
      display: "grid", placeItems: "center", color: "var(--pc-muted)", fontSize: "0.75rem", overflow: "hidden", textAlign: "center",
    }}>
      {preview ? <img src={preview} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span>📷 {label}</span>}
      <input type="file" accept="image/*" capture="environment" style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          onPick(f);
          setPreview(f ? URL.createObjectURL(f) : null);
        }} />
    </label>
  );
}

// ── Foto salvate (thumbnail con URL presigned) ────────────────────────────
export function DrainPhotos({ record, t }: any) {
  const [urls, setUrls] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const keys = [record.photoCounterKey, record.photoSampleKey].filter(Boolean) as string[];
  if (!keys.length) return null;
  if (!urls) {
    return (
      <button type="button" className="btn btn-ghost btn-sm" disabled={loading}
        onClick={async () => {
          setLoading(true);
          try { setUrls(await Promise.all(keys.map((k) => viewUrl(k)))); }
          catch (e: any) { alert(e?.message ?? "Errore"); }
          finally { setLoading(false); }
        }}>
        🖼 {loading ? t("loading") : t("viewPhotos")}
      </button>
    );
  }
  return (
    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
      {urls.map((u, i) => (
        <a key={i} href={u} target="_blank" rel="noreferrer">
          <img src={u} style={{ width: 120, height: 90, objectFit: "cover", borderRadius: 8, border: "1px solid var(--pc-border)" }} />
        </a>
      ))}
    </div>
  );
}

// ── Dettaglio record firmato + annullamento ───────────────────────────────
export function DrainDetailModal({ record, name, t, isAdmin, onClose, onVoided, Modal }: any) {
  const [reason, setReason] = useState("");
  const [voiding, setVoiding] = useState(false);
  const [showVoid, setShowVoid] = useState(false);

  const doVoid = async () => {
    if (reason.trim().length < 3) { alert(t("voidReasonRequired")); return; }
    setVoiding(true);
    try {
      const r = await fetch(`/api/drain-checks/${record.id}/void`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      if (!r.ok) {
        const b: any = await r.json().catch(() => ({}));
        throw new Error(b?.error ?? `HTTP ${r.status}`);
      }
      onVoided();
      onClose();
    } catch (e: any) {
      alert(e?.message ?? "Errore");
    } finally { setVoiding(false); }
  };

  const Row = ({ l, v }: any) => (
    <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", padding: "0.4rem 0", borderBottom: "1px solid var(--pc-border)" }}>
      <span style={{ color: "var(--pc-muted)", fontSize: "0.8rem" }}>{l}</span>
      <span style={{ fontSize: "0.85rem", fontWeight: 600, textAlign: "right" }}>{v}</span>
    </div>
  );

  return (
    <Modal title={`🔍 ${t("drainCheck")} — ${name ?? ""}`} onClose={onClose}>
      <Row l={`${t("date")} / ${t("time")}`} v={`${record.date} ${record.time}`} />
      {record.samplePoint && <Row l={t("samplePoint")} v={record.samplePoint} />}
      <Row l={t("liters")} v={`${record.liters} L`} />
      <Row l={t("result")} v={record.quality === "ok" ? t("qualityOk") : record.quality === "water" ? t("qualityWater") : t("qualityImpurities")} />
      {record.notes && <Row l={t("notes")} v={record.notes} />}
      {record.signedByName && (
        <Row l={t("signedBy")} v={`${record.signedByName}${record.signedAt ? ` · ${new Date(record.signedAt).toLocaleString()}` : ""}`} />
      )}
      {record.isIncomplete ? <div style={{ color: "#f59e0b", fontSize: "0.8rem", marginTop: "0.5rem" }}>⚠︎ {t("recordIncomplete")}</div> : null}
      {record.voidedAt ? <div style={{ color: "#ef4444", fontSize: "0.8rem", marginTop: "0.5rem" }}>✖ {t("voided")}: {record.voidReason}</div> : null}

      {record.signaturePath && (
        <div style={{ marginTop: "0.75rem" }}>
          <label>✍️ {t("signature")}</label>
          <SignatureView signaturePath={record.signaturePath} />
        </div>
      )}

      <div style={{ marginTop: "0.75rem" }}>
        <DrainPhotos record={record} t={t} />
      </div>

      {isAdmin && !record.voidedAt && (
        showVoid ? (
          <div style={{ marginTop: "1rem" }}>
            <label>{t("voidReason")}</label>
            <input value={reason} onChange={(e) => setReason(e.target.value)} />
            <button type="button" onClick={doVoid} disabled={voiding}
              style={{ width: "100%", marginTop: "0.5rem", padding: "0.7rem", borderRadius: 8, border: "none", background: "#ef4444", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
              {voiding ? t("loading") : `✖ ${t("voidRecord")}`}
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setShowVoid(true)}
            style={{ width: "100%", marginTop: "1rem", padding: "0.6rem", borderRadius: 8, background: "transparent", border: "1px solid rgba(239,68,68,0.4)", color: "#ef4444", cursor: "pointer" }}>
            ✖ {t("voidRecord")}
          </button>
        )
      )}
    </Modal>
  );
}
