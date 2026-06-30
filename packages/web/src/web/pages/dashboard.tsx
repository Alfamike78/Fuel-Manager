import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMe, useAuth, getImpersonatedCompanyId, getImpersonatedCompanyName, clearImpersonation, authHeaders } from "../hooks/useAuth";
import { useLang } from "../hooks/useLang";
import { Lang } from "../i18n/translations";
import { FUEL_TYPES, getFuelColor, AVIATION_TYPES, GROUND_TYPES } from "../lib/fuel-types";
import { useLocation } from "wouter";

const LANGS: { code: Lang; flag: string }[] = [
  { code: "it", flag: "🇮🇹" }, { code: "en", flag: "🇬🇧" }, { code: "fr", flag: "🇫🇷" },
  { code: "de", flag: "🇩🇪" }, { code: "es", flag: "🇪🇸" }, { code: "tr", flag: "🇹🇷" },
];

type Tab = "dashboard" | "history" | "config" | "drainlog";

// ── API helpers ────────────────────────────────────────────────────────────
const ah = () => authHeaders();
const get = (url: string) => fetch(url, { credentials: "include", headers: ah() }).then((r) => r.json());
const post = (url: string, body: any) => fetch(url, { method: "POST", credentials: "include", headers: ah(), body: JSON.stringify(body) });
const patch = (url: string, body: any) => fetch(url, { method: "PATCH", credentials: "include", headers: ah(), body: JSON.stringify(body) });
const del = (url: string, body?: any) => fetch(url, { method: "DELETE", credentials: "include", headers: ah(), body: body ? JSON.stringify(body) : undefined });

// ── Sub-components ─────────────────────────────────────────────────────────

function FuelBar({ level, capacity, alert }: { level: number; capacity: number; alert: number }) {
  const pct = Math.min(100, (level / capacity) * 100);
  const color = level <= alert ? "#ef4444" : level <= alert * 1.5 ? "#f59e0b" : "#22c55e";
  return (
    <div className="fuel-bar" style={{ marginTop: 6 }}>
      <div className="fuel-bar-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <h3 style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--pc-sand)" }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--pc-muted)", cursor: "pointer", fontSize: "1.25rem" }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Accordion({ title, icon, children, defaultOpen = false }: { title: string; icon?: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card" style={{ marginBottom: "1rem" }}>
      <div className="accordion-header" onClick={() => setOpen(!open)}>
        <span style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {icon} {title}
        </span>
        <span style={{ transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0deg)", color: "var(--pc-muted)" }}>▼</span>
      </div>
      {open && <div style={{ marginTop: "1rem" }}>{children}</div>}
    </div>
  );
}

// ── Movement types ─────────────────────────────────────────────────────────
const MOV_TYPES = ["refuel", "consumption", "transfer", "drain_check"] as const;
type MovType = typeof MOV_TYPES[number];

const movColor = (type: string) => {
  switch (type) {
    case "refuel": return "#22c55e";
    case "consumption": return "#f59e0b";
    case "transfer": return "#3b82f6";
    case "drain_check": return "#8b5cf6";
    default: return "var(--pc-muted)";
  }
};

const movIcon = (type: string) => {
  switch (type) {
    case "refuel": return "⬆️";
    case "consumption": return "⬇️";
    case "transfer": return "↔️";
    case "drain_check": return "🔍";
    default: return "•";
  }
};

