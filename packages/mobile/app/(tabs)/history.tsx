import { View, Text, StyleSheet, FlatList, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { get } from "../../lib/api";
import { theme } from "../../lib/theme";

const MOV_LABEL: Record<string, string> = { refuel: "Rifornimento", consumption: "Consumo", transfer: "Trasferimento", drain_check: "Drain Check" };
const MOV_ICON: Record<string, string> = { refuel: "⬆️", consumption: "⬇️", transfer: "↔️", drain_check: "🔍" };
const MOV_COLOR: Record<string, string> = { refuel: theme.green, consumption: theme.orange, transfer: theme.blue, drain_check: theme.purple };

export default function History() {
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => get("/api/admin/me/role") });
  const { data: movements = [] } = useQuery({ queryKey: ["movements"], queryFn: () => get("/api/movements"), enabled: !!me });
  const { data: tanks = [] } = useQuery({ queryKey: ["tanks"], queryFn: () => get("/api/tanks"), enabled: !!me });
  const { data: helicopters = [] } = useQuery({ queryKey: ["helicopters"], queryFn: () => get("/api/helicopters"), enabled: !!me });

  const tankMap = Object.fromEntries((tanks as any[]).map((t) => [t.id, t.name]));
  const heliMap = Object.fromEntries((helicopters as any[]).map((h) => [h.id, h.identifier ?? h.name]));

  const onRefresh = async () => {
    setRefreshing(true);
    await qc.invalidateQueries({ queryKey: ["movements"] });
    setRefreshing(false);
  };

  const totalRefuel = (movements as any[]).filter((m) => m.type === "refuel").reduce((s, m) => s + m.liters, 0);
  const totalConsumption = (movements as any[]).filter((m) => m.type === "consumption").reduce((s, m) => s + m.liters, 0);

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <Text style={styles.title}>Storico Movimenti</Text>
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: theme.green }]}>{totalRefuel.toLocaleString()} L</Text>
          <Text style={styles.statLabel}>Rifornimenti</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: theme.orange }]}>{totalConsumption.toLocaleString()} L</Text>
          <Text style={styles.statLabel}>Consumi</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: theme.sand }]}>{(movements as any[]).length}</Text>
          <Text style={styles.statLabel}>Totale</Text>
        </View>
      </View>
      <FlatList
        data={movements as any[]}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 16, paddingTop: 0 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.sand} />}
        ListEmptyComponent={<Text style={{ color: theme.muted, textAlign: "center", padding: 30 }}>Nessun movimento</Text>}
        renderItem={({ item: m }) => (
          <View style={styles.card}>
            <Text style={{ fontSize: 20 }}>{MOV_ICON[m.type]}</Text>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ color: MOV_COLOR[m.type], fontWeight: "700", fontSize: 13 }}>{MOV_LABEL[m.type]}</Text>
              <Text style={styles.cardMeta}>
                {m.tankId ? `📦 ${tankMap[m.tankId] ?? ""}` : ""} {m.helicopterId ? `✈️ ${heliMap[m.helicopterId] ?? ""}` : ""} {m.toTankId ? `→ ${tankMap[m.toTankId] ?? ""}` : ""}
              </Text>
              {m.notes ? <Text style={styles.cardNotes}>{m.notes}</Text> : null}
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ color: theme.text, fontWeight: "700" }}>{m.liters} L</Text>
              <Text style={styles.cardMeta}>{m.date} {m.time}</Text>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
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
});
