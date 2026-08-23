import { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { get, post, patch, del } from "../../lib/api";
import { theme } from "../../lib/theme";
import { useLang, tr } from "../../lib/lang";
import { AppModal } from "../../components/Modal";
import { FUEL_TYPES, getFuelColor, AVIATION_TYPES, GROUND_TYPES } from "../../lib/fuel-types";

type Section = "bases" | "tanks" | "fleet" | "users";

export default function AdminPanel() {
  const qc = useQueryClient();
  const { t } = useLang();
  const [open, setOpen] = useState<Section | null>("tanks");
  const [modal, setModal] = useState<null | { kind: "tank" | "vehicle" | "base"; item?: any }>(null);
  const [refreshing, setRefreshing] = useState(false);

  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => get("/api/admin/me/role") });
  const role = (me as any)?.role;
  const isAdmin = role === "admin" || role === "superadmin";
  const isSuperAdmin = role === "superadmin";

  const { data: bases = [] } = useQuery({ queryKey: ["bases"], queryFn: () => get("/api/bases"), enabled: isAdmin });
  const { data: tanks = [] } = useQuery({ queryKey: ["tanks"], queryFn: () => get("/api/tanks"), enabled: isAdmin });
  const { data: fleet = [] } = useQuery({ queryKey: ["helicopters"], queryFn: () => get("/api/helicopters"), enabled: isAdmin });
  const { data: users = [] } = useQuery({ queryKey: ["company-users"], queryFn: () => get("/api/companies/me/users"), enabled: isAdmin });

  const baseList: any[] = Array.isArray(bases) ? bases : [];
  const tankList: any[] = Array.isArray(tanks) ? tanks : [];
  const fleetList: any[] = Array.isArray(fleet) ? fleet : [];
  const userList: any[] = Array.isArray(users) ? users : [];

  const refreshAll = async () => {
    setRefreshing(true);
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["bases"] }),
      qc.invalidateQueries({ queryKey: ["tanks"] }),
      qc.invalidateQueries({ queryKey: ["helicopters"] }),
      qc.invalidateQueries({ queryKey: ["company-users"] }),
    ]);
    setRefreshing(false);
  };

  if (!me) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <ActivityIndicator color={theme.sand} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <View style={styles.lockBox}>
          <Text style={{ fontSize: 40, marginBottom: 12 }}>🔒</Text>
          <Text style={styles.lockText}>{t("adminOnly")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const confirmDelete = (label: string, path: string, keys: string[]) => {
    Alert.alert(label, t("confirmDelete"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("delete"), style: "destructive", onPress: async () => {
          const r = await del(path);
          if (!r.ok) {
            const b = await r.json().catch(() => null);
            Alert.alert(t("error"), (b as any)?.error ?? `HTTP ${r.status}`);
            return;
          }
          keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshAll} tintColor={theme.sand} />}
      >
        <Text style={styles.h1}>⚙️ {t("config")}</Text>

        {/* ── BASI ── */}
        <Accordion
          title={`📍 ${t("bases")}`} count={baseList.length}
          expanded={open === "bases"} onToggle={() => setOpen(open === "bases" ? null : "bases")}
        >
          {baseList.length === 0 && <Text style={styles.empty}>{t("noData")}</Text>}
          {baseList.map((b) => (
            <Row
              key={b.id} title={b.name ?? "—"} subtitle={b.location ?? "—"}
              onEdit={() => setModal({ kind: "base", item: b })}
              onDelete={() => confirmDelete(b.name ?? "", `/api/bases/${b.id}`, ["bases", "tanks"])}
              t={t}
            />
          ))}
          <AddButton label={`+ ${t("addBase")}`} onPress={() => setModal({ kind: "base" })} />
        </Accordion>

        {/* ── CISTERNE ── */}
        <Accordion
          title={`🛢️ ${t("tanks")}`} count={tankList.length}
          expanded={open === "tanks"} onToggle={() => setOpen(open === "tanks" ? null : "tanks")}
        >
          {tankList.length === 0 && <Text style={styles.empty}>{t("noData")}</Text>}
          {tankList.map((tk) => {
            const pct = tk.capacity > 0 ? Math.round((tk.currentLevel / tk.capacity) * 100) : 0;
            const baseName = baseList.find((b) => b.id === tk.baseId)?.name;
            return (
              <Row
                key={tk.id}
                title={tk.name ?? "—"}
                subtitle={`${Math.round(tk.currentLevel ?? 0)} / ${Math.round(tk.capacity ?? 0)} L · ${pct}%${baseName ? " · 📍 " + baseName : ""}`}
                badge={tk.fuelType} badgeColor={getFuelColor(tk.fuelType)}
                onEdit={() => setModal({ kind: "tank", item: tk })}
                onDelete={() => confirmDelete(tk.name ?? "", `/api/tanks/${tk.id}`, ["tanks", "movements"])}
                t={t}
              />
            );
          })}
          <AddButton label={`+ ${t("addTank")}`} onPress={() => setModal({ kind: "tank" })} />
        </Accordion>

        {/* ── FLOTTA ── */}
        <Accordion
          title={`🚁 ${t("fleet")}`} count={fleetList.length}
          expanded={open === "fleet"} onToggle={() => setOpen(open === "fleet" ? null : "fleet")}
        >
          {fleetList.length === 0 && <Text style={styles.empty}>{t("noData")}</Text>}
          {fleetList.map((v) => (
            <Row
              key={v.id}
              title={`${v.category === "ground" ? "🚜" : "✈️"} ${v.name ?? "—"}`}
              subtitle={[v.vehicleType, v.identifier, v.model].filter(Boolean).join(" · ") || "—"}
              badge={v.fuelType ?? "⚠︎ —"} badgeColor={v.fuelType ? getFuelColor(v.fuelType) : "#ef4444"}
              onEdit={() => setModal({ kind: "vehicle", item: v })}
              onDelete={() => confirmDelete(v.name ?? "", `/api/helicopters/${v.id}`, ["helicopters", "movements"])}
              t={t}
            />
          ))}
          <AddButton label={`+ ${t("addVehicle")}`} onPress={() => setModal({ kind: "vehicle" })} />
        </Accordion>

        {/* ── UTENTI ── */}
        <Accordion
          title={`👥 ${t("users")}`} count={userList.length}
          expanded={open === "users"} onToggle={() => setOpen(open === "users" ? null : "users")}
        >
          {userList.map((u) => (
            <View key={u.id} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{u.name ?? "—"}</Text>
                <Text style={styles.rowSub}>{u.email ?? "—"}</Text>
              </View>
              <View style={[styles.badge, { borderColor: u.role === "admin" ? theme.green : theme.muted }]}>
                <Text style={[styles.badgeText, { color: u.role === "admin" ? theme.green : theme.muted }]}>
                  {u.role === "admin" ? t("adminRole") : t("operatorRole")}
                </Text>
              </View>
            </View>
          ))}
          <InviteBox t={t} />
        </Accordion>
      </ScrollView>

      {modal?.kind === "tank" && (
        <TankModal
          tank={modal.item} bases={baseList} isSuperAdmin={isSuperAdmin} t={t}
          onClose={() => setModal(null)}
          onSaved={() => { qc.invalidateQueries({ queryKey: ["tanks"] }); setModal(null); }}
        />
      )}
      {modal?.kind === "vehicle" && (
        <VehicleModal
          vehicle={modal.item} isSuperAdmin={isSuperAdmin} t={t}
          onClose={() => setModal(null)}
          onSaved={() => { qc.invalidateQueries({ queryKey: ["helicopters"] }); setModal(null); }}
        />
      )}
      {modal?.kind === "base" && (
        <BaseModal
          base={modal.item} t={t}
          onClose={() => setModal(null)}
          onSaved={() => { qc.invalidateQueries({ queryKey: ["bases"] }); setModal(null); }}
        />
      )}
    </SafeAreaView>
  );
}

// ── UI helpers ──────────────────────────────────────────────────────────────
function Accordion({ title, count, expanded, onToggle, children }: any) {
  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.accHeader} onPress={onToggle} activeOpacity={0.7}>
        <Text style={styles.accTitle}>{title}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={styles.accCount}>{count}</Text>
          <Text style={styles.accArrow}>{expanded ? "▲" : "▼"}</Text>
        </View>
      </TouchableOpacity>
      {expanded && <View style={{ marginTop: 10 }}>{children}</View>}
    </View>
  );
}

