import { useState } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { get, post, patch, del } from "../../lib/api";
import { authClient, clearToken, setImpersonation } from "../../lib/auth";
import { theme } from "../../lib/theme";
import { AppModal } from "../../components/Modal";

interface Company {
  id: string;
  name: string;
  email: string;
  status: string;
  plan: string;
  trialEndsAt: string | null;
  createdAt: string;
  archivedAt: string | null;
  brandName?: string;
}

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("it-IT");
}

const STATUS_COLOR: Record<string, string> = {
  active: theme.green, trial: theme.orange, suspended: theme.red, cancelled: theme.muted,
};
const STATUS_LABEL: Record<string, string> = {
  active: "Attiva", trial: "Trial", suspended: "Sospesa", cancelled: "Cancellata",
};
const PLAN_COLOR: Record<string, string> = {
  trial: theme.orange, starter: theme.blue, pro: theme.purple, business: "#db2777",
};

export default function SuperAdminScreen() {
  const qc = useQueryClient();
  const router = useRouter();
  const [tab, setTab] = useState<"active" | "archived">("active");
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null);
  const [subTarget, setSubTarget] = useState<Company | null>(null);
  const [editTarget, setEditTarget] = useState<Company | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const { data: companies = [], isLoading, refetch } = useQuery<Company[]>({
    queryKey: ["superadmin-companies", tab],
    queryFn: () => get(`/api/superadmin/companies?archived=${tab === "archived"}`),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const filtered = companies.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const enterCompany = (c: Company) => {
    setImpersonation(c.id, c.brandName ?? c.name);
    qc.clear();
    router.replace("/(tabs)");
  };

  const toggleSuspend = async (c: Company) => {
    const action = c.status === "suspended" ? "active" : "suspended";
    const res = await patch(`/api/superadmin/companies/${c.id}/subscription`, { status: action });
    if (!res.ok) { Alert.alert("Errore", "Operazione non riuscita"); return; }
    qc.invalidateQueries({ queryKey: ["superadmin-companies"] });
  };

  const handleLogout = async () => {
    await authClient.signOut();
    await clearToken();
    qc.clear();
    router.replace("/(auth)/sign-in");
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>PilotCraft Solutions</Text>
          <Text style={styles.brandSub}>Super Admin CRM</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreate(true)}>
            <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>➕ Nuova</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={{ color: theme.muted, fontSize: 12 }}>Esci</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity onPress={() => setTab("active")} style={[styles.tabBtn, tab === "active" && styles.tabBtnActive]}>
          <Text style={{ color: tab === "active" ? theme.sand : theme.muted, fontWeight: "600", fontSize: 13 }}>Attive</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setTab("archived")} style={[styles.tabBtn, tab === "archived" && styles.tabBtnActive]}>
          <Text style={{ color: tab === "archived" ? theme.sand : theme.muted, fontWeight: "600", fontSize: 13 }}>Archivio</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.search}
        placeholder="Cerca azienda o email..."
        placeholderTextColor={theme.muted}
        value={search}
        onChangeText={setSearch}
      />

      {isLoading ? (
        <ActivityIndicator color={theme.sand} style={{ marginTop: 30 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ padding: 16, paddingTop: 8 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.sand} />}
          ListEmptyComponent={<Text style={{ color: theme.muted, textAlign: "center", padding: 30 }}>Nessuna azienda trovata</Text>}
          renderItem={({ item: c }) => (
            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.companyName}>{c.brandName ?? c.name}</Text>
                <View style={{ flexDirection: "row", gap: 6 }}>
                  <View style={[styles.badge, { backgroundColor: STATUS_COLOR[c.status] ?? theme.muted }]}>
                    <Text style={styles.badgeText}>{STATUS_LABEL[c.status] ?? c.status}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: PLAN_COLOR[c.plan] ?? theme.muted }]}>
                    <Text style={styles.badgeText}>{c.plan.toUpperCase()}</Text>
                  </View>
                </View>
              </View>
              <Text style={styles.companyEmail}>{c.email}</Text>
              <Text style={styles.companyMeta}>
                Creata: {formatDate(c.createdAt)}
                {c.trialEndsAt ? ` · Trial fino: ${formatDate(c.trialEndsAt)}` : ""}
              </Text>

              <View style={styles.actionsRow}>
                {!c.archivedAt && (
                  <>
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.primary }]} onPress={() => enterCompany(c)}>
                      <Text style={{ color: theme.sand, fontSize: 12, fontWeight: "700" }}>➤ Entra</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtnGhost} onPress={() => setEditTarget(c)}>
                      <Text style={{ color: theme.muted, fontSize: 12 }}>✏️ Modifica</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtnGhost} onPress={() => setSubTarget(c)}>
                      <Text style={{ color: theme.muted, fontSize: 12 }}>💳 Piano</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtnGhost, { borderColor: c.status === "suspended" ? theme.green : theme.red }]}
                      onPress={() => toggleSuspend(c)}
                    >
                      <Text style={{ color: c.status === "suspended" ? theme.green : theme.red, fontSize: 12 }}>
                        {c.status === "suspended" ? "✅ Riattiva" : "🚫 Sospendi"}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
                <TouchableOpacity style={[styles.actionBtnGhost, { borderColor: theme.red }]} onPress={() => setDeleteTarget(c)}>
                  <Text style={{ color: theme.red, fontSize: 12 }}>🗑️ {c.archivedAt ? "Elimina" : "Archivia"}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      <CreateCompanyModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => { setShowCreate(false); qc.invalidateQueries({ queryKey: ["superadmin-companies"] }); }}
      />
      {editTarget && (
        <EditCompanyModal
          visible={!!editTarget} company={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => { setEditTarget(null); qc.invalidateQueries({ queryKey: ["superadmin-companies"] }); }}
        />
      )}
      {subTarget && (
        <SubscriptionModal
          visible={!!subTarget} company={subTarget}
          onClose={() => setSubTarget(null)}
          onSaved={() => { setSubTarget(null); qc.invalidateQueries({ queryKey: ["superadmin-companies"] }); }}
        />
      )}
      {deleteTarget && (
        <DeleteModal
          visible={!!deleteTarget} company={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => { setDeleteTarget(null); qc.invalidateQueries({ queryKey: ["superadmin-companies"] }); }}
        />
      )}
    </SafeAreaView>
  );
}

