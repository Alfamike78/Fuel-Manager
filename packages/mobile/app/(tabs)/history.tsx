import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, TextInput, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { get, patch, del } from "../../lib/api";
import { theme } from "../../lib/theme";
import { useLang } from "../../lib/lang";
import { ExportBox } from "../../components/ExportBox";
import { AppModal } from "../../components/Modal";

const MOV_ICON: Record<string, string> = { refuel: "⬆️", consumption: "⬇️", transfer: "↔️", drain_check: "🔍" };
const MOV_COLOR: Record<string, string> = { refuel: theme.green, consumption: theme.orange, transfer: theme.blue, drain_check: theme.purple };

export default function History() {
  const qc = useQueryClient();
  const { t } = useLang();
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => get("/api/admin/me/role") });
  const { data: movements = [] } = useQuery({ queryKey: ["movements"], queryFn: () => get("/api/movements"), enabled: !!me });
  const { data: tanks = [] } = useQuery({ queryKey: ["tanks"], queryFn: () => get("/api/tanks"), enabled: !!me });
  const { data: helicopters = [] } = useQuery({ queryKey: ["helicopters"], queryFn: () => get("/api/helicopters"), enabled: !!me });

  const role = (me as any)?.role;
  const isAdmin = role === "admin" || role === "superadmin";
  const movList: any[] = Array.isArray(movements) ? movements : [];
  const tankMap = Object.fromEntries((tanks as any[]).map((t) => [t.id, t.name]));
  const heliMap = Object.fromEntries((helicopters as any[]).map((h) => [h.id, h.identifier ?? h.name]));

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["movements"] }),
      qc.invalidateQueries({ queryKey: ["tanks"] }),
    ]);
    setRefreshing(false);
  };

  const askDelete = (m: any) => {
    Alert.alert(
      `${t("delete")} — ${t(m.type)} ${m.liters} L`,
      `${m.date} ${m.time}\n\n${t("deleteMovementWarning")}`,
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("delete"), style: "destructive", onPress: async () => {
            const r = await del(`/api/movements/${m.id}`);
            if (!r.ok) {
              const b = await r.json().catch(() => null);
              Alert.alert(t("error"), (b as any)?.error ?? `HTTP ${r.status}`);
              return;
            }
            qc.invalidateQueries({ queryKey: ["movements"] });
            qc.invalidateQueries({ queryKey: ["tanks"] });
          },
        },
      ],
    );
  };

  const totalRefuel = movList.filter((m) => m.type === "refuel").reduce((s, m) => s + m.liters, 0);
  const totalConsumption = movList.filter((m) => m.type === "consumption").reduce((s, m) => s + m.liters, 0);

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <Text style={styles.title}>{t("movementsHistory")}</Text>
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: theme.green }]}>{totalRefuel.toLocaleString()} L</Text>
          <Text style={styles.statLabel}>{t("refuels")}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: theme.orange }]}>{totalConsumption.toLocaleString()} L</Text>
          <Text style={styles.statLabel}>{t("consumptions")}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: theme.sand }]}>{movList.length}</Text>
          <Text style={styles.statLabel}>{t("total")}</Text>
        </View>
      </View>
      <ExportBox kind="movements" />
      <FlatList
        data={movList}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 16, paddingTop: 0 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.sand} />}
        ListEmptyComponent={<Text style={{ color: theme.muted, textAlign: "center", padding: 30 }}>{t("noMovements")}</Text>}
        renderItem={({ item: m }) => (
          <View style={styles.card}>
            <Text style={{ fontSize: 20 }}>{MOV_ICON[m.type]}</Text>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ color: MOV_COLOR[m.type], fontWeight: "700", fontSize: 13 }}>{t(m.type)}</Text>
              <Text style={styles.cardMeta}>
                {m.tankId ? `📦 ${tankMap[m.tankId] ?? ""}` : ""} {m.helicopterId ? `✈️ ${heliMap[m.helicopterId] ?? ""}` : ""} {m.toTankId ? `→ ${tankMap[m.toTankId] ?? ""}` : ""}
              </Text>
              {m.notes ? <Text style={styles.cardNotes}>{m.notes}</Text> : null}
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ color: theme.text, fontWeight: "700" }}>{m.liters} L</Text>
              <Text style={styles.cardMeta}>{m.date} {m.time}</Text>
              {isAdmin && (
                <View style={{ flexDirection: "row", marginTop: 6 }}>
                  <TouchableOpacity onPress={() => setEditing(m)} style={styles.iconBtn} hitSlop={6}>
                    <Text style={{ fontSize: 15 }}>✏️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => askDelete(m)} style={styles.iconBtn} hitSlop={6}>
                    <Text style={{ fontSize: 15 }}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        )}
      />

      {editing && (
        <EditMovementModal
          movement={editing} t={t}
          onClose={() => setEditing(null)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["movements"] });
            qc.invalidateQueries({ queryKey: ["tanks"] });
            setEditing(null);
          }}
        />
      )}
    </SafeAreaView>
  );
}

