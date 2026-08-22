import { useState, useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { get } from "../../lib/api";
import { theme } from "../../lib/theme";
import { useLang } from "../../lib/lang";

const TYPE_COLOR: Record<string, string> = {
  refuel: theme.green,
  consumption: theme.orange,
  transfer: theme.blue,
  drain_check: theme.purple,
};

function fmt(n: number) {
  return Math.round(n).toLocaleString();
}

/** Grafico a barre verticali raggruppate (rifornimenti vs consumi per giorno) */
function GroupedBars({
  data,
  labels,
}: {
  data: { day: string; refuel: number; consumption: number }[];
  labels: { refuel: string; consumption: string };
}) {
  const max = Math.max(1, ...data.map((d) => Math.max(d.refuel, d.consumption)));
  return (
    <View>
      <View style={styles.legendRow}>
        <Legend color={theme.green} label={labels.refuel} />
        <Legend color={theme.orange} label={labels.consumption} />
      </View>
      <View style={styles.chartArea}>
        {data.map((d) => (
          <View key={d.day} style={styles.dayCol}>
            <View style={styles.barsWrap}>
              <View
                style={{
                  flex: 1,
                  height: `${(d.refuel / max) * 100}%`,
                  backgroundColor: theme.green,
                  borderTopLeftRadius: 3,
                  borderTopRightRadius: 3,
                  minHeight: d.refuel > 0 ? 3 : 0,
                }}
              />
              <View
                style={{
                  flex: 1,
                  height: `${(d.consumption / max) * 100}%`,
                  backgroundColor: theme.orange,
                  borderTopLeftRadius: 3,
                  borderTopRightRadius: 3,
                  minHeight: d.consumption > 0 ? 3 : 0,
                }}
              />
            </View>
            <Text style={styles.dayLabel}>{d.day}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.axisNote}>max {fmt(max)} L</Text>
    </View>
  );
}

/** Barre orizzontali (litri per cisterna) */
function HBars({ rows }: { rows: { label: string; value: number; color: string }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <View style={{ gap: 10 }}>
      {rows.map((r) => (
        <View key={r.label}>
          <View style={styles.hbarHead}>
            <Text style={styles.hbarLabel} numberOfLines={1}>
              {r.label}
            </Text>
            <Text style={styles.hbarValue}>{fmt(r.value)} L</Text>
          </View>
          <View style={styles.hbarTrack}>
            <View style={{ width: `${(r.value / max) * 100}%`, height: "100%", backgroundColor: r.color, borderRadius: 5 }} />
          </View>
        </View>
      ))}
    </View>
  );
}

/** Barra impilata + legenda (ripartizione per tipologia) */
function StackedShare({ slices }: { slices: { label: string; value: number; color: string }[] }) {
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  return (
    <View>
      <View style={styles.stackTrack}>
        {slices
          .filter((s) => s.value > 0)
          .map((s) => (
            <View key={s.label} style={{ width: `${(s.value / total) * 100}%`, backgroundColor: s.color, height: "100%" }} />
          ))}
      </View>
      <View style={{ gap: 8, marginTop: 12 }}>
        {slices.map((s) => (
          <View key={s.label} style={styles.shareRow}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
              <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: s.color }} />
              <Text style={styles.shareLabel}>{s.label}</Text>
            </View>
            <Text style={styles.shareValue}>
              {s.value} · {Math.round((s.value / total) * 100)}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: color }} />
      <Text style={{ color: theme.muted, fontSize: 11 }}>{label}</Text>
    </View>
  );
}

export default function Analytics() {
  const qc = useQueryClient();
  const { t } = useLang();
  const [refreshing, setRefreshing] = useState(false);
  const [days, setDays] = useState<14 | 30>(14);

  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => get("/api/admin/me/role") });
  const { data: movements = [] } = useQuery({ queryKey: ["movements"], queryFn: () => get("/api/movements"), enabled: !!me });
  const { data: tanks = [] } = useQuery({ queryKey: ["tanks"], queryFn: () => get("/api/tanks"), enabled: !!me });
  const { data: helicopters = [] } = useQuery({ queryKey: ["helicopters"], queryFn: () => get("/api/helicopters"), enabled: !!me });

  const onRefresh = async () => {
    setRefreshing(true);
    await qc.invalidateQueries({ queryKey: ["movements"] });
    await qc.invalidateQueries({ queryKey: ["tanks"] });
    setRefreshing(false);
  };

  const movs = movements as any[];

  const daily = useMemo(() => {
    const out: { day: string; refuel: number; consumption: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().split("T")[0];
      const inDay = movs.filter((m) => m.date === iso);
      out.push({
        day: `${d.getDate()}`,
        refuel: inDay.filter((m) => m.type === "refuel").reduce((s, m) => s + (m.liters ?? 0), 0),
        consumption: inDay.filter((m) => m.type === "consumption").reduce((s, m) => s + (m.liters ?? 0), 0),
      });
    }
    return out;
  }, [movs, days]);

  const perTank = useMemo(() => {
    const palette = [theme.sand, theme.blue, theme.green, theme.orange, theme.purple, theme.primaryLight];
    return (tanks as any[])
      .map((tk, i) => ({
        label: tk.name,
        value: movs.filter((m) => m.tankId === tk.id).reduce((s, m) => s + (m.liters ?? 0), 0),
        color: palette[i % palette.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [movs, tanks]);

  const byType = useMemo(
    () =>
      (["refuel", "consumption", "transfer", "drain_check"] as const).map((tp) => ({
        label: t(tp),
        value: movs.filter((m) => m.type === tp).length,
        color: TYPE_COLOR[tp],
      })),
    [movs, t],
  );

  const totalRefuel = movs.filter((m) => m.type === "refuel").reduce((s, m) => s + (m.liters ?? 0), 0);
  const totalConsumption = movs.filter((m) => m.type === "consumption").reduce((s, m) => s + (m.liters ?? 0), 0);
  const periodConsumption = daily.reduce((s, d) => s + d.consumption, 0);

  const topVehicle = useMemo(() => {
    const map = new Map<string, number>();
    movs
      .filter((m) => m.helicopterId)
      .forEach((m) => map.set(m.helicopterId, (map.get(m.helicopterId) ?? 0) + (m.liters ?? 0)));
    const best = [...map.entries()].sort((a, b) => b[1] - a[1])[0];
    if (!best) return null;
    const h = (helicopters as any[]).find((x) => x.id === best[0]);
    return { name: h?.identifier ?? h?.name ?? "—", liters: best[1] };
  }, [movs, helicopters]);

  const hasData = movs.length > 0;

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.sand} />}
      >
        <Text style={styles.title}>📈 {t("analytics")}</Text>

        {/* KPI */}
        <View style={styles.kpiRow}>
          <View style={styles.kpiBox}>
            <Text style={[styles.kpiValue, { color: theme.green }]}>{fmt(totalRefuel)}</Text>
            <Text style={styles.kpiLabel}>{t("refuels")} (L)</Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={[styles.kpiValue, { color: theme.orange }]}>{fmt(totalConsumption)}</Text>
            <Text style={styles.kpiLabel}>{t("consumptions")} (L)</Text>
          </View>
        </View>
        <View style={styles.kpiRow}>
          <View style={styles.kpiBox}>
            <Text style={[styles.kpiValue, { color: theme.sand }]}>{fmt(totalRefuel - totalConsumption)}</Text>
            <Text style={styles.kpiLabel}>{t("balance")} (L)</Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={[styles.kpiValue, { color: theme.blue }]}>{fmt(periodConsumption / days)}</Text>
            <Text style={styles.kpiLabel}>{t("avgPerDay")} (L)</Text>
          </View>
        </View>

        {!hasData ? (
          <View style={styles.card}>
            <Text style={{ color: theme.muted, textAlign: "center", paddingVertical: 20 }}>{t("noData")}</Text>
          </View>
        ) : (
          <>
            {/* Trend giornaliero */}
            <View style={styles.card}>
              <View style={styles.cardHead}>
                <Text style={styles.cardTitle}>{t("refuelVsConsumption")}</Text>
                <View style={{ flexDirection: "row", gap: 6 }}>
                  {([14, 30] as const).map((d) => (
                    <TouchableOpacity
                      key={d}
                      onPress={() => setDays(d)}
                      style={[styles.chip, days === d && styles.chipActive]}
                    >
                      <Text style={{ color: days === d ? theme.sand : theme.muted, fontSize: 11 }}>{d}g</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <Text style={styles.cardSub}>{days === 14 ? t("last14Days") : t("period30")}</Text>
              <GroupedBars data={daily} labels={{ refuel: t("refuels"), consumption: t("consumptions") }} />
            </View>

            {/* Litri per cisterna */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{t("litersPerTank")}</Text>
              <View style={{ marginTop: 14 }}>
                {perTank.length === 0 ? (
                  <Text style={{ color: theme.muted, fontSize: 12 }}>{t("noData")}</Text>
                ) : (
                  <HBars rows={perTank} />
                )}
              </View>
            </View>

            {/* Tipologie movimento */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{t("movementTypes")}</Text>
              <View style={{ marginTop: 14 }}>
                <StackedShare slices={byType} />
              </View>
            </View>

            {/* Top mezzo */}
            {topVehicle && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{t("topVehicle")}</Text>
                <View style={[styles.cardHead, { marginTop: 10 }]}>
                  <Text style={{ color: theme.sand, fontWeight: "700", fontSize: 16 }}>{topVehicle.name}</Text>
                  <Text style={{ color: theme.text, fontWeight: "700" }}>{fmt(topVehicle.liters)} L</Text>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.dark },
  title: { fontSize: 20, fontWeight: "800", color: theme.sand, marginBottom: 16 },
  kpiRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  kpiBox: { flex: 1, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 12, alignItems: "center" },
  kpiValue: { fontSize: 18, fontWeight: "800" },
  kpiLabel: { fontSize: 10, color: theme.muted, marginTop: 4, textAlign: "center" },
  card: { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 14, marginTop: 12 },
  cardHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardTitle: { color: theme.text, fontWeight: "700", fontSize: 14 },
  cardSub: { color: theme.muted, fontSize: 11, marginTop: 2, marginBottom: 10 },
  chip: { borderWidth: 1, borderColor: theme.border, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4 },
  chipActive: { borderColor: theme.sand, backgroundColor: "rgba(214,196,160,0.12)" },
  legendRow: { flexDirection: "row", gap: 16, marginBottom: 10 },
  chartArea: { flexDirection: "row", alignItems: "flex-end", height: 130, gap: 3 },
  dayCol: { flex: 1, alignItems: "center" },
  barsWrap: { flexDirection: "row", alignItems: "flex-end", height: 110, gap: 1, width: "100%" },
  dayLabel: { color: theme.muted, fontSize: 8, marginTop: 4 },
  axisNote: { color: theme.muted, fontSize: 10, textAlign: "right", marginTop: 6 },
  hbarHead: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  hbarLabel: { color: theme.text, fontSize: 12, flex: 1, marginRight: 8 },
  hbarValue: { color: theme.muted, fontSize: 11, fontWeight: "600" },
  hbarTrack: { height: 10, backgroundColor: theme.dark, borderRadius: 5, overflow: "hidden" },
  stackTrack: { flexDirection: "row", height: 14, borderRadius: 7, overflow: "hidden", backgroundColor: theme.dark },
  shareRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  shareLabel: { color: theme.text, fontSize: 12 },
  shareValue: { color: theme.muted, fontSize: 11, fontWeight: "600" },
});
