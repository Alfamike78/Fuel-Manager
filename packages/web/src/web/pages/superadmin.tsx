import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth, setImpersonation, clearImpersonation } from "../hooks/useAuth";
import { useLocation } from "wouter";

interface Company {
  id: string;
  name: string;
  email: string;
  status: string;
  plan: string;
  trialEndsAt: string | null;
  createdAt: string;
  archivedAt: string | null;
  primaryColor?: string;
  brandName?: string;
}

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("it-IT");
}

function statusBadge(company: Company) {
  if (company.archivedAt) return <span style={{ background: "#6b7280", color: "#fff", padding: "2px 8px", borderRadius: 4, fontSize: 11 }}>Archiviata</span>;
  if (company.status === "suspended") return <span style={{ background: "#dc2626", color: "#fff", padding: "2px 8px", borderRadius: 4, fontSize: 11 }}>Sospesa</span>;
  if (company.status === "trial") return <span style={{ background: "#d97706", color: "#fff", padding: "2px 8px", borderRadius: 4, fontSize: 11 }}>Trial</span>;
  if (company.status === "active") return <span style={{ background: "#16a34a", color: "#fff", padding: "2px 8px", borderRadius: 4, fontSize: 11 }}>Attiva</span>;
  return <span style={{ background: "#6b7280", color: "#fff", padding: "2px 8px", borderRadius: 4, fontSize: 11 }}>{company.status}</span>;
}

function planBadge(plan: string) {
  const colors: Record<string, string> = { trial: "#d97706", starter: "#2563eb", pro: "#7c3aed", business: "#db2777" };
  return <span style={{ background: colors[plan] ?? "#6b7280", color: "#fff", padding: "2px 8px", borderRadius: 4, fontSize: 11, marginLeft: 4 }}>{plan.toUpperCase()}</span>;
}

interface DeleteModalProps {
  company: Company;
  onClose: () => void;
  onDeleted: () => void;
}

