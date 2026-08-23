import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Alert, Image, TextInput, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import Svg, { Path } from "react-native-svg";
import { get, post } from "../../lib/api";
import { viewUrl } from "../../lib/upload";
import { theme } from "../../lib/theme";
import { useLang } from "../../lib/lang";
import { ExportBox } from "../../components/ExportBox";
import { AppModal } from "../../components/Modal";
import { AircraftDrainModal } from "../../components/AircraftDrainModal";

const QUALITY_KEY = { ok: "qualityOk", water: "qualityWater", impurities: "qualityImpurities" } as const;
const QUALITY_COLOR: Record<string, string> = { ok: theme.green, water: theme.blue, impurities: theme.red };

export default function DrainLog() {
  const qc = useQueryClient();
  const { t } = useLang();
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<"tank" | "aircraft">("tank");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [aircraft, setAircraft] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);

  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => get("/api/admin/me/role") });
  const { data: drainChecks = [] } = useQuery({ queryKey: ["drainChecks"], queryFn: () => get("/api/drain-checks"), enabled: !!me });
  const { data: tanks = [] } = useQuery({ queryKey: ["tanks"], queryFn: () => get("/api/tanks"), enabled: !!me });
  const { data: helicopters = [] } = useQuery({ queryKey: ["helicopters"], queryFn: () => get("/api/helicopters"), enabled: !!me });

  const role = (me as any)?.role;
  const isAdmin = role === "admin" || role === "superadmin";
  const tankMap = Object.fromEntries((tanks as any[]).map((x) => [x.id, x.name]));
  const heliMap = Object.fromEntries((helicopters as any[]).map((h) => [h.id, h.identifier ?? h.name]));
  const aviation = (helicopters as any[]).filter((h) => h.category === "aviation");

  const rows = (drainChecks as any[]).filter((d) =>
    tab === "aircraft" ? d.targetType === "aircraft" || (!d.targetType && d.helicopterId) : d.targetType !== "aircraft" && !!d.tankId,
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await qc.invalidateQueries({ queryKey: ["drainChecks"] });
    setRefreshing(false);
  };

  const afterSave = () => {
    qc.invalidateQueries({ queryKey: ["drainChecks"] });
    qc.invalidateQueries({ queryKey: ["helicopters"] });
    qc.invalidateQueries({ queryKey: ["tanks"] });
    setAircraft(null);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <Text style={styles.title}>🔍 {t("drainCheckLog")}</Text>

      <View style={styles.tabs}>
        {(["tank", "aircraft"] as const).map((k) => (
          <TouchableOpacity key={k} onPress={() => setTab(k)} style={[styles.tab, tab === k && styles.tabActive]}>
            <Text style={{ color: tab === k ? theme.dark : theme.muted, fontWeight: "700", fontSize: 13 }}>
              {k === "tank" ? `🛢 ${t("tanksTab")}` : `🚁 ${t("aircraftTab")}`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === "aircraft" && (
        <TouchableOpacity style={styles.newBtn} onPress={() => setPickerOpen(true)}>
          <Text style={styles.newBtnTxt}>{t("newAircraftDrain")}</Text>
        </TouchableOpacity>
      )}

      <ExportBox kind="drain-checks" />

      <FlatList
        data={rows}
        keyExtractor={(d) => d.id}
        contentContainerStyle={{ padding: 16, paddingTop: 0 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.sand} />}
        ListEmptyComponent={<Text style={{ color: theme.muted, textAlign: "center", padding: 30 }}>{t("noDrainChecks")}</Text>}
        renderItem={({ item: dc }) => (
          <TouchableOpacity style={[styles.card, dc.voidedAt && { opacity: 0.55 }]} onPress={() => setDetail(dc)}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.text, fontWeight: "700" }}>
                {dc.tankId ? tankMap[dc.tankId] : heliMap[dc.helicopterId] ?? "—"}
              </Text>
              {dc.samplePoint ? <Text style={styles.cardMeta}>📍 {dc.samplePoint}</Text> : null}
              {dc.notes ? <Text style={styles.cardNotes}>{dc.notes}</Text> : null}
              <Text style={styles.cardMeta}>{dc.date} {dc.time}</Text>
              <View style={styles.badges}>
                {dc.signedAt ? <Text style={[styles.badge, { color: theme.green, borderColor: theme.green }]}>🔒 {t("signed")}</Text> : null}
                {dc.isIncomplete ? <Text style={[styles.badge, { color: theme.orange, borderColor: theme.orange }]}>⚠︎ {t("incomplete")}</Text> : null}
                {dc.voidedAt ? <Text style={[styles.badge, { color: theme.red, borderColor: theme.red }]}>✖ {t("voided")}</Text> : null}
              </View>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ color: theme.text, fontWeight: "700" }}>{dc.liters} L</Text>
              <Text style={{ color: QUALITY_COLOR[dc.quality], fontSize: 12, fontWeight: "700", marginTop: 4 }}>
                {t(QUALITY_KEY[dc.quality as keyof typeof QUALITY_KEY] ?? "quality")}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />

      <AppModal visible={pickerOpen} title={`🚁 ${t("selectAircraft")}`} onClose={() => setPickerOpen(false)}>
        {aviation.length === 0 ? (
          <Text style={{ color: theme.muted, padding: 10 }}>{t("noAviationVehicles")}</Text>
        ) : (
          aviation.map((h) => (
            <TouchableOpacity
              key={h.id}
              style={styles.pickRow}
              onPress={() => { setPickerOpen(false); setAircraft(h); }}
            >
              <Text style={{ color: theme.text, fontWeight: "700" }}>{h.identifier ?? h.name}</Text>
              <Text style={{ color: theme.muted, fontSize: 11 }}>{h.name}{h.fuelType ? ` · ${h.fuelType}` : ""}</Text>
            </TouchableOpacity>
          ))
        )}
      </AppModal>

      <AircraftDrainModal
        visible={!!aircraft}
        aircraft={aircraft}
        t={t}
        onClose={() => setAircraft(null)}
        onSaved={afterSave}
      />

      <DetailModal
        record={detail}
        t={t}
        isAdmin={isAdmin}
        name={detail ? (detail.tankId ? tankMap[detail.tankId] : heliMap[detail.helicopterId]) : ""}
        onClose={() => setDetail(null)}
        onVoided={() => { setDetail(null); afterSave(); }}
      />
    </SafeAreaView>
  );
}