// ── New Movement Modal ─────────────────────────────────────────────────────
function NewMovementModal({ tanks, helicopters, onClose, onSave, t }: any) {
  const now = new Date();
  const [form, setForm] = useState({
    type: "consumption" as MovType,
    tankId: "",
    toTankId: "",
    helicopterId: "",
    liters: "",
    date: now.toISOString().split("T")[0],
    time: now.toTimeString().slice(0, 5),
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const selectedTank = tanks.find((t: any) => t.id === form.tankId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={`${movIcon(form.type)} ${t("newMovement")}`} onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <div>
          <label>{t("date")}</label>
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
        </div>
        <div>
          <label>{t("time")}</label>
          <input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} required />
        </div>
        <div>
          <label>Tipo</label>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {MOV_TYPES.map((mt) => (
              <button key={mt} type="button"
                onClick={() => setForm({ ...form, type: mt })}
                style={{
                  padding: "0.35rem 0.75rem", borderRadius: 6, fontSize: "0.8rem", cursor: "pointer",
                  border: "1px solid", borderColor: form.type === mt ? movColor(mt) : "var(--pc-border)",
                  background: form.type === mt ? `${movColor(mt)}22` : "transparent",
                  color: form.type === mt ? movColor(mt) : "var(--pc-muted)",
                }}
              >
                {movIcon(mt)} {t(mt as any)}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label>{t("tank")}</label>
          <select value={form.tankId} onChange={(e) => setForm({ ...form, tankId: e.target.value })} required>
            <option value="">— seleziona —</option>
            {tanks.map((tk: any) => (
              <option key={tk.id} value={tk.id}>{tk.name} ({tk.currentLevel}L / {tk.capacity}L) [{tk.fuelType}]</option>
            ))}
          </select>
        </div>
        {form.type === "transfer" && (
          <div>
            <label>Cisterna Destinazione</label>
            <select value={form.toTankId} onChange={(e) => setForm({ ...form, toTankId: e.target.value })} required>
              <option value="">— seleziona —</option>
              {tanks.filter((tk: any) => tk.id !== form.tankId && (!selectedTank || tk.fuelType === selectedTank.fuelType)).map((tk: any) => (
                <option key={tk.id} value={tk.id}>{tk.name}</option>
              ))}
            </select>
          </div>
        )}
        {form.type === "consumption" && (
          <div>
            <label>Mezzo</label>
            <select value={form.helicopterId} onChange={(e) => setForm({ ...form, helicopterId: e.target.value })}>
              <option value="">— seleziona (opzionale) —</option>
              {helicopters.map((h: any) => (
                <option key={h.id} value={h.id}>
                  {h.category === "aviation" ? "🚁" : "🚜"} {h.vehicleType ?? "Mezzo"} {h.identifier ?? h.name} — {h.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label>{t("liters")} (L)</label>
          <input type="number" min="0.1" step="0.1" value={form.liters}
            onChange={(e) => setForm({ ...form, liters: e.target.value })} required />
        </div>
        <div>
          <label>{t("notes")}</label>
          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
        </div>
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
          <button type="button" onClick={onClose} className="btn btn-ghost" style={{ flex: 1 }}>{t("cancel")}</button>
          <button type="submit" disabled={saving} className="btn btn-primary" style={{ flex: 2 }}>
            {saving ? t("loading") : t("save")}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Drain Check Modal ──────────────────────────────────────────────────────
function DrainCheckModal({ tank, helicopter, onClose, onSave, t }: any) {
  const now = new Date();
  const [form, setForm] = useState({
    tankId: tank?.id ?? null,
    helicopterId: helicopter?.id ?? null,
    liters: "",
    quality: "ok" as "ok" | "water" | "impurities",
    notes: "",
    date: now.toISOString().split("T")[0],
    time: now.toTimeString().slice(0, 5),
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={`🔍 Drain Check — ${tank?.name ?? helicopter?.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <div>
          <label>{t("date")}</label>
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
        </div>
        <div>
          <label>{t("time")}</label>
          <input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} required />
        </div>
        <div>
          <label>{t("liters")} spurgati (L)</label>
          <input type="number" min="0" step="0.1" value={form.liters}
            onChange={(e) => setForm({ ...form, liters: e.target.value })} required />
        </div>
        <div>
          <label>{t("quality")}</label>
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}>
            {(["ok", "water", "impurities"] as const).map((q) => (
              <button key={q} type="button"
                onClick={() => setForm({ ...form, quality: q })}
                style={{
                  flex: 1, padding: "0.5rem", borderRadius: 8, cursor: "pointer", fontSize: "0.8rem",
                  border: "1px solid",
                  borderColor: form.quality === q
                    ? (q === "ok" ? "#22c55e" : q === "water" ? "#3b82f6" : "#ef4444")
                    : "var(--pc-border)",
                  background: form.quality === q
                    ? (q === "ok" ? "rgba(34,197,94,0.1)" : q === "water" ? "rgba(59,130,246,0.1)" : "rgba(239,68,68,0.1)")
                    : "transparent",
                  color: form.quality === q
                    ? (q === "ok" ? "#22c55e" : q === "water" ? "#3b82f6" : "#ef4444")
                    : "var(--pc-muted)",
                }}
              >
                {q === "ok" ? "✅ Regolare" : q === "water" ? "💧 Acqua" : "🔴 Impurità"}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label>{t("notes")}</label>
          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
        </div>
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
          <button type="button" onClick={onClose} className="btn btn-ghost" style={{ flex: 1 }}>{t("cancel")}</button>
          <button type="submit" disabled={saving} className="btn btn-primary" style={{ flex: 2 }}>
            {saving ? t("loading") : "Registra Drain Check"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Tank Form Modal ────────────────────────────────────────────────────────
function TankModal({ tank, bases, onClose, onSave, t, isSuperAdmin }: any) {
  const [form, setForm] = useState({
    name: tank?.name ?? "",
    capacity: tank?.capacity ?? "",
    currentLevel: tank?.currentLevel ?? "",
    fuelType: tank?.fuelType ?? "Jet-A1",
    baseId: tank?.baseId ?? "",
    alertThreshold: tank?.alertThreshold ?? 1500,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try { await onSave(form); onClose(); } catch (err: any) { alert(err.message); } finally { setSaving(false); }
  };

  return (
    <Modal title={tank ? `Modifica ${tank.name}` : "Nuova Cisterna"} onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <div>
          <label>Nome</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div>
          <label>{t("capacity")}</label>
          <input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} required />
        </div>
        <div>
          <label>{t("currentLevel")}</label>
          <input type="number" value={form.currentLevel} onChange={(e) => setForm({ ...form, currentLevel: e.target.value })} />
        </div>
        <div>
          <label>{t("fuelType")} {!isSuperAdmin && tank && <span style={{ color: "var(--pc-muted)" }}>🔒 (solo superadmin)</span>}</label>
          {isSuperAdmin || !tank ? (
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.25rem" }}>
              {FUEL_TYPES.map((f) => (
                <button key={f.value} type="button"
                  onClick={() => setForm({ ...form, fuelType: f.value })}
                  style={{
                    padding: "0.35rem 0.75rem", borderRadius: 999, fontSize: "0.75rem", cursor: "pointer",
                    border: "1px solid", borderColor: form.fuelType === f.value ? f.color : "var(--pc-border)",
                    background: form.fuelType === f.value ? `${f.color}33` : "transparent",
                    color: form.fuelType === f.value ? f.color : "var(--pc-muted)",
                  }}
                >{f.label}</button>
              ))}
            </div>
          ) : (
            <div style={{ color: "var(--pc-text)", fontWeight: 600, marginTop: "0.25rem" }}>{form.fuelType}</div>
          )}
        </div>
        <div>
          <label>{t("alertThreshold")}</label>
          <input type="number" value={form.alertThreshold} onChange={(e) => setForm({ ...form, alertThreshold: Number(e.target.value) })} />
        </div>
        <div>
          <label>{t("base")}</label>
          <select value={form.baseId} onChange={(e) => setForm({ ...form, baseId: e.target.value })}>
            <option value="">— nessuna —</option>
            {bases.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
          <button type="button" onClick={onClose} className="btn btn-ghost" style={{ flex: 1 }}>{t("cancel")}</button>
          <button type="submit" disabled={saving} className="btn btn-primary" style={{ flex: 2 }}>{saving ? t("loading") : t("save")}</button>
        </div>
      </form>
    </Modal>
  );
}

// ── Vehicle Modal ──────────────────────────────────────────────────────────
function VehicleModal({ vehicle, onClose, onSave, t }: any) {
  const [category, setCategory] = useState<"aviation" | "ground">(vehicle?.category ?? "aviation");
  const [form, setForm] = useState({
    name: vehicle?.name ?? "",
    identifier: vehicle?.identifier ?? "",
    model: vehicle?.model ?? "",
    capacity: vehicle?.capacity ?? "",
    vehicleType: vehicle?.vehicleType ?? "Elicottero",
    customType: "",
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const vt = form.vehicleType === "Altro" ? form.customType : form.vehicleType;
      await onSave({ ...form, category, vehicleType: vt });
      onClose();
    } catch (err: any) { alert(err.message); } finally { setSaving(false); }
  };

  return (
    <Modal title={vehicle ? `Modifica ${vehicle.name}` : "Aggiungi Mezzo"} onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <div>
          <label>Categoria</label>
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}>
            {(["aviation", "ground"] as const).map((cat) => (
              <button key={cat} type="button" onClick={() => { setCategory(cat); setForm({ ...form, vehicleType: cat === "aviation" ? "Elicottero" : "Auto" }); }}
                style={{
                  flex: 1, padding: "0.5rem", borderRadius: 8, cursor: "pointer",
                  border: "1px solid", borderColor: category === cat ? "var(--pc-sand)" : "var(--pc-border)",
                  background: category === cat ? "rgba(214,196,160,0.1)" : "transparent",
                  color: category === cat ? "var(--pc-sand)" : "var(--pc-muted)",
                }}
              >
                {cat === "aviation" ? "✈️ Aviazione" : "🚜 Terrestre"}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label>Tipo</label>
          <select value={form.vehicleType} onChange={(e) => setForm({ ...form, vehicleType: e.target.value })}>
            {(category === "aviation" ? AVIATION_TYPES : GROUND_TYPES).map((vt) => (
              <option key={vt} value={vt}>{vt}</option>
            ))}
          </select>
        </div>
        {form.vehicleType === "Altro" && (
          <div>
            <label>Specifica tipo</label>
            <input value={form.customType} onChange={(e) => setForm({ ...form, customType: e.target.value })} required />
          </div>
        )}
        <div>
          <label>Nome / Descrizione</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div>
          <label>{category === "aviation" ? "Identificativo (es. I-PGVV)" : "Targa"}</label>
          <input value={form.identifier} onChange={(e) => setForm({ ...form, identifier: e.target.value })} />
        </div>
        {category === "aviation" && (
          <div>
            <label>{t("model")}</label>
            <input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
          </div>
        )}
        <div>
          <label>Capacità serbatoio (L, opzionale)</label>
          <input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
        </div>
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
          <button type="button" onClick={onClose} className="btn btn-ghost" style={{ flex: 1 }}>{t("cancel")}</button>
          <button type="submit" disabled={saving} className="btn btn-primary" style={{ flex: 2 }}>{saving ? t("loading") : t("save")}</button>
        </div>
      </form>
    </Modal>
  );
}

// ── Profile Modal ──────────────────────────────────────────────────────────
function ProfileModal({ me, onClose, t }: any) {
  const [tab, setTab] = useState<"email" | "password">("email");
  const [email, setEmail] = useState(me.email ?? "");
  const [pw, setPw] = useState({ current: "", next: "" });
  const [msg, setMsg] = useState("");

  const saveEmail = async () => {
    const res = await fetch("/api/companies/profile/email", {
      method: "POST", credentials: "include", headers: authHeaders(),
      body: JSON.stringify({ email }),
    });
    setMsg(res.ok ? "Email aggiornata ✓" : "Errore");
  };

  const savePassword = async () => {
    const res = await fetch("/api/auth/change-password", {
      method: "POST", credentials: "include", headers: authHeaders(),
      body: JSON.stringify({ currentPassword: pw.current, newPassword: pw.next }),
    });
    setMsg(res.ok ? "Password aggiornata ✓" : "Errore");
  };

  return (
    <Modal title={`👤 ${me.name}`} onClose={onClose}>
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        {(["email", "password"] as const).map((tb) => (
          <button key={tb} onClick={() => { setTab(tb); setMsg(""); }}
            style={{
              flex: 1, padding: "0.4rem", borderRadius: 6, cursor: "pointer", fontSize: "0.8rem",
              border: "1px solid", borderColor: tab === tb ? "var(--pc-sand)" : "var(--pc-border)",
              background: tab === tb ? "rgba(214,196,160,0.1)" : "transparent",
              color: tab === tb ? "var(--pc-sand)" : "var(--pc-muted)",
            }}
          >{tb === "email" ? "Cambia Email" : "Cambia Password"}</button>
        ))}
      </div>
      {tab === "email" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div><label>Nuova email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <button onClick={saveEmail} className="btn btn-primary">{t("save")}</button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div><label>Password attuale</label><input type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} /></div>
          <div><label>Nuova password</label><input type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></div>
          <button onClick={savePassword} className="btn btn-primary">{t("save")}</button>
        </div>
      )}
      {msg && <div style={{ marginTop: "0.75rem", color: "#22c55e", fontSize: "0.875rem" }}>{msg}</div>}
    </Modal>
  );
}

// ── MAIN DASHBOARD ─────────────────────────────────────────────────────────
export default function Dashboard() {
  const { t, lang, changeLang } = useLang();
  const { data: me, isLoading: meLoading } = useMe();
  const { logout } = useAuth();
  const qc = useQueryClient();
  const [, setLocation] = useLocation();

  const [tab, setTab] = useState<Tab>("dashboard");
  const [modal, setModal] = useState<null | "newMovement" | "drainTank" | "drainHeli" | "newTank" | "editTank" | "newVehicle" | "editVehicle" | "profile">(null);
  const [selected, setSelected] = useState<any>(null);
  const [showProfile, setShowProfile] = useState(false);

  const impCompanyId = getImpersonatedCompanyId();
  const impCompanyName = getImpersonatedCompanyName();
  const isImpersonating = !!impCompanyId;
  const isSuperAdmin = (me as any)?.role === "superadmin";
  const isAdmin = (me as any)?.role === "admin" || isSuperAdmin;

  // Redirect superadmin without impersonation to /superadmin
  useEffect(() => {
    if (!meLoading && me && isSuperAdmin && !impCompanyId) {
      setLocation("/superadmin");
    }
  }, [me, meLoading, isSuperAdmin, impCompanyId]);

  // Data queries
  const { data: company } = useQuery({ queryKey: ["company"], queryFn: () => get("/api/companies/me"), enabled: !!me });
  const { data: tanks = [] } = useQuery({ queryKey: ["tanks"], queryFn: () => get("/api/tanks"), enabled: !!me, refetchInterval: 30_000 });
  const { data: helicopters = [] } = useQuery({ queryKey: ["helicopters"], queryFn: () => get("/api/helicopters"), enabled: !!me });
  const { data: movements = [] } = useQuery({ queryKey: ["movements"], queryFn: () => get("/api/movements"), enabled: !!me });
  const { data: drainChecks = [] } = useQuery({ queryKey: ["drainChecks"], queryFn: () => get("/api/drain-checks"), enabled: !!me });
  const { data: bases = [] } = useQuery({ queryKey: ["bases"], queryFn: () => get("/api/bases"), enabled: !!me });

  const refetchAll = () => {
    qc.invalidateQueries({ queryKey: ["tanks"] });
    qc.invalidateQueries({ queryKey: ["movements"] });
    qc.invalidateQueries({ queryKey: ["drainChecks"] });
  };

  // Check trial
  const trialDaysLeft = company?.trialEndsAt
    ? Math.max(0, Math.ceil((company.trialEndsAt - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;
  const trialExpired = company?.plan === "trial" && trialDaysLeft !== null && trialDaysLeft <= 0;
  const trialSoon = company?.plan === "trial" && trialDaysLeft !== null && trialDaysLeft <= 7 && trialDaysLeft > 0;

  // Alerts
  const lowTanks = (tanks as any[]).filter((tk: any) => (tk.currentLevel ?? 0) <= (tk.alertThreshold ?? 1500));
  const alertTanks = (tanks as any[]).filter((tk: any) => tk.lastDrainCheckQuality && tk.lastDrainCheckQuality !== "ok");

  if (meLoading) {
    return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", color: "var(--pc-muted)" }}>Caricamento...</div>;
  }

  if (!me) {
    setLocation("/");
    return null;
  }

  const handleSaveMovement = async (form: any) => {
    const res = await post("/api/movements", form);
    if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? "Errore"); }
    refetchAll();
  };

  const handleDrainCheck = async (form: any) => {
    const res = await post("/api/drain-checks", form);
    if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? "Errore"); }
    refetchAll();
  };

  const handleSaveTank = async (form: any) => {
    let res;
    if (selected?.id) {
      res = await patch(`/api/tanks/${selected.id}`, form);
    } else {
      res = await post("/api/tanks", form);
    }
    if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? "Errore"); }
    qc.invalidateQueries({ queryKey: ["tanks"] });
  };

  const handleDeleteTank = async (id: string) => {
    if (!confirm("Eliminare questa cisterna?")) return;
    await del(`/api/tanks/${id}`);
    qc.invalidateQueries({ queryKey: ["tanks"] });
  };

  const handleSaveVehicle = async (form: any) => {
    let res;
    if (selected?.id) {
      res = await patch(`/api/helicopters/${selected.id}`, form);
    } else {
      res = await post("/api/helicopters", form);
    }
    if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? "Errore"); }
    qc.invalidateQueries({ queryKey: ["helicopters"] });
  };

  const handleDeleteVehicle = async (id: string) => {
    if (!confirm("Eliminare questo mezzo?")) return;
    await del(`/api/helicopters/${id}`);
    qc.invalidateQueries({ queryKey: ["helicopters"] });
  };

  const brandColor = company?.primaryColor ?? "#1b3a5c";
  const aviationFleet = (helicopters as any[]).filter((h: any) => h.category === "aviation");
  const groundFleet = (helicopters as any[]).filter((h: any) => h.category === "ground");
  const recentMovements = (movements as any[]).slice(0, 20);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Impersonation banner */}
      {isImpersonating && (
        <div className="alert-banner alert-banner-orange" style={{ borderRadius: 0, margin: 0 }}>
          <span>🔐 Stai operando come <strong>{impCompanyName}</strong></span>
          <button onClick={() => { clearImpersonation(); qc.clear(); setLocation("/superadmin"); }}
            style={{ marginLeft: "auto", background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 4, padding: "0.25rem 0.75rem", cursor: "pointer", color: "inherit" }}>
            ✕ ESCI
          </button>
        </div>
      )}

      {/* Trial banners */}
      {trialExpired && (
        <div className="alert-banner alert-banner-danger" style={{ borderRadius: 0, margin: 0 }}>
          🚫 {t("trialExpired")}
        </div>
      )}
      {trialSoon && (
        <div className="alert-banner alert-banner-warning" style={{ borderRadius: 0, margin: 0 }}>
          ⏳ {t("trialExpiresSoon")} {trialDaysLeft} {t("days")}
        </div>
      )}

      {/* Header */}
      <header style={{
        background: "var(--pc-card)", borderBottom: "1px solid var(--pc-border)",
        padding: "0.75rem 1.5rem", display: "flex", alignItems: "center", gap: "1rem",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: 1 }}>
          {company?.logoUrl ? (
            <img src={company.logoUrl} alt="" style={{ height: 32 }} />
          ) : (
            <div style={{ fontSize: 24 }}>🚁</div>
          )}
          <div>
            <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--pc-sand)" }}>
              {company?.brandName ?? company?.name ?? "PilotCraft"}
            </div>
            <div style={{ fontSize: "0.65rem", color: "var(--pc-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Fuel Manager</div>
          </div>
        </div>

        {/* Tabs */}
        <nav style={{ display: "flex", gap: "0.25rem" }}>
          {(["dashboard", "history", "config", "drainlog"] as Tab[]).map((tb) => (
            <button key={tb} onClick={() => setTab(tb)}
              style={{
                padding: "0.4rem 0.75rem", borderRadius: 6, fontSize: "0.8rem", cursor: "pointer",
                border: "1px solid", borderColor: tab === tb ? brandColor : "transparent",
                background: tab === tb ? `${brandColor}22` : "transparent",
                color: tab === tb ? "var(--pc-sand)" : "var(--pc-muted)",
                fontWeight: tab === tb ? 600 : 400,
              }}
            >
              {tb === "dashboard" ? "📊 " + t("dashboard") :
               tb === "history" ? "📋 " + t("history") :
               tb === "config" ? "⚙️ " + t("config") : "🔍 Drain Log"}
            </button>
          ))}
        </nav>

        {/* Lang + user */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <select
            value={lang}
            onChange={(e) => changeLang(e.target.value as Lang)}
            style={{ width: "auto", padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
          >
            {LANGS.map((l) => <option key={l.code} value={l.code}>{l.flag}</option>)}
          </select>
          <button onClick={() => setShowProfile(true)}
            style={{ background: "none", border: "none", color: "var(--pc-sand)", cursor: "pointer", fontSize: "0.875rem", fontWeight: 600 }}>
            👤 {(me as any)?.name?.split(" ")[0]}
          </button>
          <button onClick={() => logout.mutate()} className="btn btn-ghost btn-sm">{t("logout")}</button>
        </div>
      </header>

      {/* Main content */}
      <main style={{ flex: 1, padding: "1.5rem", maxWidth: 1200, margin: "0 auto", width: "100%" }}>

        {/* Alerts */}
        {lowTanks.length > 0 && (
          <div className="alert-banner alert-banner-warning">
            ⚠️ Livello basso: {lowTanks.map((t: any) => `${t.name} (${t.currentLevel}L)`).join(", ")}
          </div>
        )}
        {alertTanks.length > 0 && (
          <div className="alert-banner alert-banner-danger">
            🔴 Anomalia carburante: {alertTanks.map((t: any) => `${t.name} (${t.lastDrainCheckQuality})`).join(", ")}
          </div>
        )}

        {/* ── DASHBOARD TAB ── */}
        {tab === "dashboard" && (
          <div>
            {/* Action bar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h1 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--pc-sand)" }}>
                {t("dashboard")}
              </h1>
              <button onClick={() => setModal("newMovement")} className="btn btn-primary">
                ⚡ {t("newMovement")}
              </button>
            </div>

            {/* Tanks grid */}
            <h2 style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--pc-muted)", marginBottom: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {t("tanks")} ({(tanks as any[]).length})
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
              {(tanks as any[]).map((tank: any) => {
                const pct = Math.round((tank.currentLevel / tank.capacity) * 100);
                const isLow = tank.currentLevel <= (tank.alertThreshold ?? 1500);
                const hasAlert = tank.lastDrainCheckQuality && tank.lastDrainCheckQuality !== "ok";
                const fc = getFuelColor(tank.fuelType);
                return (
                  <div key={tank.id} className="card" style={{ borderColor: isLow ? "rgba(239,68,68,0.3)" : "var(--pc-border)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                      <div>
                        <div style={{ fontWeight: 700, color: "var(--pc-text)" }}>{tank.name}</div>
                        <span style={{ fontSize: "0.7rem", padding: "0.1rem 0.5rem", borderRadius: 999, background: `${fc}33`, color: fc, fontWeight: 600 }}>
                          ⛽ {tank.fuelType}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: "0.25rem" }}>
                        <button onClick={() => { setSelected(tank); setModal("drainTank"); }}
                          style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.3)", color: "#8b5cf6", borderRadius: 6, padding: "0.25rem 0.5rem", cursor: "pointer", fontSize: "0.75rem" }}>
                          🔍
                        </button>
                        {isAdmin && (
                          <>
                            <button onClick={() => { setSelected(tank); setModal("editTank"); }}
                              style={{ background: "transparent", border: "1px solid var(--pc-border)", color: "var(--pc-muted)", borderRadius: 6, padding: "0.25rem 0.5rem", cursor: "pointer", fontSize: "0.75rem" }}>
                              ✏️
                            </button>
                            <button onClick={() => handleDeleteTank(tank.id)}
                              style={{ background: "transparent", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", borderRadius: 6, padding: "0.25rem 0.5rem", cursor: "pointer", fontSize: "0.75rem" }}>
                              🗑️
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "0.5rem" }}>
                      <span style={{ color: "var(--pc-text)", fontWeight: 600 }}>{tank.currentLevel?.toLocaleString()} L</span>
                      <span style={{ color: "var(--pc-muted)" }}>{pct}%</span>
                    </div>
                    <FuelBar level={tank.currentLevel ?? 0} capacity={tank.capacity} alert={tank.alertThreshold ?? 1500} />
                    <div style={{ fontSize: "0.7rem", color: "var(--pc-muted)", marginTop: "0.5rem" }}>
                      Cap: {tank.capacity?.toLocaleString()} L | Soglia: {tank.alertThreshold?.toLocaleString()} L
                    </div>
                    {hasAlert && (
                      <div style={{ marginTop: "0.5rem", fontSize: "0.75rem", color: "#ef4444" }}>
                        🔴 Drain check: {tank.lastDrainCheckQuality} — {tank.lastDrainCheckDate}
                      </div>
                    )}
                    {tank.lastDrainCheckQuality === "ok" && (
                      <div style={{ marginTop: "0.5rem", fontSize: "0.75rem", color: "#22c55e" }}>
                        ✅ Drain check OK — {tank.lastDrainCheckDate}
                      </div>
                    )}
                  </div>
                );
              })}
              {isAdmin && (
                <button onClick={() => { setSelected(null); setModal("newTank"); }}
                  style={{
                    background: "transparent", border: "2px dashed var(--pc-border)", borderRadius: 12,
                    color: "var(--pc-muted)", cursor: "pointer", padding: "1.5rem", display: "flex",
                    flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.5rem",
                    fontSize: "0.875rem", minHeight: 140,
                  }}>
                  <span style={{ fontSize: "1.5rem" }}>+</span>
                  {t("addTank")}
                </button>
              )}
            </div>

            {/* Fleet */}
            <h2 style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--pc-muted)", marginBottom: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {t("fleet")} ({(helicopters as any[]).length})
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "0.75rem", marginBottom: "2rem" }}>
              {(helicopters as any[]).map((h: any) => (
                <div key={h.id} className="card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span>{h.category === "aviation" ? "✈️" : "🚜"}</span>
                        <span>{h.vehicleType ?? (h.category === "aviation" ? "Elicottero" : "Mezzo")}</span>
                      </div>
                      {h.identifier && <div style={{ fontWeight: 700, color: "var(--pc-sand)", fontSize: "0.9rem" }}>{h.identifier}</div>}
                      <div style={{ fontSize: "0.8rem", color: "var(--pc-muted)" }}>{h.name}</div>
                      {h.model && <div style={{ fontSize: "0.75rem", color: "var(--pc-muted)" }}>{h.model}</div>}
                    </div>
                    {isAdmin && (
                      <div style={{ display: "flex", gap: "0.25rem" }}>
                        <button onClick={() => { setSelected(h); setModal("editVehicle"); }}
                          style={{ background: "transparent", border: "1px solid var(--pc-border)", color: "var(--pc-muted)", borderRadius: 6, padding: "0.25rem 0.5rem", cursor: "pointer", fontSize: "0.75rem" }}>
                          ✏️
                        </button>
                        <button onClick={() => handleDeleteVehicle(h.id)}
                          style={{ background: "transparent", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", borderRadius: 6, padding: "0.25rem 0.5rem", cursor: "pointer", fontSize: "0.75rem" }}>
                          🗑️
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isAdmin && (
                <button onClick={() => { setSelected(null); setModal("newVehicle"); }}
                  style={{
                    background: "transparent", border: "2px dashed var(--pc-border)", borderRadius: 12,
                    color: "var(--pc-muted)", cursor: "pointer", padding: "1.25rem", display: "flex",
                    alignItems: "center", justifyContent: "center", gap: "0.5rem", fontSize: "0.875rem",
                  }}>
                  + {t("addVehicle")}
                </button>
              )}
            </div>

            {/* Recent movements */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <h2 style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--pc-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Ultimi {t("movements")}
              </h2>
              <button onClick={() => setTab("history")} style={{ background: "none", border: "none", color: "var(--pc-sand)", cursor: "pointer", fontSize: "0.8rem" }}>
                Vedi tutti →
              </button>
            </div>
            <MovementsList movements={recentMovements} tanks={tanks as any[]} helicopters={helicopters as any[]} t={t} />
          </div>
        )}

        {/* ── HISTORY TAB ── */}
        {tab === "history" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h1 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--pc-sand)" }}>{t("history")}</h1>
              <button onClick={() => exportMovementsCSV(movements as any[], tanks as any[], helicopters as any[])}
                className="btn btn-ghost btn-sm">
                ⬇️ Export CSV
              </button>
            </div>
            {/* Report accordion */}
            <Accordion title="📊 Report Consumi" defaultOpen={false}>
              <ReportView movements={movements as any[]} tanks={tanks as any[]} helicopters={helicopters as any[]} t={t} />
            </Accordion>
            <MovementsList movements={movements as any[]} tanks={tanks as any[]} helicopters={helicopters as any[]} t={t} isAdmin={isAdmin}
              onDelete={async (id: string) => {
                await del(`/api/movements/${id}`);
                qc.invalidateQueries({ queryKey: ["movements"] });
              }}
            />
          </div>
        )}

        {/* ── CONFIG TAB ── */}
        {tab === "config" && isAdmin && (
          <div>
            <h1 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--pc-sand)", marginBottom: "1.5rem" }}>{t("config")}</h1>

            {/* Bases */}
            <Accordion title={`📍 ${t("bases")}`} icon="">
              <BasesSection bases={bases as any[]} t={t} refetch={() => qc.invalidateQueries({ queryKey: ["bases"] })} />
            </Accordion>

            {/* Users */}
            <Accordion title={`👥 ${t("users")}`}>
              <UsersSection companyId={getImpersonatedCompanyId() ?? (me as any)?.companyId} t={t} />
            </Accordion>

            {/* Branding */}
            <Accordion title={`🎨 ${t("branding")}`}>
              <BrandingSection company={company} t={t} refetch={() => qc.invalidateQueries({ queryKey: ["company"] })} />
            </Accordion>

            {/* Import */}
            <Accordion title="📥 Importa Movimenti">
              <ImportSection tanks={tanks as any[]} t={t} refetch={refetchAll} />
            </Accordion>
          </div>
        )}

        {/* ── DRAIN LOG TAB ── */}
        {tab === "drainlog" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h1 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--pc-sand)" }}>🔍 Drain Check Log</h1>
              <button onClick={() => exportDrainCSV(drainChecks as any[], tanks as any[])}
                className="btn btn-ghost btn-sm">
                ⬇️ Export CSV
              </button>
            </div>
            <DrainLogTable drainChecks={drainChecks as any[]} tanks={tanks as any[]} helicopters={helicopters as any[]} t={t} isAdmin={isAdmin}
              onDelete={async (id: string) => {
                await del(`/api/drain-checks/${id}`);
                qc.invalidateQueries({ queryKey: ["drainChecks"] });
              }}
            />
          </div>
        )}
      </main>

      {/* Modals */}
      {modal === "newMovement" && (
        <NewMovementModal tanks={tanks} helicopters={helicopters} t={t} onClose={() => setModal(null)} onSave={handleSaveMovement} />
      )}
      {modal === "drainTank" && selected && (
        <DrainCheckModal tank={selected} t={t} onClose={() => setModal(null)} onSave={handleDrainCheck} />
      )}
      {(modal === "newTank" || modal === "editTank") && (
        <TankModal
          tank={modal === "editTank" ? selected : null}
          bases={bases} t={t} isSuperAdmin={isSuperAdmin}
          onClose={() => setModal(null)} onSave={handleSaveTank}
        />
      )}
      {(modal === "newVehicle" || modal === "editVehicle") && (
        <VehicleModal
          vehicle={modal === "editVehicle" ? selected : null}
          t={t} onClose={() => setModal(null)} onSave={handleSaveVehicle}
        />
      )}
      {showProfile && me && (
        <ProfileModal me={me} t={t} onClose={() => setShowProfile(false)} />
      )}
    </div>
  );
}

// ── Helper components ──────────────────────────────────────────────────────

function MovementsList({ movements, tanks, helicopters, t, isAdmin, onDelete }: any) {
  if (!movements.length) return <div style={{ color: "var(--pc-muted)", textAlign: "center", padding: "2rem" }}>{t("noData")}</div>;
  const tankMap = Object.fromEntries(tanks.map((tk: any) => [tk.id, tk.name]));
  const heliMap = Object.fromEntries(helicopters.map((h: any) => [h.id, `${h.identifier ?? h.name}`]));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {movements.map((m: any) => (
        <div key={m.id} className="card" style={{ padding: "0.75rem 1rem", display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ fontSize: "1.25rem", width: 32, textAlign: "center" }}>{movIcon(m.type)}</div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontWeight: 600, color: movColor(m.type) }}>{t(m.type as any)}</span>
              {m.tankId && <span style={{ color: "var(--pc-muted)", fontSize: "0.8rem" }}>📦 {tankMap[m.tankId] ?? m.tankId}</span>}
              {m.helicopterId && <span style={{ color: "var(--pc-muted)", fontSize: "0.8rem" }}>✈️ {heliMap[m.helicopterId] ?? m.helicopterId}</span>}
              {m.toTankId && <span style={{ color: "var(--pc-muted)", fontSize: "0.8rem" }}>→ {tankMap[m.toTankId] ?? m.toTankId}</span>}
            </div>
            {m.notes && <div style={{ fontSize: "0.75rem", color: "var(--pc-muted)", marginTop: "0.125rem" }}>{m.notes}</div>}
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontWeight: 700, color: "var(--pc-text)" }}>{m.liters} L</div>
            <div style={{ fontSize: "0.7rem", color: "var(--pc-muted)" }}>{m.date} {m.time}</div>
          </div>
          {isAdmin && onDelete && (
            <button onClick={() => onDelete(m.id)}
              style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "0.75rem" }}>
              🗑️
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function DrainLogTable({ drainChecks, tanks, helicopters, t, isAdmin, onDelete }: any) {
  const tankMap = Object.fromEntries(tanks.map((tk: any) => [tk.id, tk.name]));
  const heliMap = Object.fromEntries(helicopters.map((h: any) => [h.id, h.identifier ?? h.name]));
  if (!drainChecks.length) return <div style={{ color: "var(--pc-muted)", textAlign: "center", padding: "2rem" }}>{t("noData")}</div>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {drainChecks.map((dc: any) => (
        <div key={dc.id} className="card" style={{ padding: "0.75rem 1rem", display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ fontSize: "1.25rem" }}>🔍</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600 }}>{dc.tankId ? tankMap[dc.tankId] : heliMap[dc.helicopterId]}</div>
            {dc.notes && <div style={{ fontSize: "0.75rem", color: "var(--pc-muted)" }}>{dc.notes}</div>}
          </div>
          <div>
            <span className={`badge badge-${dc.quality === "ok" ? "ok" : dc.quality === "water" ? "water" : "impurities"}`}>
              {dc.quality === "ok" ? "✅ OK" : dc.quality === "water" ? "💧 Acqua" : "🔴 Impurità"}
            </span>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontWeight: 600 }}>{dc.liters} L</div>
            <div style={{ fontSize: "0.7rem", color: "var(--pc-muted)" }}>{dc.date} {dc.time}</div>
          </div>
          {isAdmin && onDelete && (
            <button onClick={() => onDelete(dc.id)}
              style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "0.75rem" }}>
              🗑️
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function ReportView({ movements, tanks, helicopters, t }: any) {
  const tankMap = Object.fromEntries(tanks.map((tk: any) => [tk.id, tk]));
  const heliMap = Object.fromEntries(helicopters.map((h: any) => [h.id, h]));
  const totalRefuel = movements.filter((m: any) => m.type === "refuel").reduce((s: number, m: any) => s + m.liters, 0);
  const totalConsumption = movements.filter((m: any) => m.type === "consumption").reduce((s: number, m: any) => s + m.liters, 0);
  const totalDrain = movements.filter((m: any) => m.type === "drain_check").reduce((s: number, m: any) => s + m.liters, 0);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem" }}>
      {[
        { label: "Rifornimenti totali", value: `${totalRefuel.toLocaleString()} L`, color: "#22c55e" },
        { label: "Consumi totali", value: `${totalConsumption.toLocaleString()} L`, color: "#f59e0b" },
        { label: "Spurghi totali", value: `${totalDrain.toLocaleString()} L`, color: "#8b5cf6" },
        { label: "Movimenti totali", value: movements.length, color: "var(--pc-sand)" },
      ].map((stat) => (
        <div key={stat.label} style={{ background: "var(--pc-dark)", borderRadius: 8, padding: "1rem", textAlign: "center" }}>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: stat.color }}>{stat.value}</div>
          <div style={{ fontSize: "0.75rem", color: "var(--pc-muted)", marginTop: "0.25rem" }}>{stat.label}</div>
        </div>
      ))}
    </div>
  );
}

function BasesSection({ bases, t, refetch }: any) {
  const [form, setForm] = useState({ name: "", location: "" });
  const save = async () => {
    await post("/api/bases", form);
    setForm({ name: "", location: "" });
    refetch();
  };
  const remove = async (id: string) => {
    await del(`/api/bases/${id}`);
    refetch();
  };
  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1rem" }}>
        {bases.map((b: any) => (
          <div key={b.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0.75rem", background: "var(--pc-dark)", borderRadius: 8 }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{b.name}</div>
              {b.location && <div style={{ fontSize: "0.75rem", color: "var(--pc-muted)" }}>{b.location}</div>}
            </div>
            <button onClick={() => remove(b.id)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer" }}>🗑️</button>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <input placeholder="Nome base" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={{ flex: 2 }} />
        <input placeholder="Posizione" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} style={{ flex: 2 }} />
        <button onClick={save} className="btn btn-primary btn-sm" style={{ flexShrink: 0 }}>+ {t("addBase")}</button>
      </div>
    </div>
  );
}

function UsersSection({ companyId, t }: any) {
  const { data: users = [] } = useQuery({
    queryKey: ["company-users", companyId],
    queryFn: () => get("/api/companies/me/users"),
    enabled: !!companyId,
  });
  const [inviteForm, setInviteForm] = useState({ email: "", role: "operator" });
  const [inviteUrl, setInviteUrl] = useState("");

  const invite = async () => {
    const res = await post("/api/companies/me/invite", inviteForm);
    if (res.ok) { const d = await res.json(); setInviteUrl(d.inviteUrl); }
  };

  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1rem" }}>
        {(users as any[]).map((u: any) => (
          <div key={u.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0.75rem", background: "var(--pc-dark)", borderRadius: 8 }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{u.name}</div>
              <div style={{ fontSize: "0.75rem", color: "var(--pc-muted)" }}>{u.email}</div>
            </div>
            <span className={`badge ${u.role === "admin" ? "badge-active" : "badge-trial"}`}>{u.role}</span>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
        <input placeholder="Email utente" type="email" value={inviteForm.email} onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })} style={{ flex: 2 }} />
        <select value={inviteForm.role} onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })} style={{ width: "auto" }}>
          <option value="operator">Operatore</option>
          <option value="admin">Admin</option>
        </select>
        <button onClick={invite} className="btn btn-primary btn-sm">📨 Invita</button>
      </div>
      {inviteUrl && (
        <div style={{ marginTop: "0.75rem", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 8, padding: "0.75rem", fontSize: "0.8rem" }}>
          Link invito: <a href={inviteUrl} style={{ color: "#22c55e", wordBreak: "break-all" }}>{inviteUrl}</a>
        </div>
      )}
    </div>
  );
}

function BrandingSection({ company, t, refetch }: any) {
  const [form, setForm] = useState({
    brandName: company?.brandName ?? "",
    primaryColor: company?.primaryColor ?? "#1b3a5c",
    bgColor: company?.bgColor ?? "#d6c4a0",
  });
  const save = async () => {
    await patch("/api/companies/me", form);
    // Apply CSS vars live
    document.documentElement.style.setProperty("--pc-primary", form.primaryColor);
    refetch();
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <div><label>Nome Brand</label><input value={form.brandName} onChange={(e) => setForm({ ...form, brandName: e.target.value })} /></div>
      <div style={{ display: "flex", gap: "1rem" }}>
        <div style={{ flex: 1 }}>
          <label>Colore Primario</label>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <input type="color" value={form.primaryColor} onChange={(e) => setForm({ ...form, primaryColor: e.target.value })} style={{ width: 40, height: 36, padding: 2 }} />
            <input value={form.primaryColor} onChange={(e) => setForm({ ...form, primaryColor: e.target.value })} style={{ flex: 1 }} />
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <label>Colore Accento</label>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <input type="color" value={form.bgColor} onChange={(e) => setForm({ ...form, bgColor: e.target.value })} style={{ width: 40, height: 36, padding: 2 }} />
            <input value={form.bgColor} onChange={(e) => setForm({ ...form, bgColor: e.target.value })} style={{ flex: 1 }} />
          </div>
        </div>
      </div>
      <button onClick={save} className="btn btn-primary">{t("save")}</button>
    </div>
  );
}

function ImportSection({ tanks, t, refetch }: any) {
  const [rows, setRows] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<string>("");

  const parseCsv = (text: string) => {
    const lines = text.trim().split("\n").slice(1); // skip header
    return lines.map((line) => {
      const [date, tankName, liters, type, notes] = line.split(",").map((s) => s.trim());
      const tank = tanks.find((tk: any) => tk.name.toLowerCase() === tankName?.toLowerCase());
      return { date, tank: tankName, liters: Number(liters), type: type ?? "refuel", notes, _tank: tank, _ok: !!tank && !isNaN(Number(liters)) };
    });
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    if (file.name.endsWith(".csv")) {
      setRows(parseCsv(text));
    }
  };

  const doImport = async () => {
    setImporting(true);
    const validRows = rows.filter((r) => r._ok).map((r) => ({
      date: r.date, tank: r.tank, liters: r.liters, type: r.type, notes: r.notes,
    }));
    const res = await post("/api/imports/movements", { rows: validRows });
    const data = await res.json();
    setResult(`Importate ${data.results?.filter((r: any) => r.ok).length ?? 0} righe`);
    refetch();
    setImporting(false);
  };

  return (
    <div>
      <p style={{ fontSize: "0.8rem", color: "var(--pc-muted)", marginBottom: "0.75rem" }}>
        CSV formato: <code>Data,Cisterna,Litri,Tipo(refuel|consumption),Note</code>
      </p>
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        <input type="file" accept=".csv" onChange={handleFile} style={{ flex: 1 }} />
      </div>
      {rows.length > 0 && (
        <>
          <div style={{ maxHeight: 200, overflowY: "auto", marginBottom: "0.75rem" }}>
            {rows.map((r, i) => (
              <div key={i} style={{
                display: "flex", gap: "0.5rem", padding: "0.35rem 0.5rem", fontSize: "0.75rem",
                background: r._ok ? "rgba(34,197,94,0.05)" : "rgba(239,68,68,0.05)",
                borderRadius: 4, marginBottom: "0.25rem",
              }}>
                <span>{r._ok ? "✅" : "❌"}</span>
                <span>{r.date}</span>
                <span>{r.tank}</span>
                <span>{r.liters}L</span>
                <span style={{ color: "var(--pc-muted)" }}>{r.type}</span>
              </div>
            ))}
          </div>
          <button onClick={doImport} disabled={importing} className="btn btn-primary btn-sm">
            {importing ? t("loading") : `Importa ${rows.filter((r) => r._ok).length} righe`}
          </button>
        </>
      )}
      {result && <div style={{ marginTop: "0.5rem", color: "#22c55e", fontSize: "0.8rem" }}>{result}</div>}
    </div>
  );
}

// ── Exports ────────────────────────────────────────────────────────────────

function exportMovementsCSV(movements: any[], tanks: any[], helicopters: any[]) {
  const tankMap = Object.fromEntries(tanks.map((t) => [t.id, t.name]));
  const heliMap = Object.fromEntries(helicopters.map((h) => [h.id, h.identifier ?? h.name]));
  const rows = [["Data", "Ora", "Tipo", "Cisterna", "Mezzo", "Litri", "Note"]];
  movements.forEach((m) => rows.push([m.date, m.time, m.type, tankMap[m.tankId] ?? "", heliMap[m.helicopterId] ?? "", m.liters, m.notes ?? ""]));
  const csv = rows.map((r) => r.join(",")).join("\n");
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = `movimenti-${new Date().toISOString().split("T")[0]}.csv`; a.click();
}

function exportDrainCSV(drainChecks: any[], tanks: any[]) {
  const tankMap = Object.fromEntries(tanks.map((t) => [t.id, t.name]));
  const rows = [["Data", "Ora", "Cisterna", "Litri", "Qualità", "Note"]];
  drainChecks.forEach((d) => rows.push([d.date, d.time, tankMap[d.tankId] ?? "", d.liters, d.quality, d.notes ?? ""]));
  const csv = rows.map((r) => r.join(",")).join("\n");
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = `drain-checks-${new Date().toISOString().split("T")[0]}.csv`; a.click();
}
