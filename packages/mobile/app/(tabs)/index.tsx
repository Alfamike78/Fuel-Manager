import { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
  TextInput, ActivityIndicator, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { get, post } from "../../lib/api";
import { getImpersonatedCompanyId, getImpersonatedCompanyName, clearImpersonation } from "../../lib/auth";
import { useRouter } from "expo-router";
import { theme } from "../../lib/theme";
import { FuelBar } from "../../components/FuelBar";
import { AppModal } from "../../components/Modal";

const MOV_TYPES = ["refuel", "consumption", "transfer", "drain_check"] as const;
const MOV_LABEL: Record<string, string> = { refuel: "Rifornimento", consumption: "Consumo", transfer: "Trasferimento", drain_check: "Drain Check" };
const MOV_ICON: Record<string, string> = { refuel: "⬆️", consumption: "⬇️", transfer: "↔️", drain_check: "🔍" };

export default function Dashboard() {
  const qc = useQueryClient();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [movModal, setMovModal] = useState(false);
  const [drainModal, setDrainModal] = useState<any>(null); // tank object or null

  const impCompanyId = getImpersonatedCompanyId();
  const impCompanyName = getImpersonatedCompanyName();

  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => get("/api/admin/me/role") });
  const { data: company } = useQuery({ queryKey: ["company"], queryFn: () => get("/api/companies/me"), enabled: !!me });
  const { data: tanks = [] } = useQuery({ queryKey: ["tanks"], queryFn: () => get("/api/tanks"), enabled: !!me, refetchInterval: 30000 });
  const { data: helicopters = [] } = useQuery({ queryKey: ["helicopters"], queryFn: () => get("/api/helicopters"), enabled: !!me });
  const { data: movements = [] } = useQuery({ queryKey: ["movements"], queryFn: () => get("/api/movements"), enabled: !!me });

  const isAdmin = (me as any)?.role === "admin" || (me as any)?.role === "superadmin";

  const onRefresh = async () => {
    setRefreshing(true);
    await qc.invalidateQueries({ queryKey: ["tanks"] });
    await qc.invalidateQueries({ queryKey: ["helicopters"] });
    await qc.invalidateQueries({ queryKey: ["movements"] });
    await qc.invalidateQueries({ queryKey: ["company"] });
    setRefreshing(false);
  };

  const lowTanks = (tanks as any[]).filter((t) => (t.currentLevel ?? 0) <= (t.alertThreshold ?? 1500));
  const alertTanks = (tanks as any[]).filter((t) => t.lastDrainCheckQuality && t.lastDrainCheckQuality !== "ok");
  const recentMovements = (movements as any[]).slice(0, 10);
  const tankMap = Object.fromEntries((tanks as any[]).map((t) => [t.id, t.name]));
  const heliMap = Object.fromEntries((helicopters as any[]).map((h) => [h.id, h.identifier ?? h.name]));

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.sand} />}
      >
        {/* Impersonation banner */}
        {impCompanyId && (
          <View style={[styles.banner, { backgroundColor: "rgba(245,158,11,0.15)", borderColor: theme.orange }]}>
            <Text style={{ color: theme.orange, fontSize: 12, flex: 1 }}>🔐 Operi come {impCompanyName}</Text>
            <TouchableOpacity onPress={() => { clearImpersonation(); qc.clear(); router.replace("/(superadmin)"); }}>
              <Text style={{ color: theme.orange, fontWeight: "700", fontSize: 12 }}>ESCI</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.brandName}>{company?.brandName ?? company?.name ?? "PilotCraft"}</Text>
          <Text style={styles.brandSub}>Fuel Manager</Text>
        </View>

        {/* Alerts */}
        {lowTanks.length > 0 && (
          <View style={[styles.banner, { backgroundColor: "rgba(245,158,11,0.12)", borderColor: theme.orange }]}>
            <Text style={{ color: theme.orange, fontSize: 12 }}>
              ⚠️ Livello basso: {lowTanks.map((t) => `${t.name} (${t.currentLevel}L)`).join(", ")}
            </Text>
          </View>
        )}
        {alertTanks.length > 0 && (
          <View style={[styles.banner, { backgroundColor: "rgba(239,68,68,0.12)", borderColor: theme.red }]}>
            <Text style={{ color: theme.red, fontSize: 12 }}>
              🔴 Anomalia: {alertTanks.map((t) => `${t.name} (${t.lastDrainCheckQuality})`).join(", ")}
            </Text>
          </View>
        )}

        {/* Quick actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => setMovModal(true)}>
            <Text style={styles.actionIcon}>⛽</Text>
            <Text style={styles.actionLabel}>Nuovo Movimento</Text>
          </TouchableOpacity>
        </View>

        {/* Tanks */}
        <Text style={styles.sectionTitle}>Cisterne ({(tanks as any[]).length})</Text>
        {(tanks as any[]).map((tank) => {
          const pct = Math.round((tank.currentLevel / tank.capacity) * 100);
          const hasAlert = tank.lastDrainCheckQuality && tank.lastDrainCheckQuality !== "ok";
          return (
            <View key={tank.id} style={styles.card}>
              <View style={styles.rowBetween}>
                <View>
                  <Text style={styles.cardTitle}>{tank.name}</Text>
                  <Text style={styles.cardSub}>{tank.fuelType}</Text>
                </View>
                <TouchableOpacity style={styles.drainBtn} onPress={() => setDrainModal(tank)}>
                  <Text style={{ fontSize: 12, color: theme.sand }}>🔍 Drain Check</Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.rowBetween, { marginTop: 8 }]}>
                <Text style={{ color: theme.text, fontWeight: "700" }}>{tank.currentLevel?.toLocaleString()} L</Text>
                <Text style={{ color: theme.muted }}>{pct}%</Text>
              </View>
              <FuelBar level={tank.currentLevel ?? 0} capacity={tank.capacity} alert={tank.alertThreshold ?? 1500} />
              <Text style={styles.cardMeta}>
                Cap: {tank.capacity?.toLocaleString()} L | Soglia: {tank.alertThreshold?.toLocaleString()} L
              </Text>
              {hasAlert && (
                <Text style={{ color: theme.red, fontSize: 12, marginTop: 6 }}>
                  🔴 Drain check: {tank.lastDrainCheckQuality} — {tank.lastDrainCheckDate}
                </Text>
              )}
              {tank.lastDrainCheckQuality === "ok" && (
                <Text style={{ color: theme.green, fontSize: 12, marginTop: 6 }}>
                  ✅ Drain check OK — {tank.lastDrainCheckDate}
                </Text>
              )}
            </View>
          );
        })}

        {/* Fleet */}
        <Text style={styles.sectionTitle}>Flotta ({(helicopters as any[]).length})</Text>
        {(helicopters as any[]).map((h) => (
          <View key={h.id} style={styles.card}>
            <Text style={styles.cardTitle}>
              {h.category === "aviation" ? "✈️" : "🚜"} {h.vehicleType ?? (h.category === "aviation" ? "Elicottero" : "Mezzo")}
            </Text>
            {h.identifier && <Text style={{ color: theme.sand, fontWeight: "700" }}>{h.identifier}</Text>}
            <Text style={styles.cardSub}>{h.name}</Text>
            {h.model && <Text style={styles.cardMeta}>{h.model}</Text>}
          </View>
        ))}

        {/* Recent movements */}
        <Text style={styles.sectionTitle}>Ultimi Movimenti</Text>
        {recentMovements.length === 0 ? (
          <Text style={{ color: theme.muted, textAlign: "center", padding: 20 }}>Nessun movimento</Text>
        ) : (
          recentMovements.map((m: any) => (
            <View key={m.id} style={[styles.card, { flexDirection: "row", alignItems: "center", gap: 12 }]}>
              <Text style={{ fontSize: 20 }}>{MOV_ICON[m.type]}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.text, fontWeight: "600" }}>{MOV_LABEL[m.type]}</Text>
                <Text style={styles.cardMeta}>
                  {m.tankId ? tankMap[m.tankId] : ""} {m.helicopterId ? `✈️ ${heliMap[m.helicopterId]}` : ""}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ color: theme.text, fontWeight: "700" }}>{m.liters} L</Text>
                <Text style={styles.cardMeta}>{m.date} {m.time}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <NewMovementModal
        visible={movModal}
        tanks={tanks as any[]}
        helicopters={helicopters as any[]}
        onClose={() => setMovModal(false)}
        onSaved={onRefresh}
      />
      <DrainCheckModal
        visible={!!drainModal}
        tank={drainModal}
        onClose={() => setDrainModal(null)}
        onSaved={onRefresh}
      />
    </SafeAreaView>
  );
}