/** Modifica movimento — solo admin. Litri, data, ora, note. I livelli cisterna
 *  vengono ricalcolati dal backend in base alla differenza di litri. */
function EditMovementModal({ movement, t, onClose, onSaved }: any) {
  const [form, setForm] = useState({
    liters: String(movement.liters ?? ""),
    date: movement.date ?? "",
    time: movement.time ?? "",
    notes: movement.notes ?? "",
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const liters = Number(form.liters);
    if (!Number.isFinite(liters) || liters <= 0) return Alert.alert(t("error"), t("liters"));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date)) return Alert.alert(t("error"), t("fromDate"));
    if (!/^\d{2}:\d{2}$/.test(form.time)) return Alert.alert(t("error"), `${t("time")} HH:MM`);
    setSaving(true);
    try {
      const r = await patch(`/api/movements/${movement.id}`, {
        liters, date: form.date.trim(), time: form.time.trim(), notes: form.notes.trim() || null,
      });
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
    <AppModal visible title={`✏️ ${t("edit")} — ${t(movement.type)}`} onClose={onClose}>
      <Text style={styles.hint}>{t("editMovementHint")}</Text>
      <View style={{ marginBottom: 12 }}>
        <Text style={styles.label}>{t("liters")}</Text>
        <TextInput style={styles.input} keyboardType="numeric" value={form.liters} onChangeText={(v) => setForm({ ...form, liters: v })} />
      </View>
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>{t("date")}</Text>
          <TextInput style={styles.input} value={form.date} onChangeText={(v) => setForm({ ...form, date: v })} placeholder="2026-08-22" placeholderTextColor={theme.muted} />
        </View>
        <View style={{ width: 110 }}>
          <Text style={styles.label}>{t("time")}</Text>
          <TextInput style={styles.input} value={form.time} onChangeText={(v) => setForm({ ...form, time: v })} placeholder="14:30" placeholderTextColor={theme.muted} />
        </View>
      </View>
      <View style={{ marginBottom: 12 }}>
        <Text style={styles.label}>{t("notes")}</Text>
        <TextInput
          style={[styles.input, { height: 70, textAlignVertical: "top" }]} multiline
          value={form.notes} onChangeText={(v) => setForm({ ...form, notes: v })}
        />
      </View>
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
        <TouchableOpacity style={[styles.ghostBtn, { flex: 1 }]} onPress={onClose}>
          <Text style={{ color: theme.muted, fontWeight: "600" }}>{t("cancel")}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.primaryBtn, { flex: 2, opacity: saving ? 0.6 : 1 }]} onPress={save} disabled={saving}>
          {saving ? <ActivityIndicator color={theme.sand} size="small" /> : <Text style={styles.primaryBtnText}>{t("save")}</Text>}
        </TouchableOpacity>
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.dark },
  title: { fontSize: 20, fontWeight: "800", color: theme.sand, paddingHorizontal: 16, paddingTop: 8, marginBottom: 12 },
  statsRow: { flexDirection: "row", paddingHorizontal: 16, gap: 10, marginBottom: 16 },
  statBox: { flex: 1, backgroundColor: theme.card, borderRadius: 10, padding: 12, alignItems: "center" },
  statValue: { fontSize: 16, fontWeight: "800" },
  statLabel: { fontSize: 10, color: theme.muted, marginTop: 4 },
  card: {
    flexDirection: "row", alignItems: "center", backgroundColor: theme.card, borderWidth: 1,
    borderColor: theme.border, borderRadius: 12, padding: 12, marginBottom: 8,
  },
  cardMeta: { color: theme.muted, fontSize: 11, marginTop: 2 },
  cardNotes: { color: theme.muted, fontSize: 11, marginTop: 4, fontStyle: "italic" },
  iconBtn: { paddingHorizontal: 6, paddingVertical: 2 },
  label: { color: theme.muted, fontSize: 12, marginBottom: 6 },
  hint: { color: theme.muted, fontSize: 11, fontStyle: "italic", marginBottom: 12 },
  input: {
    backgroundColor: theme.dark, borderWidth: 1, borderColor: theme.border, borderRadius: 8,
    padding: 10, color: theme.text, fontSize: 14,
  },
  primaryBtn: { backgroundColor: theme.primary, borderRadius: 8, padding: 12, alignItems: "center", justifyContent: "center" },
  primaryBtnText: { color: theme.sand, fontWeight: "700", fontSize: 13 },
  ghostBtn: { borderWidth: 1, borderColor: theme.border, borderRadius: 8, padding: 12, alignItems: "center" },
});