function DetailModal({ record, t, isAdmin, name, onClose, onVoided }: any) {
  const [urls, setUrls] = useState<{ counter?: string; sample?: string }>({});
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState("");
  const [voiding, setVoiding] = useState(false);
  const [showVoid, setShowVoid] = useState(false);

  if (!record) return null;

  const loadPhotos = async () => {
    setLoading(true);
    try {
      const next: any = {};
      if (record.photoCounterKey) next.counter = await viewUrl(record.photoCounterKey);
      if (record.photoSampleKey) next.sample = await viewUrl(record.photoSampleKey);
      setUrls(next);
    } catch (e: any) {
      Alert.alert(t("error"), e?.message ?? "Errore");
    } finally {
      setLoading(false);
    }
  };

  const doVoid = async () => {
    if (reason.trim().length < 3) return Alert.alert(t("error"), t("voidReasonRequired"));
    setVoiding(true);
    try {
      const r = await post(`/api/drain-checks/${record.id}/void`, { reason: reason.trim() });
      if (!r.ok) {
        const b: any = await r.json().catch(() => ({}));
        throw new Error(b?.error ?? `HTTP ${r.status}`);
      }
      setReason(""); setShowVoid(false);
      Alert.alert(t("recordVoided"));
      onVoided();
    } catch (e: any) {
      Alert.alert(t("error"), e?.message ?? "Errore");
    } finally {
      setVoiding(false);
    }
  };

  let sigPaths: string[] = [];
  try { sigPaths = record.signaturePath ? JSON.parse(record.signaturePath) : []; } catch { sigPaths = []; }

  const hasPhotos = !!record.photoCounterKey || !!record.photoSampleKey;

  return (
    <AppModal visible={!!record} title={`🔍 ${t("drainCheck")} — ${name ?? ""}`} onClose={onClose}>
      <Row label={`${t("date")} / ${t("time")}`} value={`${record.date} ${record.time}`} />
      {record.samplePoint ? <Row label={t("samplePoint")} value={record.samplePoint} /> : null}
      <Row label={t("liters")} value={`${record.liters} L`} />
      <Row label={t("result")} value={t(QUALITY_KEY[record.quality as keyof typeof QUALITY_KEY] ?? "quality")} />
      {record.notes ? <Row label={t("notes")} value={record.notes} /> : null}
      {record.signedByName ? <Row label={t("signedBy")} value={`${record.signedByName}${record.signedAt ? ` · ${new Date(record.signedAt).toLocaleString()}` : ""}`} /> : null}
      {record.isIncomplete ? <Text style={styles.warn}>⚠︎ {t("recordIncomplete")}</Text> : null}
      {record.voidedAt ? <Text style={[styles.warn, { color: theme.red }]}>✖ {t("voided")}: {record.voidReason}</Text> : null}

      {sigPaths.length > 0 ? (
        <>
          <Text style={styles.dLabel}>✍️ {t("signature")}</Text>
          <View style={styles.sigBox}>
            <Svg width="100%" height={110} viewBox="0 0 300 140">
              {sigPaths.map((d, i) => (
                <Path key={i} d={d} stroke={theme.text} strokeWidth={2} fill="none" strokeLinecap="round" />
              ))}
            </Svg>
          </View>
        </>
      ) : null}

      {hasPhotos ? (
        <>
          <Text style={styles.dLabel}>📷 {t("photos")}</Text>
          {!urls.counter && !urls.sample ? (
            <TouchableOpacity style={styles.secBtn} onPress={loadPhotos} disabled={loading}>
              {loading ? <ActivityIndicator color={theme.sand} /> : <Text style={styles.secTxt}>🖼 {t("viewPhotos")}</Text>}
            </TouchableOpacity>
          ) : (
            <View style={{ flexDirection: "row", gap: 10 }}>
              {urls.counter ? <Image source={{ uri: urls.counter }} style={styles.thumb} resizeMode="cover" /> : null}
              {urls.sample ? <Image source={{ uri: urls.sample }} style={styles.thumb} resizeMode="cover" /> : null}
            </View>
          )}
        </>
      ) : null}

      {isAdmin && !record.voidedAt ? (
        showVoid ? (
          <View style={{ marginTop: 16 }}>
            <Text style={styles.dLabel}>{t("voidReason")}</Text>
            <TextInput style={styles.input} value={reason} onChangeText={setReason} placeholder="" placeholderTextColor={theme.muted} />
            <TouchableOpacity style={[styles.voidBtn, voiding && { opacity: 0.6 }]} onPress={doVoid} disabled={voiding}>
              <Text style={{ color: "#fff", fontWeight: "800" }}>{voiding ? t("loading") : `✖ ${t("voidRecord")}`}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={[styles.secBtn, { borderColor: theme.red, marginTop: 16 }]} onPress={() => setShowVoid(true)}>
            <Text style={[styles.secTxt, { color: theme.red }]}>✖ {t("voidRecord")}</Text>
          </TouchableOpacity>
        )
      ) : null}
      <View style={{ height: 20 }} />
    </AppModal>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={{ color: theme.muted, fontSize: 12 }}>{label}</Text>
      <Text style={{ color: theme.text, fontSize: 13, fontWeight: "600", flexShrink: 1, textAlign: "right" }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.dark },
  title: { fontSize: 20, fontWeight: "800", color: theme.sand, paddingHorizontal: 16, paddingTop: 8, marginBottom: 12 },
  tabs: { flexDirection: "row", gap: 8, paddingHorizontal: 16, marginBottom: 10 },
  tab: { flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: theme.border },
  tabActive: { backgroundColor: theme.sand, borderColor: theme.sand },
  newBtn: {
    marginHorizontal: 16, marginBottom: 10, borderWidth: 1, borderColor: theme.sand, borderRadius: 10,
    paddingVertical: 11, alignItems: "center",
  },
  newBtnTxt: { color: theme.sand, fontWeight: "700", fontSize: 13 },
  card: {
    flexDirection: "row", alignItems: "center", backgroundColor: theme.card, borderWidth: 1,
    borderColor: theme.border, borderRadius: 12, padding: 14, marginBottom: 8,
  },
  cardMeta: { color: theme.muted, fontSize: 11, marginTop: 4 },
  cardNotes: { color: theme.muted, fontSize: 11, marginTop: 2, fontStyle: "italic" },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
  badge: { fontSize: 10, fontWeight: "700", borderWidth: 1, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  pickRow: { borderWidth: 1, borderColor: theme.border, borderRadius: 10, padding: 12, marginBottom: 8 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: theme.border },
  dLabel: { color: theme.muted, fontSize: 12, marginTop: 14, marginBottom: 6, fontWeight: "600" },
  sigBox: { backgroundColor: theme.dark, borderWidth: 1, borderColor: theme.border, borderRadius: 8, overflow: "hidden" },
  thumb: { flex: 1, height: 120, borderRadius: 8, borderWidth: 1, borderColor: theme.border },
  secBtn: { borderWidth: 1, borderColor: theme.border, borderRadius: 8, paddingVertical: 11, alignItems: "center" },
  secTxt: { color: theme.sand, fontWeight: "700", fontSize: 13 },
  input: {
    backgroundColor: theme.dark, borderWidth: 1, borderColor: theme.border, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, color: theme.text, fontSize: 14, marginBottom: 8,
  },
  voidBtn: { backgroundColor: theme.red, borderRadius: 10, paddingVertical: 13, alignItems: "center" },
  warn: { color: theme.orange, fontSize: 12, marginTop: 10 },
});
