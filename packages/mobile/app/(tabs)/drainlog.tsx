import { View, Text, StyleSheet, FlatList, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { get } from "../../lib/api";
import { theme } from "../../lib/theme";

const QUALITY_LABEL: Record<string, string> = { ok: "✅ Regolare", water: "💧 Acqua", impurities: "🔴 Impurità" };
const QUALITY_COLOR: Record<string, string> = { ok: theme.green, water: theme.blue, impurities: theme.red };

export default function DrainLog() {
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => get("/api/admin/me/role") });
  const { data: drainChecks = [] } = useQuery({ queryKey: ["drainChecks"], queryFn: () => get("/api/drain-checks"), enabled: !!me });
  const { data: tanks = [] } = useQuery({ queryKey: ["tanks"], queryFn: () => get("/api/tanks"), enabled: !!me });
  const { data: helicopters = [] } = useQuery({ queryKey: ["helicopters"], queryFn: () => get("/api/helicopters"), enabled: !!me });

  const tankMap = Object.fromEntries((tanks as any[]).map((t) => [t.id, t.name]));
  const heliMap = Object.fromEntries((helicopters as any[]).map((h) => [h.id, h.identifier ?? h.name]));

  const onRefresh = async () => {
    setRefreshing(true);
    await qc.invalidateQueries({ queryKey: ["drainChecks"] });
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <Text style={styles.title}>🔍 Drain Check Log</Text>
      <FlatList
        data={drainChecks as any[]}
        keyExtractor={(d) => d.id}
        contentContainerStyle={{ padding: 16, paddingTop: 0 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.sand} />}
        ListEmptyComponent={<Text style={{ color: theme.muted, textAlign: "center", padding: 30 }}>Nessun drain check registrato</Text>}
        renderItem={({ item: dc }) => (
          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.text, fontWeight: "700" }}>
                {dc.tankId ? tankMap[dc.tankId] : heliMap[dc.helicopterId]}
              </Text>
              {dc.notes ? <Text style={styles.cardNotes}>{dc.notes}</Text> : null}
              <Text style={styles.cardMeta}>{dc.date} {dc.time}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ color: theme.text, fontWeight: "700" }}>{dc.liters} L</Text>
              <Text style={{ color: QUALITY_COLOR[dc.quality], fontSize: 12, fontWeight: "700", marginTop: 4 }}>
                {QUALITY_LABEL[dc.quality]}
              </Text>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.dark },
  title: { fontSize: 20, fontWeight: "800", color: theme.sand, paddingHorizontal: 16, paddingTop: 8, marginBottom: 16 },
  card: {
    flexDirection: "row", alignItems: "center", backgroundColor: theme.card, borderWidth: 1,
    borderColor: theme.border, borderRadius: 12, padding: 14, marginBottom: 8,
  },
  cardMeta: { color: theme.muted, fontSize: 11, marginTop: 4 },
  cardNotes: { color: theme.muted, fontSize: 11, marginTop: 2, fontStyle: "italic" },
});