function DeleteModal({ company, onClose, onDeleted }: DeleteModalProps) {
  const [mode, setMode] = useState<"archive" | "purge">("archive");
  const [confirmName, setConfirmName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setError("");
    if (confirmName !== company.name) { setError("Nome azienda non corrisponde"); return; }
    setLoading(true);
    const res = await fetch(`/api/superadmin/companies/${company.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ password, mode }),
    });
    setLoading(false);
    if (!res.ok) { const e = await res.json(); setError(e.message ?? "Errore"); return; }
    onDeleted();
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#1a2332", border: "1px solid #dc2626", borderRadius: 12, padding: 24, width: 420, maxWidth: "95vw" }}>
        <h3 style={{ color: "#dc2626", margin: "0 0 16px" }}>⚠️ Elimina Azienda</h3>
        <p style={{ color: "#d6c4a0", fontSize: 14 }}>Stai per eliminare: <strong>{company.name}</strong></p>

        <div style={{ margin: "16px 0" }}>
          <label style={{ color: "#8fa3b8", fontSize: 12, display: "block", marginBottom: 4 }}>Modalità</label>
          <div style={{ display: "flex", gap: 12 }}>
            <label style={{ color: "#d6c4a0", display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input type="radio" checked={mode === "archive"} onChange={() => setMode("archive")} /> Archivia (soft-delete)
            </label>
            <label style={{ color: "#dc2626", display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input type="radio" checked={mode === "purge"} onChange={() => setMode("purge")} /> Elimina definitivamente
            </label>
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ color: "#8fa3b8", fontSize: 12, display: "block", marginBottom: 4 }}>Conferma nome azienda</label>
          <input value={confirmName} onChange={e => setConfirmName(e.target.value)} placeholder={company.name}
            style={{ width: "100%", background: "#0f1e2e", border: "1px solid #2d3f52", color: "#e2e8f0", borderRadius: 6, padding: "8px 12px", fontSize: 14, boxSizing: "border-box" }} />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ color: "#8fa3b8", fontSize: 12, display: "block", marginBottom: 4 }}>La tua password super-admin</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            style={{ width: "100%", background: "#0f1e2e", border: "1px solid #2d3f52", color: "#e2e8f0", borderRadius: 6, padding: "8px 12px", fontSize: 14, boxSizing: "border-box" }} />
        </div>

        {error && <p style={{ color: "#dc2626", fontSize: 13 }}>{error}</p>}

        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 20 }}>
          <button onClick={onClose} style={{ padding: "8px 16px", background: "transparent", border: "1px solid #2d3f52", color: "#8fa3b8", borderRadius: 6, cursor: "pointer" }}>Annulla</button>
          <button onClick={handleDelete} disabled={loading}
            style={{ padding: "8px 16px", background: "#dc2626", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", opacity: loading ? 0.6 : 1 }}>
            {loading ? "..." : mode === "archive" ? "Archivia" : "Elimina Definitivamente"}
          </button>
        </div>
      </div>
    </div>
  );
}

interface SubModalProps {
  company: Company;
  onClose: () => void;
  onSaved: () => void;
}

function SubModal({ company, onClose, onSaved }: SubModalProps) {
  const [plan, setPlan] = useState(company.plan);
  const [status, setStatus] = useState(company.status);
  const [extendDays, setExtendDays] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setError("");
    setLoading(true);
    const body: Record<string, unknown> = { plan, status };
    if (extendDays) body.extendDays = parseInt(extendDays);
    const res = await fetch(`/api/superadmin/companies/${company.id}/subscription`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });
    setLoading(false);
    if (!res.ok) { const e = await res.json(); setError(e.message ?? "Errore"); return; }
    onSaved();
  }

  const inputStyle: React.CSSProperties = { width: "100%", background: "#0f1e2e", border: "1px solid #2d3f52", color: "#e2e8f0", borderRadius: 6, padding: "8px 12px", fontSize: 14, boxSizing: "border-box" };
  const labelStyle: React.CSSProperties = { color: "#8fa3b8", fontSize: 12, display: "block", marginBottom: 4 };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#1a2332", border: "1px solid #1b3a5c", borderRadius: 12, padding: 24, width: 380, maxWidth: "95vw" }}>
        <h3 style={{ color: "#d6c4a0", margin: "0 0 16px" }}>Abbonamento — {company.name}</h3>

        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Piano</label>
          <select value={plan} onChange={e => setPlan(e.target.value)} style={inputStyle}>
            <option value="trial">Trial</option>
            <option value="starter">Starter €29</option>
            <option value="pro">Pro €79</option>
            <option value="business">Business €199</option>
          </select>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Stato</label>
          <select value={status} onChange={e => setStatus(e.target.value)} style={inputStyle}>
            <option value="trial">Trial</option>
            <option value="active">Attivo</option>
            <option value="suspended">Sospeso</option>
            <option value="cancelled">Cancellato</option>
          </select>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Estendi trial di N giorni (opzionale)</label>
          <input type="number" value={extendDays} onChange={e => setExtendDays(e.target.value)} placeholder="es. 30" style={inputStyle} />
        </div>

        {error && <p style={{ color: "#dc2626", fontSize: 13 }}>{error}</p>}

        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 20 }}>
          <button onClick={onClose} style={{ padding: "8px 16px", background: "transparent", border: "1px solid #2d3f52", color: "#8fa3b8", borderRadius: 6, cursor: "pointer" }}>Annulla</button>
          <button onClick={handleSave} disabled={loading}
            style={{ padding: "8px 16px", background: "#1b3a5c", color: "#d6c4a0", border: "none", borderRadius: 6, cursor: "pointer" }}>
            {loading ? "..." : "Salva"}
          </button>
        </div>
      </div>
    </div>
  );
}

interface EditCompanyModalProps {
  company: Company;
  onClose: () => void;
  onSaved: () => void;
}

function EditCompanyModal({ company, onClose, onSaved }: EditCompanyModalProps) {
  const [name, setName] = useState(company.name);
  const [email, setEmail] = useState(company.email ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setError("");
    setLoading(true);
    const res = await fetch(`/api/superadmin/companies/${company.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name, email }),
    });
    setLoading(false);
    if (!res.ok) { const e = await res.json(); setError(e.message ?? "Errore"); return; }
    onSaved();
  }

  const inputStyle: React.CSSProperties = { width: "100%", background: "#0f1e2e", border: "1px solid #2d3f52", color: "#e2e8f0", borderRadius: 6, padding: "8px 12px", fontSize: 14, boxSizing: "border-box" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#1a2332", border: "1px solid #1b3a5c", borderRadius: 12, padding: 24, width: 380, maxWidth: "95vw" }}>
        <h3 style={{ color: "#d6c4a0", margin: "0 0 16px" }}>Modifica Azienda</h3>

        <div style={{ marginBottom: 12 }}>
          <label style={{ color: "#8fa3b8", fontSize: 12, display: "block", marginBottom: 4 }}>Nome</label>
          <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ color: "#8fa3b8", fontSize: 12, display: "block", marginBottom: 4 }}>Email admin</label>
          <input value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
        </div>

        {error && <p style={{ color: "#dc2626", fontSize: 13 }}>{error}</p>}

        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 20 }}>
          <button onClick={onClose} style={{ padding: "8px 16px", background: "transparent", border: "1px solid #2d3f52", color: "#8fa3b8", borderRadius: 6, cursor: "pointer" }}>Annulla</button>
          <button onClick={handleSave} disabled={loading}
            style={{ padding: "8px 16px", background: "#1b3a5c", color: "#d6c4a0", border: "none", borderRadius: 6, cursor: "pointer" }}>
            {loading ? "..." : "Salva"}
          </button>
        </div>
      </div>
    </div>
  );
}