function NewMovementModal({ visible, tanks, helicopters, onClose, onSaved }: any) {
  const now = new Date();
  const [type, setType] = useState<typeof MOV_TYPES[number]>("consumption");
  const [tankId, setTankId] = useState("");
  const [toTankId, setToTankId] = useState("");
  const [helicopterId, setHelicopterId] = useState("");
  const [liters, setLiters] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => { setType("consumption"); setTankId(""); setToTankId(""); setHelicopterId(""); setLiters(""); setNotes(""); };

  const handleSave = async () => {
    if (!tankId || !liters) { Alert.alert("Errore", "Cisterna e litri sono obbligatori"); return; }
    setSaving(true);
    try {
      const res = await post("/api/movements", {
        type, tankId, toTankId: toTankId || undefined, helicopterId: helicopterId || undefined,
        liters: Number(liters), date: now.toISOString().split("T")[0], time: now.toTimeString().slice(0, 5), notes,
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? "Errore"); }
      reset();
      onClose();
      onSaved();
    } catch (e: any) {
      Alert.alert("Errore", e.message ?? "Errore salvataggio");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppModal visible={visible} title={`${MOV_ICON[type]} Nuovo Movimento`} onClose={onClose}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        {MOV_TYPES.map((tp) => (
          <TouchableOpacity
            key={tp}
            onPress={() => setType(tp)}
            style={[mstyles.chip, type === tp && mstyles.chipActive]}
          >
            <Text style={{ color: type === tp ? theme.sand : theme.muted, fontSize: 12 }}>{MOV_ICON[tp]} {MOV_LABEL[tp]}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={mstyles.label}>Cisterna</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
        {tanks.map((tk: any) => (
          <TouchableOpacity key={tk.id} onPress={() => setTankId(tk.id)} style={[mstyles.chip, tankId === tk.id && mstyles.chipActive]}>
            <Text style={{ color: tankId === tk.id ? theme.sand : theme.muted, fontSize: 12 }}>{tk.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {type === "transfer" && (
        <>
          <Text style={mstyles.label}>Cisterna Destinazione</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
            {tanks.filter((tk: any) => tk.id !== tankId).map((tk: any) => (
              <TouchableOpacity key={tk.id} onPress={() => setToTankId(tk.id)} style={[mstyles.chip, toTankId === tk.id && mstyles.chipActive]}>
                <Text style={{ color: toTankId === tk.id ? theme.sand : theme.muted, fontSize: 12 }}>{tk.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {type === "consumption" && (
        <>
          <Text style={mstyles.label}>Mezzo (opzionale)</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
            {helicopters.map((h: any) => (
              <TouchableOpacity key={h.id} onPress={() => setHelicopterId(h.id)} style={[mstyles.chip, helicopterId === h.id && mstyles.chipActive]}>
                <Text style={{ color: helicopterId === h.id ? theme.sand : theme.muted, fontSize: 12 }}>{h.identifier ?? h.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      <Text style={mstyles.label}>Litri</Text>
      <TextInput style={mstyles.input} value={liters} onChangeText={setLiters} keyboardType="numeric" placeholder="es. 500" placeholderTextColor={theme.muted} />

      <Text style={mstyles.label}>Note</Text>
      <TextInput style={mstyles.input} value={notes} onChangeText={setNotes} placeholder="Opzionale" placeholderTextColor={theme.muted} />

      <TouchableOpacity style={mstyles.saveBtn} onPress={handleSave} disabled={saving}>
        {saving ? <ActivityIndicator color={theme.sand} /> : <Text style={mstyles.saveBtnText}>Salva Movimento</Text>}
      </TouchableOpacity>
    </AppModal>
  );
}

function DrainCheckModal({ visible, tank, onClose, onSaved }: any) {
  const now = new Date();
  const [liters, setLiters] = useState("");
  const [quality, setQuality] = useState<"ok" | "water" | "impurities">("ok");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await post("/api/drain-checks", {
        tankId: tank.id, liters: Number(liters || 0), quality, notes,
        date: now.toISOString().split("T")[0], time: now.toTimeString().slice(0, 5),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? "Errore"); }
      setLiters(""); setQuality("ok"); setNotes("");
      onClose();
      onSaved();
    } catch (e: any) {
      Alert.alert("Errore", e.message ?? "Errore salvataggio");
    } finally {
      setSaving(false);
    }
  };

  if (!tank) return null;

  return (
    <AppModal visible={visible} title={`🔍 Drain Check — ${tank.name}`} onClose={onClose}>
      <Text style={mstyles.label}>Litri Erogati</Text>
      <TextInput style={mstyles.input} value={liters} onChangeText={setLiters} keyboardType="numeric" placeholder="0" placeholderTextColor={theme.muted} />

      <Text style={mstyles.label}>Esito</Text>
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
        {[
          { v: "ok", l: "✅ Regolare" },
          { v: "water", l: "💧 Acqua" },
          { v: "impurities", l: "🔴 Impurità" },
        ].map((opt) => (
          <TouchableOpacity key={opt.v} onPress={() => setQuality(opt.v as any)} style={[mstyles.chip, quality === opt.v && mstyles.chipActive, { flex: 1, alignItems: "center" }]}>
            <Text style={{ color: quality === opt.v ? theme.sand : theme.muted, fontSize: 12 }}>{opt.l}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={mstyles.label}>Note</Text>
      <TextInput style={mstyles.input} value={notes} onChangeText={setNotes} placeholder="Opzionale" placeholderTextColor={theme.muted} />

      <TouchableOpacity style={mstyles.saveBtn} onPress={handleSave} disabled={saving}>
        {saving ? <ActivityIndicator color={theme.sand} /> : <Text style={mstyles.saveBtnText}>Salva Drain Check</Text>}
      </TouchableOpacity>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.dark },
  headerRow: { marginBottom: 16 },
  brandName: { fontSize: 20, fontWeight: "800", color: theme.sand },
  brandSub: { fontSize: 11, color: theme.muted, textTransform: "uppercase", letterSpacing: 1 },
  banner: { borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 12, flexDirection: "row", alignItems: "center", gap: 8 },
  actionsRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  actionBtn: {
    flex: 1, backgroundColor: theme.primary, borderRadius: 12, padding: 14,
    alignItems: "center", gap: 4,
  },
  actionIcon: { fontSize: 22 },
  actionLabel: { color: theme.sand, fontWeight: "700", fontSize: 13 },
  sectionTitle: {
    fontSize: 12, fontWeight: "700", color: theme.muted, textTransform: "uppercase",
    letterSpacing: 1, marginTop: 20, marginBottom: 10,
  },
  card: { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 14, marginBottom: 10 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  cardTitle: { color: theme.text, fontWeight: "700", fontSize: 15 },
  cardSub: { color: theme.muted, fontSize: 12, marginTop: 2 },
  cardMeta: { color: theme.muted, fontSize: 11, marginTop: 6 },
  drainBtn: { backgroundColor: "rgba(214,196,160,0.1)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
});

const mstyles = StyleSheet.create({
  label: { fontSize: 12, color: theme.muted, marginBottom: 6, marginTop: 8 },
  input: {
    backgroundColor: theme.dark, borderWidth: 1, borderColor: theme.border, borderRadius: 8,
    padding: 12, color: theme.text, fontSize: 15,
  },
  chip: {
    borderWidth: 1, borderColor: theme.border, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
  },
  chipActive: { borderColor: theme.sand, backgroundColor: "rgba(214,196,160,0.1)" },
  saveBtn: { backgroundColor: theme.primary, borderRadius: 10, padding: 14, alignItems: "center", marginTop: 20, marginBottom: 10 },
  saveBtnText: { color: theme.sand, fontWeight: "700", fontSize: 15 },
});
