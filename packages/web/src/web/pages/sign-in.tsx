import { useState, useEffect } from "react";
import { useAuth, clearImpersonation } from "../hooks/useAuth";
import { useLang, setGlobalLang } from "../hooks/useLang";
import { Lang } from "../i18n/translations";

const LANGS: { code: Lang; flag: string; label: string }[] = [
  { code: "it", flag: "🇮🇹", label: "IT" },
  { code: "en", flag: "🇬🇧", label: "EN" },
  { code: "fr", flag: "🇫🇷", label: "FR" },
  { code: "de", flag: "🇩🇪", label: "DE" },
  { code: "es", flag: "🇪🇸", label: "ES" },
  { code: "tr", flag: "🇹🇷", label: "TR" },
];

const FEATURES = [
  { icon: "⛽", title: "Gestione Cisterne", desc: "Monitora livelli, soglie allarme e tipi di carburante in tempo reale" },
  { icon: "🚁", title: "Flotta Mista", desc: "Elicotteri, aerei e mezzi terrestri in un unico sistema" },
  { icon: "🔍", title: "Drain Check", desc: "Traccia controlli qualità carburante con foto e report automatici" },
  { icon: "📊", title: "Report & Storico", desc: "Esporta movimenti e analizza i consumi nel tempo" },
  { icon: "🌍", title: "Multi-lingua", desc: "Italiano, English, Français, Deutsch, Español, Türkçe" },
  { icon: "👥", title: "Multi-tenant", desc: "Gestisci team e permessi per ogni operatore" },
];

export default function SignIn() {
  const { t, lang, changeLang } = useLang();
  const { login, register } = useAuth();

  // Clear any impersonation when landing on sign-in
  useEffect(() => { clearImpersonation(); }, []);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({ name: "", email: "", password: "", companyName: "" });
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      if (mode === "login") {
        await login.mutateAsync({ email: form.email, password: form.password });
      } else {
        await register.mutateAsync({ name: form.name, email: form.email, password: form.password, companyName: form.companyName });
      }
    } catch (err: any) {
      setError(err.message ?? t("error"));
    }
  };

  const isLoading = login.isPending || register.isPending;

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "var(--pc-dark)" }}>
      {/* LEFT: Brand panel */}
      <div style={{
        flex: 1, display: window.innerWidth > 768 ? "flex" : "none", flexDirection: "column", justifyContent: "center",
        padding: "3rem 4rem", background: "linear-gradient(135deg, #0f1e2e 0%, #162030 50%, #1b3a5c22 100%)",
        borderRight: "1px solid var(--pc-border)",
      } as any}>
        {/* Logo */}
        <div style={{ marginBottom: "3rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.5rem" }}>
            <div style={{
              width: 56, height: 56, borderRadius: 12,
              background: "linear-gradient(135deg, #1b3a5c, #244d7a)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28,
            }}>🚁</div>
            <div>
              <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--pc-sand)", letterSpacing: "-0.02em" }}>
                PilotCraft
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--pc-muted)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                Solutions
              </div>
            </div>
          </div>
          <p style={{ color: "var(--pc-muted)", fontSize: "0.875rem", marginTop: "0.5rem" }}>
            Forest Expertise in Air Response
          </p>
        </div>

        <h1 style={{ fontSize: "2rem", fontWeight: 800, color: "var(--pc-text)", marginBottom: "0.75rem", lineHeight: 1.2 }}>
          Gestione carburante per{" "}
          <span style={{ color: "var(--pc-sand)" }}>operatori elicotteristici</span>
        </h1>
        <p style={{ color: "var(--pc-muted)", marginBottom: "2.5rem", lineHeight: 1.6 }}>
          Piattaforma SaaS multi-tenant per il controllo completo del carburante in basi aeronautiche.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          {FEATURES.map((f) => (
            <div key={f.title} style={{
              background: "rgba(27,58,92,0.15)", border: "1px solid var(--pc-border)",
              borderRadius: 10, padding: "1rem",
            }}>
              <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>{f.icon}</div>
              <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--pc-sand)", marginBottom: "0.25rem" }}>{f.title}</div>
              <div style={{ fontSize: "0.75rem", color: "var(--pc-muted)", lineHeight: 1.5 }}>{f.desc}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: "2.5rem", display: "flex", gap: "2rem" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--pc-sand)" }}>30gg</div>
            <div style={{ fontSize: "0.75rem", color: "var(--pc-muted)" }}>Trial Gratuito</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--pc-sand)" }}>€29/m</div>
            <div style={{ fontSize: "0.75rem", color: "var(--pc-muted)" }}>Da Starter</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--pc-sand)" }}>6</div>
            <div style={{ fontSize: "0.75rem", color: "var(--pc-muted)" }}>Lingue</div>
          </div>
        </div>
      </div>

      {/* RIGHT: Auth form */}
      <div style={{
        width: "100%", maxWidth: 480, display: "flex", flexDirection: "column",
        justifyContent: "center", padding: "2rem",
      }}>
        {/* Lang selector */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.25rem", marginBottom: "2rem" }}>
          {LANGS.map((l) => (
            <button
              key={l.code}
              onClick={() => changeLang(l.code)}
              style={{
                background: lang === l.code ? "var(--pc-primary)" : "transparent",
                border: "1px solid var(--pc-border)", borderRadius: 6,
                padding: "0.25rem 0.5rem", color: "var(--pc-text)", fontSize: "0.75rem",
                cursor: "pointer", fontWeight: lang === l.code ? 600 : 400,
              }}
            >
              {l.flag} {l.label}
            </button>
          ))}
        </div>

        <div style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--pc-text)", marginBottom: "0.25rem" }}>
            {mode === "login" ? t("login") : t("register")}
          </h2>
          <p style={{ color: "var(--pc-muted)", fontSize: "0.875rem" }}>PilotCraft Solutions</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {mode === "register" && (
            <>
              <div>
                <label>{t("name")}</label>
                <input
                  type="text" required value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Mario Rossi"
                />
              </div>
              <div>
                <label>{t("companyName")}</label>
                <input
                  type="text" required value={form.companyName}
                  onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                  placeholder="Elicotteri Nord Italia SRL"
                />
              </div>
            </>
          )}
          <div>
            <label>{t("email")}</label>
            <input
              type="email" required value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="nome@azienda.com"
            />
          </div>
          <div>
            <label>{t("password")}</label>
            <input
              type="password" required value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div style={{
              background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
              color: "#ef4444", borderRadius: 8, padding: "0.75rem", fontSize: "0.875rem",
            }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={isLoading} className="btn btn-primary" style={{ marginTop: "0.5rem" }}>
            {isLoading ? t("loading") : mode === "login" ? t("login") : t("register")}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.875rem", color: "var(--pc-muted)" }}>
          {mode === "login" ? (
            <>Non hai un account?{" "}
              <button onClick={() => { setMode("register"); setError(""); }}
                style={{ background: "none", border: "none", color: "var(--pc-sand)", cursor: "pointer", fontWeight: 600 }}>
                {t("register")} →
              </button>
            </>
          ) : (
            <>Hai già un account?{" "}
              <button onClick={() => { setMode("login"); setError(""); }}
                style={{ background: "none", border: "none", color: "var(--pc-sand)", cursor: "pointer", fontWeight: 600 }}>
                {t("login")} →
              </button>
            </>
          )}
        </div>

        {mode === "register" && (
          <p style={{ textAlign: "center", marginTop: "1rem", fontSize: "0.75rem", color: "var(--pc-muted)" }}>
            30 giorni di trial gratuito. Nessuna carta richiesta.
          </p>
        )}
      </div>
    </div>
  );
}
