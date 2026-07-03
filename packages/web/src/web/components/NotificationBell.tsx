import { useEffect, useRef, useState } from "react";

export type NotificationItem = {
  id: string;
  severity: "warning" | "danger";
  message: string;
};

/**
 * Bell dropdown showing active alerts (low fuel, drain check anomalies).
 * Also fires a browser Notification (best-effort) the first time a given
 * alert id appears, deduped via localStorage so refreshes don't re-spam.
 */
export function NotificationBell({ items }: { items: NotificationItem[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const seenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    // Notify (toast via Notification API, best-effort, silent fail)
    const key = "pc_seen_alerts";
    let seen: string[] = [];
    try { seen = JSON.parse(localStorage.getItem(key) ?? "[]"); } catch { seen = []; }
    const seenSet = new Set(seen);
    const fresh = items.filter((i) => !seenSet.has(i.id));
    if (fresh.length > 0 && "Notification" in window) {
      if (Notification.permission === "default") Notification.requestPermission();
      if (Notification.permission === "granted") {
        fresh.forEach((f) => new Notification("PilotCraft Fuel Manager", { body: f.message }));
      }
    }
    items.forEach((i) => seenSet.add(i.id));
    try { localStorage.setItem(key, JSON.stringify([...seenSet].slice(-100))); } catch {}
  }, [items]);

  const count = items.length;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          background: "none", border: "none", cursor: "pointer", position: "relative",
          fontSize: "1.15rem", color: "var(--pc-sand)", padding: "0.25rem 0.4rem",
        }}
        aria-label="Notifiche"
      >
        🔔
        {count > 0 && (
          <span style={{
            position: "absolute", top: -2, right: -2, background: "#ef4444", color: "white",
            fontSize: "0.6rem", fontWeight: 700, borderRadius: "50%", minWidth: 16, height: 16,
            display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px",
          }}>
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>
      {open && (
        <div style={{
          position: "absolute", right: 0, top: "calc(100% + 8px)", width: 320, maxHeight: 360,
          overflowY: "auto", background: "var(--pc-card)", border: "1px solid var(--pc-border)",
          borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.4)", zIndex: 2000, padding: "0.5rem",
        }}>
          <div style={{ fontWeight: 700, fontSize: "0.8rem", color: "var(--pc-sand)", padding: "0.5rem 0.5rem 0.25rem" }}>
            Notifiche {count > 0 ? `(${count})` : ""}
          </div>
          {count === 0 ? (
            <div style={{ padding: "1rem 0.5rem", color: "var(--pc-muted)", fontSize: "0.8rem" }}>
              Nessuna notifica attiva ✅
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              {items.map((it) => (
                <div key={it.id} style={{
                  padding: "0.5rem 0.6rem", borderRadius: 8, fontSize: "0.78rem", lineHeight: 1.4,
                  background: it.severity === "danger" ? "rgba(239,68,68,0.12)" : "rgba(245,158,11,0.12)",
                  border: `1px solid ${it.severity === "danger" ? "rgba(239,68,68,0.3)" : "rgba(245,158,11,0.3)"}`,
                  color: it.severity === "danger" ? "#ef4444" : "#f59e0b",
                }}>
                  {it.severity === "danger" ? "🔴" : "⚠️"} {it.message}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