function Row({ title, subtitle, badge, badgeColor, onEdit, onDelete, t }: any) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSub}>{subtitle}</Text>
      </View>
      {badge && (
        <View style={[styles.badge, { borderColor: badgeColor, marginRight: 8 }]}>
          <Text style={[styles.badgeText, { color: badgeColor === "#1f2937" ? theme.text : badgeColor }]}>{badge}</Text>
        </View>
      )}
      <TouchableOpacity onPress={onEdit} style={styles.iconBtn}><Text style={{ fontSize: 16 }}>✏️</Text></TouchableOpacity>
      <TouchableOpacity onPress={onDelete} style={styles.iconBtn}><Text style={{ fontSize: 16 }}>🗑️</Text></TouchableOpacity>
    </View>
  );
}

function AddButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.addBtn} onPress={onPress}>
      <Text style={styles.addBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

function Field({ label, children }: any) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function Chips({ options, value, onChange, colorOf }: any) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {options.map((o: any) => {
        const val = typeof o === "string" ? o : o.value;
        const label = typeof o === "string" ? o : o.label;
        const col = colorOf ? colorOf(val) : theme.sand;
        const active = value === val;
        return (
          <TouchableOpacity
            key={val} onPress={() => onChange(val)}
            style={[styles.chip, { borderColor: active ? col : theme.border, backgroundColor: active ? col + "33" : "transparent" }]}
          >
            <Text style={{ fontSize: 12, color: active ? theme.text : theme.muted, fontWeight: active ? "700" : "400" }}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── Modals ──────────────────────────────────────────────────────────────────
function TankModal({ tank, bases, isSuperAdmin, t, onClose, onSaved }: any) {
  const [form, setForm] = useState({
    name: tank?.name ?? "",
    capacity: String(tank?.capacity ?? ""),
    currentLevel: String(tank?.currentLevel ?? ""),
    fuelType: tank?.fuelType ?? "Jet-A1",
    baseId: tank?.baseId ?? "",
    alertThreshold: String(tank?.alertThreshold ?? 1500),
  });
  const [saving, setSaving] = useState(false);
  const canEditFuel = isSuperAdmin || !tank;

  const save = async () => {
    if (!form.name.trim()) return Alert.alert(t("error"), `${t("name")} ${t("required")}`);
    if (!Number(form.capacity)) return Alert.alert(t("error"), `${t("capacity")} ${t("required")}`);
    setSaving(true);
    try {
      const body: any = {
        name: form.name.trim(),
        capacity: Number(form.capacity),
        currentLevel: Number(form.currentLevel || 0),
        baseId: form.baseId || null,
        alertThreshold: Number(form.alertThreshold || 0),
      };
      if (canEditFuel) body.fuelType = form.fuelType;
      const r = tank ? await patch(`/api/tanks/${tank.id}`, body) : await post("/api/tanks", body);
      if (!r.ok) {
        const b = await r.json().catch(() => null);
        throw new Error((b as any)?.error ?? `HTTP ${r.status}`);
      }
      onSaved();
    } catch (e: any) {
      Alert.alert(t("error"), e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppModal visible title={tank ? t("editTank") : t("addTank")} onClose={onClose}>
      <Field label={t("name")}>
        <TextInput style={styles.input} value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} placeholderTextColor={theme.muted} />
      </Field>
      <Field label={t("capacity")}>
        <TextInput style={styles.input} keyboardType="numeric" value={form.capacity} onChangeText={(v) => setForm({ ...form, capacity: v })} />
      </Field>
      <Field label={t("currentLevel")}>
        <TextInput style={styles.input} keyboardType="numeric" value={form.currentLevel} onChangeText={(v) => setForm({ ...form, currentLevel: v })} />
      </Field>
      <Field label={t("fuelType")}>
        {canEditFuel ? (
          <Chips options={FUEL_TYPES} value={form.fuelType} onChange={(v: string) => setForm({ ...form, fuelType: v })} colorOf={getFuelColor} />
        ) : (
          <>
            <Text style={{ color: theme.text, fontWeight: "700" }}>🔒 {form.fuelType}</Text>
            <Text style={styles.hint}>{t("fuelTypeLocked")}</Text>
          </>
        )}
      </Field>
      <Field label={t("alertThreshold")}>
        <TextInput style={styles.input} keyboardType="numeric" value={form.alertThreshold} onChangeText={(v) => setForm({ ...form, alertThreshold: v })} />
      </Field>
      <Field label={t("base")}>
        <Chips
          options={[{ value: "", label: t("noneF") }, ...bases.map((b: any) => ({ value: b.id, label: b.name }))]}
          value={form.baseId} onChange={(v: string) => setForm({ ...form, baseId: v })}
        />
      </Field>
      <SaveBar saving={saving} onCancel={onClose} onSave={save} t={t} />
    </AppModal>
  );
}

function VehicleModal({ vehicle, isSuperAdmin, t, onClose, onSaved }: any) {
  const [category, setCategory] = useState<"aviation" | "ground">(vehicle?.category ?? "aviation");
  const [form, setForm] = useState({
    name: vehicle?.name ?? "",
    identifier: vehicle?.identifier ?? "",
    model: vehicle?.model ?? "",
    capacity: String(vehicle?.capacity ?? ""),
    vehicleType: vehicle?.vehicleType ?? "Elicottero",
    fuelType: vehicle?.fuelType ?? "Jet-A1",
    customType: "",
  });
  const [saving, setSaving] = useState(false);
  // Il carburante si imposta liberamente su un mezzo nuovo o non ancora assegnato.
  // Se e' gia' assegnato, solo il superadmin puo' cambiarlo (come per le cisterne).
  const canEditFuel = isSuperAdmin || !vehicle?.fuelType;
  const known: string[] = [...AVIATION_TYPES, ...GROUND_TYPES];
  const typeOptions = category === "aviation" ? [...AVIATION_TYPES] : [...GROUND_TYPES];

  const save = async () => {
    if (!form.name.trim()) return Alert.alert(t("error"), `${t("name")} ${t("required")}`);
    setSaving(true);
    try {
      const vt = form.vehicleType === "Altro" ? form.customType.trim() : form.vehicleType;
      const body = {
        name: form.name.trim(),
        identifier: form.identifier.trim() || null,
        model: form.model.trim() || null,
        capacity: form.capacity ? Number(form.capacity) : null,
        category,
        vehicleType: vt,
        ...(canEditFuel ? { fuelType: form.fuelType } : {}),
      };
      const r = vehicle ? await patch(`/api/helicopters/${vehicle.id}`, body) : await post("/api/helicopters", body);
      if (!r.ok) {
        const b = await r.json().catch(() => null);
        throw new Error((b as any)?.error ?? `HTTP ${r.status}`);
      }
      onSaved();
    } catch (e: any) {
      Alert.alert(t("error"), e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppModal visible title={vehicle ? t("editVehicle") : t("addVehicle")} onClose={onClose}>
      <Field label={t("category")}>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {(["aviation", "ground"] as const).map((cat) => (
            <TouchableOpacity
              key={cat}
              onPress={() => { setCategory(cat); setForm({ ...form, vehicleType: cat === "aviation" ? "Elicottero" : "Auto" }); }}
              style={[styles.catBtn, { borderColor: category === cat ? theme.sand : theme.border, backgroundColor: category === cat ? "rgba(214,196,160,0.1)" : "transparent" }]}
            >
              <Text style={{ color: category === cat ? theme.sand : theme.muted, fontWeight: "600" }}>
                {cat === "aviation" ? `✈️ ${t("aviation")}` : `🚜 ${t("ground")}`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Field>
      <Field label={t("vehicleTypeLabel")}>
        <Chips options={typeOptions} value={known.includes(form.vehicleType) ? form.vehicleType : "Altro"} onChange={(v: string) => setForm({ ...form, vehicleType: v })} />
      </Field>
      {form.vehicleType === "Altro" && (
        <Field label={t("specifyType")}>
          <TextInput style={styles.input} value={form.customType} onChangeText={(v) => setForm({ ...form, customType: v })} />
        </Field>
      )}
      <Field label={t("description")}>
        <TextInput style={styles.input} value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} />
      </Field>
      <Field label={category === "aviation" ? `${t("identifier")} (es. I-PGVV)` : t("plate")}>
        <TextInput style={styles.input} value={form.identifier} onChangeText={(v) => setForm({ ...form, identifier: v })} autoCapitalize="characters" />
      </Field>
      {category === "aviation" && (
        <Field label={t("model")}>
          <TextInput style={styles.input} value={form.model} onChangeText={(v) => setForm({ ...form, model: v })} />
        </Field>
      )}
      <Field label={`${t("fuelType")} *`}>
        {canEditFuel ? (
          <>
            <Chips options={FUEL_TYPES} value={form.fuelType} onChange={(v: string) => setForm({ ...form, fuelType: v })} colorOf={getFuelColor} />
            <Text style={styles.hint}>{t("vehicleFuelHint")}</Text>
          </>
        ) : (
          <>
            <Text style={{ color: theme.text, fontWeight: "700" }}>🔒 {form.fuelType}</Text>
            <Text style={styles.hint}>{t("vehicleFuelLocked")}</Text>
          </>
        )}
      </Field>
      <Field label={t("capacityOpt")}>
        <TextInput style={styles.input} keyboardType="numeric" value={form.capacity} onChangeText={(v) => setForm({ ...form, capacity: v })} />
      </Field>
      <SaveBar saving={saving} onCancel={onClose} onSave={save} t={t} />
    </AppModal>
  );
}

function BaseModal({ base, t, onClose, onSaved }: any) {
  const [form, setForm] = useState({ name: base?.name ?? "", location: base?.location ?? "" });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.name.trim()) return Alert.alert(t("error"), `${t("name")} ${t("required")}`);
    setSaving(true);
    try {
      const body = { name: form.name.trim(), location: form.location.trim() || null };
      const r = base ? await patch(`/api/bases/${base.id}`, body) : await post("/api/bases", body);
      if (!r.ok) {
        const b = await r.json().catch(() => null);
        throw new Error((b as any)?.error ?? `HTTP ${r.status}`);
      }
      onSaved();
    } catch (e: any) {
      Alert.alert(t("error"), e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppModal visible title={base ? t("editBase") : t("addBase")} onClose={onClose}>
      <Field label={t("name")}>
        <TextInput style={styles.input} value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} />
      </Field>
      <Field label={t("location")}>
        <TextInput style={styles.input} value={form.location} onChangeText={(v) => setForm({ ...form, location: v })} />
      </Field>
      <SaveBar saving={saving} onCancel={onClose} onSave={save} t={t} />
    </AppModal>
  );
}

function InviteBox({ t }: any) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"operator" | "admin">("operator");
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);

  const invite = async () => {
    if (!email.trim()) return Alert.alert(t("error"), `${t("email")} ${t("required")}`);
    setBusy(true);
    try {
      const r = await post("/api/companies/me/invite", { email: email.trim(), role });
      const b = await r.json().catch(() => null);
      if (!r.ok) throw new Error((b as any)?.error ?? `HTTP ${r.status}`);
      setLink((b as any).inviteUrl ?? "");
      setEmail("");
    } catch (e: any) {
      Alert.alert(t("error"), e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 12 }}>
      <Text style={styles.label}>📨 {t("inviteUser")}</Text>
      <TextInput
        style={styles.input} value={email} onChangeText={setEmail} placeholder="email@azienda.it"
        placeholderTextColor={theme.muted} autoCapitalize="none" keyboardType="email-address"
      />
      <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
        {(["operator", "admin"] as const).map((r) => (
          <TouchableOpacity
            key={r} onPress={() => setRole(r)}
            style={[styles.chip, { borderColor: role === r ? theme.sand : theme.border, backgroundColor: role === r ? "rgba(214,196,160,0.1)" : "transparent" }]}
          >
            <Text style={{ fontSize: 12, color: role === r ? theme.sand : theme.muted }}>
              {r === "admin" ? t("adminRole") : t("operatorRole")}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={[styles.primaryBtn, { flex: 1 }]} onPress={invite} disabled={busy}>
          <Text style={styles.primaryBtnText}>{busy ? t("loading") : `📨 ${t("invite")}`}</Text>
        </TouchableOpacity>
      </View>
      {!!link && (
        <View style={styles.linkBox}>
          <Text style={{ color: theme.green, fontSize: 11, marginBottom: 4 }}>{t("inviteLink")}</Text>
          <Text selectable style={{ color: theme.text, fontSize: 11 }}>{link}</Text>
        </View>
      )}
    </View>
  );
}

function SaveBar({ saving, onCancel, onSave, t }: any) {
  return (
    <View style={{ flexDirection: "row", gap: 8, marginTop: 8, marginBottom: 8 }}>
      <TouchableOpacity style={[styles.ghostBtn, { flex: 1 }]} onPress={onCancel}>
        <Text style={{ color: theme.muted, fontWeight: "600" }}>{t("cancel")}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.primaryBtn, { flex: 2 }]} onPress={onSave} disabled={saving}>
        <Text style={styles.primaryBtnText}>{saving ? tr("loading") : t("save")}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.dark },
  h1: { fontSize: 20, fontWeight: "700", color: theme.sand, marginBottom: 16 },
  card: {
    backgroundColor: theme.card, borderRadius: 12, borderWidth: 1, borderColor: theme.border,
    padding: 14, marginBottom: 12,
  },
  accHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  accTitle: { fontSize: 15, fontWeight: "700", color: theme.text },
  accCount: { fontSize: 12, color: theme.muted, backgroundColor: theme.dark, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  accArrow: { fontSize: 10, color: theme.muted },
  row: {
    flexDirection: "row", alignItems: "center", backgroundColor: theme.dark,
    borderRadius: 8, padding: 10, marginBottom: 8,
  },
  rowTitle: { color: theme.text, fontWeight: "600", fontSize: 14 },
  rowSub: { color: theme.muted, fontSize: 11, marginTop: 2 },
  badge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontWeight: "700" },
  iconBtn: { padding: 6 },
  addBtn: {
    borderWidth: 1, borderColor: theme.sand, borderStyle: "dashed", borderRadius: 8,
    padding: 10, alignItems: "center", marginTop: 4,
  },
  addBtnText: { color: theme.sand, fontWeight: "600", fontSize: 13 },
  empty: { color: theme.muted, fontSize: 12, textAlign: "center", paddingVertical: 8 },
  label: { color: theme.muted, fontSize: 12, marginBottom: 6 },
  hint: { color: theme.muted, fontSize: 10, marginTop: 4, fontStyle: "italic" },
  input: {
    backgroundColor: theme.dark, borderWidth: 1, borderColor: theme.border, borderRadius: 8,
    padding: 10, color: theme.text, fontSize: 14,
  },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  catBtn: { flex: 1, borderWidth: 1, borderRadius: 8, padding: 10, alignItems: "center" },
  primaryBtn: { backgroundColor: theme.primary, borderRadius: 8, padding: 12, alignItems: "center", justifyContent: "center" },
  primaryBtnText: { color: theme.sand, fontWeight: "700", fontSize: 13 },
  ghostBtn: { borderWidth: 1, borderColor: theme.border, borderRadius: 8, padding: 12, alignItems: "center" },
  linkBox: {
    marginTop: 10, backgroundColor: "rgba(34,197,94,0.1)", borderWidth: 1,
    borderColor: "rgba(34,197,94,0.3)", borderRadius: 8, padding: 10,
  },
  lockBox: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  lockText: { color: theme.muted, textAlign: "center", fontSize: 14 },
});