// ── Modals ───────────────────────────────────────────────────────────────

function CreateCompanyModal({ visible, onClose, onCreated }: any) {
  const [companyName, setCompanyName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const reset = () => { setCompanyName(""); setAdminEmail(""); setAdminName(""); setAdminPassword(""); setError(""); };

  const handleCreate = async () => {
    setError("");
    if (!companyName || !adminEmail || !adminPassword) { setError("Compila tutti i campi obbligatori"); return; }
    setLoading(true);
    const res = await post("/api/superadmin/companies", {
      name: companyName, adminEmail, adminName: adminName || adminEmail, adminPassword,
    });
    setLoading(false);
    if (!res.ok) { const e = await res.json(); setError(e.message ?? "Errore"); return; }
    reset();
    onCreated();
  };

  return (
    <AppModal visible={visible} title="➕ Nuova Azienda" onClose={onClose}>
      <Text style={mstyles.label}>Nome Azienda *</Text>
      <TextInput style={mstyles.input} value={companyName} onChangeText={setCompanyName} placeholder="Es. Eliservice SRL" placeholderTextColor={theme.muted} />
      <Text style={mstyles.label}>Email Admin *</Text>
      <TextInput style={mstyles.input} value={adminEmail} onChangeText={setAdminEmail} placeholder="admin@azienda.it" placeholderTextColor={theme.muted} autoCapitalize="none" keyboardType="email-address" />
      <Text style={mstyles.label}>Nome Admin</Text>
      <TextInput style={mstyles.input} value={adminName} onChangeText={setAdminName} placeholder="Mario Rossi" placeholderTextColor={theme.muted} />
      <Text style={mstyles.label}>Password Admin *</Text>
      <TextInput style={mstyles.input} value={adminPassword} onChangeText={setAdminPassword} secureTextEntry placeholderTextColor={theme.muted} />
      {error ? <Text style={mstyles.error}>{error}</Text> : null}
      <TouchableOpacity style={[mstyles.saveBtn, { backgroundColor: theme.green }]} onPress={handleCreate} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={[mstyles.saveBtnText, { color: "#fff" }]}>Crea Azienda</Text>}
      </TouchableOpacity>
    </AppModal>
  );
}