interface CreateCompanyModalProps {
  onClose: () => void;
  onCreated: () => void;
}

function CreateCompanyModal({ onClose, onCreated }: CreateCompanyModalProps) {
  const [companyName, setCompanyName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate() {
    setError("");
    if (!companyName || !adminEmail || !adminPassword) { setError("Compila tutti i campi obbligatori"); return; }
    setLoading(true);
    const res = await fetch("/api/superadmin/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name: companyName, adminEmail, adminName: adminName || adminEmail, adminPassword }),
    });
    setLoading(false);
    if (!res.ok) { const e = await res.json(); setError(e.message ?? "Errore"); return; }
    onCreated();
  }

  const inputStyle: React.CSSProperties = { width: "100%", background: "#0f1e2e", border: "1px solid #2d3f52", color: "#e2e8f0", borderRadius: 6, padding: "8px 12px", fontSize: 14, boxSizing: "border-box", marginBottom: 12 };
  const labelStyle: React.CSSProperties = { color: "#8fa3b8", fontSize: 12, display: "block", marginBottom: 4 };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#1a2332", border: "1px solid #1b3a5c", borderRadius: 12, padding: 24, width: 420, maxWidth: "95vw" }}>
        <h3 style={{ color: "#d6c4a0", margin: "0 0 16px" }}>➕ Nuova Azienda</h3>

        <label style={labelStyle}>Nome Azienda *</label>
        <input value={companyName} onChange={e => setCompanyName(e.target.value)} style={inputStyle} placeholder="Es. Eliservice SRL" />

        <label style={labelStyle}>Email Admin *</label>
        <input type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} style={inputStyle} placeholder="admin@azienda.it" />

        <label style={labelStyle}>Nome Admin</label>
        <input value={adminName} onChange={e => setAdminName(e.target.value)} style={inputStyle} placeholder="Mario Rossi" />

        <label style={labelStyle}>Password Admin *</label>
        <input type="password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} style={inputStyle} />

        {error && <p style={{ color: "#dc2626", fontSize: 13 }}>{error}</p>}

        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 }}>
          <button onClick={onClose} style={{ padding: "8px 16px", background: "transparent", border: "1px solid #2d3f52", color: "#8fa3b8", borderRadius: 6, cursor: "pointer" }}>Annulla</button>
          <button onClick={handleCreate} disabled={loading}
            style={{ padding: "8px 16px", background: "#16a34a", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>
            {loading ? "..." : "Crea Azienda"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SuperAdmin() {
  const { logout } = useAuth();
  const qc = useQueryClient();
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<"active" | "archived">("active");
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null);
  const [subTarget, setSubTarget] = useState<Company | null>(null);
  const [editTarget, setEditTarget] = useState<Company | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const { data: companies = [], isLoading, error } = useQuery<Company[]>({
    queryKey: ["superadmin-companies", tab],
    queryFn: async () => {
      const res = await fetch(`/api/superadmin/companies?archived=${tab === "archived"}`, { credentials: "include" });
      if (!res.ok) throw new Error("Non autorizzato");
      return res.json();
    },
  });

  const suspendMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "suspend" | "activate" }) => {
      const res = await fetch(`/api/superadmin/companies/${id}/subscription`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: action === "suspend" ? "suspended" : "active" }),
      });
      if (!res.ok) throw new Error("Errore");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["superadmin-companies"] }),
  });

  function enterCompany(company: Company) {
    setImpersonation(company.id, company.brandName ?? company.name);
    setLocation("/dashboard");
  }

  const filtered = companies.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const navStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    background: "#0f1e2e", borderBottom: "1px solid #1b3a5c", padding: "12px 24px"
  };

  const btnStyle = (active: boolean): React.CSSProperties => ({
    padding: "6px 16px", borderRadius: 6, border: "none", cursor: "pointer",
    background: active ? "#1b3a5c" : "transparent",
    color: active ? "#d6c4a0" : "#8fa3b8", fontWeight: active ? 600 : 400
  });

  return (
    <div style={{ minHeight: "100vh", background: "#0f1e2e", color: "#e2e8f0", fontFamily: "system-ui, sans-serif" }}>
      {/* Nav */}
      <div style={navStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img src="/pilotcraft-logo.png" alt="PilotCraft" style={{ height: 36 }} onError={e => (e.currentTarget.style.display = "none")} />
          <div>
            <div style={{ color: "#d6c4a0", fontWeight: 700, fontSize: 16 }}>PilotCraft Solutions</div>
            <div style={{ color: "#8fa3b8", fontSize: 11 }}>Super Admin CRM</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={() => setShowCreate(true)}
            style={{ padding: "6px 14px", background: "#16a34a", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13 }}>
            ➕ Nuova Azienda
          </button>
          <button onClick={() => logout.mutate()}
            style={{ padding: "6px 14px", background: "transparent", border: "1px solid #2d3f52", color: "#8fa3b8", borderRadius: 6, cursor: "pointer", fontSize: 13 }}>
            Logout
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px" }}>
        <h2 style={{ color: "#d6c4a0", margin: "0 0 20px" }}>Gestione Aziende</h2>

        {/* Tabs + search */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
          <button style={btnStyle(tab === "active")} onClick={() => setTab("active")}>Attive</button>
          <button style={btnStyle(tab === "archived")} onClick={() => setTab("archived")}>Archivio</button>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cerca azienda o email..."
            style={{ marginLeft: "auto", background: "#1a2332", border: "1px solid #2d3f52", color: "#e2e8f0", borderRadius: 6, padding: "6px 12px", width: 220, fontSize: 13 }}
          />
        </div>

        {isLoading && <p style={{ color: "#8fa3b8" }}>Caricamento...</p>}
        {error && <p style={{ color: "#dc2626" }}>Errore caricamento aziende</p>}

        {/* Company cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map(company => (
            <div key={company.id} style={{
              background: "#1a2332", border: "1px solid #2d3f52", borderRadius: 10,
              padding: "16px 20px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap"
            }}>
              {/* Company info */}
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ color: "#d6c4a0", fontWeight: 600, fontSize: 15 }}>{company.brandName ?? company.name}</span>
                  {statusBadge(company)}
                  {planBadge(company.plan)}
                </div>
                <div style={{ color: "#8fa3b8", fontSize: 12 }}>{company.email}</div>
                <div style={{ color: "#6b7280", fontSize: 11, marginTop: 2 }}>
                  Creata: {formatDate(company.createdAt)}
                  {company.trialEndsAt && ` · Trial fino: ${formatDate(company.trialEndsAt)}`}
                  {company.archivedAt && ` · Archiviata: ${formatDate(company.archivedAt)}`}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {!company.archivedAt && (
                  <>
                    <button onClick={() => enterCompany(company)}
                      style={{ padding: "6px 12px", background: "#1b3a5c", color: "#d6c4a0", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                      ➤ Entra
                    </button>
                    <button onClick={() => setEditTarget(company)}
                      style={{ padding: "6px 12px", background: "transparent", border: "1px solid #2d3f52", color: "#8fa3b8", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>
                      ✏️ Modifica
                    </button>
                    <button onClick={() => setSubTarget(company)}
                      style={{ padding: "6px 12px", background: "transparent", border: "1px solid #2d3f52", color: "#8fa3b8", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>
                      💳 Piano
                    </button>
                    <button onClick={() => suspendMutation.mutate({ id: company.id, action: company.status === "suspended" ? "activate" : "suspend" })}
                      style={{ padding: "6px 12px", background: "transparent", border: `1px solid ${company.status === "suspended" ? "#16a34a" : "#dc2626"}`, color: company.status === "suspended" ? "#16a34a" : "#dc2626", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>
                      {company.status === "suspended" ? "✅ Riattiva" : "🚫 Sospendi"}
                    </button>
                  </>
                )}
                <button onClick={() => setDeleteTarget(company)}
                  style={{ padding: "6px 12px", background: "transparent", border: "1px solid #dc2626", color: "#dc2626", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>
                  🗑️ {company.archivedAt ? "Elimina" : "Archivia"}
                </button>
              </div>
            </div>
          ))}

          {filtered.length === 0 && !isLoading && (
            <p style={{ color: "#6b7280", textAlign: "center", padding: 40 }}>Nessuna azienda trovata</p>
          )}
        </div>
      </div>

      {/* Modals */}
      {deleteTarget && (
        <DeleteModal
          company={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => { setDeleteTarget(null); qc.invalidateQueries({ queryKey: ["superadmin-companies"] }); }}
        />
      )}
      {subTarget && (
        <SubModal
          company={subTarget}
          onClose={() => setSubTarget(null)}
          onSaved={() => { setSubTarget(null); qc.invalidateQueries({ queryKey: ["superadmin-companies"] }); }}
        />
      )}
      {editTarget && (
        <EditCompanyModal
          company={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => { setEditTarget(null); qc.invalidateQueries({ queryKey: ["superadmin-companies"] }); }}
        />
      )}
      {showCreate && (
        <CreateCompanyModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); qc.invalidateQueries({ queryKey: ["superadmin-companies"] }); }}
        />
      )}
    </div>
  );
}