function EditCompanyModal({ visible, company, onClose, onSaved }: any) {
  const [name, setName] = useState(company.name);
  const [email, setEmail] = useState(company.email ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    setError("");
    setLoading(true);
    const res = await patch(`/api/superadmin/companies/${company.id}`, { name, email });
    setLoading(false);
    if (!res.ok) { const e = await res.json(); setError(e.message ?? "Errore"); return; }
    onSaved();
  };

  return (
    <AppModal visible={visible} title="Modifica Azienda" onClose={onClose}>
      <Text style={mstyles.label}>Nome</Text>
      <TextInput style={mstyles.input} value={name} onChangeText={setName} placeholderTextColor={theme.muted} />
      <Text style={mstyles.label}>Email Admin</Text>
      <TextInput style={mstyles.input} value={email} onChangeText={setEmail} placeholderTextColor={theme.muted} autoCapitalize="none" />
      {error ? <Text style={mstyles.error}>{error}</Text> : null}
      <TouchableOpacity style={mstyles.saveBtn} onPress={handleSave} disabled={loading}>
        {loading ? <ActivityIndicator color={theme.sand} /> : <Text style={mstyles.saveBtnText}>Salva</Text>}
      </TouchableOpacity>
    </AppModal>
  );
}

function SubscriptionModal({ visible, company, onClose, onSaved }: any) {
  const [plan, setPlan] = useState(company.plan);
  const [status, setStatus] = useState(company.status);
  const [extendDays, setExtendDays] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const PLANS = [
    { v: "trial", l: "Trial" }, { v: "starter", l: "Starter €29" },
    { v: "pro", l: "Pro €79" }, { v: "business", l: "Business €199" },
  ];
  const STATUSES = [
    { v: "trial", l: "Trial" }, { v: "active", l: "Attivo" },
    { v: "suspended", l: "Sospeso" }, { v: "cancelled", l: "Cancellato" },
  ];

  const handleSave = async () => {
    setError("");
    setLoading(true);
    const body: Record<string, unknown> = { plan, status };
    if (extendDays) body.extendDays = parseInt(extendDays, 10);
    const res = await patch(`/api/superadmin/companies/${company.id}/subscription`, body);
    setLoading(false);
    if (!res.ok) { const e = await res.json(); setError(e.message ?? "Errore"); return; }
    onSaved();
  };

  return (
    <AppModal visible={visible} title={`Abbonamento — ${company.name}`} onClose={onClose}>
      <Text style={mstyles.label}>Piano</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
        {PLANS.map((p) => (
          <TouchableOpacity key={p.v} onPress={() => setPlan(p.v)} style={[mstyles.chip, plan === p.v && mstyles.chipActive]}>
            <Text style={{ color: plan === p.v ? theme.sand : theme.muted, fontSize: 12 }}>{p.l}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={mstyles.label}>Stato</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
        {STATUSES.map((s) => (
          <TouchableOpacity key={s.v} onPress={() => setStatus(s.v)} style={[mstyles.chip, status === s.v && mstyles.chipActive]}>
            <Text style={{ color: status === s.v ? theme.sand : theme.muted, fontSize: 12 }}>{s.l}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={mstyles.label}>Estendi trial di N giorni (opzionale)</Text>
      <TextInput style={mstyles.input} value={extendDays} onChangeText={setExtendDays} placeholder="es. 30" placeholderTextColor={theme.muted} keyboardType="numeric" />
      {error ? <Text style={mstyles.error}>{error}</Text> : null}
      <TouchableOpacity style={mstyles.saveBtn} onPress={handleSave} disabled={loading}>
        {loading ? <ActivityIndicator color={theme.sand} /> : <Text style={mstyles.saveBtnText}>Salva</Text>}
      </TouchableOpacity>
    </AppModal>
  );
}

function DeleteModal({ visible, company, onClose, onDeleted }: any) {
  const [mode, setMode] = useState<"archive" | "purge">("archive");
  const [confirmName, setConfirmName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    setError("");
    if (confirmName !== company.name) { setError("Nome azienda non corrisponde"); return; }
    setLoading(true);
    const res = await del(`/api/superadmin/companies/${company.id}`);
    setLoading(false);
    if (!res.ok) { const e = await res.json().catch(() => ({})); setError(e.message ?? "Errore"); return; }
    onDeleted();
  };

  return (
    <AppModal visible={visible} title="⚠️ Elimina Azienda" onClose={onClose}>
      <Text style={{ color: theme.text, fontSize: 13, marginBottom: 12 }}>
        Stai per eliminare: <Text style={{ fontWeight: "700" }}>{company.name}</Text>
      </Text>

      <Text style={mstyles.label}>Modalità</Text>
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
        <TouchableOpacity onPress={() => setMode("archive")} style={[mstyles.chip, mode === "archive" && mstyles.chipActive, { flex: 1, alignItems: "center" }]}>
          <Text style={{ color: mode === "archive" ? theme.sand : theme.muted, fontSize: 12 }}>Archivia</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setMode("purge")} style={[mstyles.chip, mode === "purge" && { borderColor: theme.red, backgroundColor: "rgba(239,68,68,0.1)" }, { flex: 1, alignItems: "center" }]}>
          <Text style={{ color: mode === "purge" ? theme.red : theme.muted, fontSize: 12 }}>Elimina definitivamente</Text>
        </TouchableOpacity>
      </View>

      <Text style={mstyles.label}>Conferma nome azienda</Text>
      <TextInput style={mstyles.input} value={confirmName} onChangeText={setConfirmName} placeholder={company.name} placeholderTextColor={theme.muted} />

      <Text style={mstyles.label}>La tua password super-admin</Text>
      <TextInput style={mstyles.input} value={password} onChangeText={setPassword} secureTextEntry placeholderTextColor={theme.muted} />

      {error ? <Text style={mstyles.error}>{error}</Text> : null}

      <TouchableOpacity style={[mstyles.saveBtn, { backgroundColor: theme.red }]} onPress={handleDelete} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={[mstyles.saveBtnText, { color: "#fff" }]}>{mode === "archive" ? "Archivia" : "Elimina Definitivamente"}</Text>}
      </TouchableOpacity>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.dark },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12,
  },
  brand: { color: theme.sand, fontWeight: "800", fontSize: 17 },
  brandSub: { color: theme.muted, fontSize: 11 },
  createBtn: { backgroundColor: theme.green, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  logoutBtn: { borderWidth: 1, borderColor: theme.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  tabRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, marginBottom: 10 },
  tabBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  tabBtnActive: { backgroundColor: theme.primary },
  search: {
    marginHorizontal: 16, marginBottom: 6, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border,
    borderRadius: 8, padding: 10, color: theme.text, fontSize: 13,
  },
  card: { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 14, marginBottom: 10 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 },
  companyName: { color: theme.sand, fontWeight: "700", fontSize: 15 },
  companyEmail: { color: theme.muted, fontSize: 12, marginTop: 4 },
  companyMeta: { color: theme.muted, fontSize: 11, marginTop: 2 },
  badge: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  actionsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  actionBtn: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  actionBtnGhost: { borderWidth: 1, borderColor: theme.border, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
});

const mstyles = StyleSheet.create({
  label: { fontSize: 12, color: theme.muted, marginBottom: 6, marginTop: 8 },
  input: {
    backgroundColor: theme.dark, borderWidth: 1, borderColor: theme.border, borderRadius: 8,
    padding: 12, color: theme.text, fontSize: 15,
  },
  chip: { borderWidth: 1, borderColor: theme.border, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  chipActive: { borderColor: theme.sand, backgroundColor: "rgba(214,196,160,0.1)" },
  error: {
    color: theme.red, backgroundColor: "rgba(239,68,68,0.1)", borderWidth: 1, borderColor: "rgba(239,68,68,0.3)",
    borderRadius: 8, padding: 10, marginTop: 12, fontSize: 12,
  },
  saveBtn: { backgroundColor: theme.primary, borderRadius: 10, padding: 14, alignItems: "center", marginTop: 20, marginBottom: 10 },
  saveBtnText: { color: theme.sand, fontWeight: "700", fontSize: 15 },
});
