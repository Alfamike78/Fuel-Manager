import { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator } from "react-native";
import { theme } from "../lib/theme";
import { useLang } from "../lib/lang";
import { downloadReport, lastDays, type ReportKind, type ReportFormat } from "../lib/download";

type Period = "7" | "30" | "90" | "all" | "custom";

/**
 * Accordion "📄 SCARICA REPORT" — periodi rapidi + intervallo custom,
 * export PDF o Excel. Visibile a tutti gli operatori (parità con la web app).
 */
export function ExportBox({ kind }: { kind: ReportKind }) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [period, setPeriod] = useState<Period>("30");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState<ReportFormat | null>(null);

  const run = async (format: ReportFormat) => {
    setBusy(format);
    try {
      let range: { from?: string; to?: string } = {};
      if (period === "7") range = lastDays(7);
      else if (period === "30") range = lastDays(30);
      else if (period === "90") range = lastDays(90);
      else if (period === "custom") range = { from: from.trim() || undefined, to: to.trim() || undefined };
      const filename = await downloadReport(kind, { format, ...range });
      Alert.alert(`✅ ${t("savedFile")}`, filename);
    } catch (e: any) {
      Alert.alert(t("error"), e?.message ?? String(e));
    } finally {
      setBusy(null);
    }
  };

  const PERIODS: { key: Period; label: string }[] = [
    { key: "7", label: t("last7") },
    { key: "30", label: t("last30") },
    { key: "90", label: t("last90") },
    { key: "all", label: t("allTime") },
    { key: "custom", label: t("customRange") },
  ];

  return (
    <View style={styles.wrap}>
      <TouchableOpacity style={styles.header} onPress={() => setOpen(!open)} activeOpacity={0.7}>
        <Text style={styles.headerText}>📄 {t("downloadReport")}</Text>
        <Text style={styles.arrow}>{open ? "▲" : "▼"}</Text>
      </TouchableOpacity>

      {open && (
        <View style={{ marginTop: 12 }}>
          <Text style={styles.label}>{t("period")}</Text>
          <View style={styles.chipRow}>
            {PERIODS.map((p) => {
              const active = period === p.key;
              return (
                <TouchableOpacity
                  key={p.key}
                  onPress={() => setPeriod(p.key)}
                  style={[styles.chip, active && { borderColor: theme.sand, backgroundColor: "rgba(214,196,160,0.12)" }]}
                >
                  <Text style={{ fontSize: 12, color: active ? theme.sand : theme.muted, fontWeight: active ? "700" : "400" }}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {period === "custom" && (
            <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>{t("fromDate")}</Text>
                <TextInput
                  style={styles.input} value={from} onChangeText={setFrom}
                  placeholder="2026-01-01" placeholderTextColor={theme.muted} autoCapitalize="none"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>{t("toDate")}</Text>
                <TextInput
                  style={styles.input} value={to} onChangeText={setTo}
                  placeholder="2026-12-31" placeholderTextColor={theme.muted} autoCapitalize="none"
                />
              </View>
            </View>
          )}

          <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: theme.primary, opacity: busy ? 0.6 : 1 }]}
              onPress={() => run("pdf")} disabled={!!busy}
            >
              {busy === "pdf"
                ? <ActivityIndicator color={theme.sand} size="small" />
                : <Text style={styles.btnText}>📄 PDF</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: "#1e7a4a", opacity: busy ? 0.6 : 1 }]}
              onPress={() => run("xlsx")} disabled={!!busy}
            >
              {busy === "xlsx"
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={[styles.btnText, { color: "#eafff2" }]}>📊 Excel</Text>}
            </TouchableOpacity>
          </View>
          {!!busy && <Text style={styles.hint}>{t("downloading")}</Text>}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 16, marginBottom: 12, backgroundColor: theme.card,
    borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 14,
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerText: { color: theme.sand, fontWeight: "700", fontSize: 13, letterSpacing: 0.5 },
  arrow: { color: theme.muted, fontSize: 10 },
  label: { color: theme.muted, fontSize: 11, marginBottom: 6 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1, borderColor: theme.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  input: {
    backgroundColor: theme.dark, borderWidth: 1, borderColor: theme.border,
    borderRadius: 8, padding: 9, color: theme.text, fontSize: 13,
  },
  btn: { flex: 1, borderRadius: 8, padding: 12, alignItems: "center", justifyContent: "center" },
  btnText: { color: theme.sand, fontWeight: "700", fontSize: 13 },
  hint: { color: theme.muted, fontSize: 11, textAlign: "center", marginTop: 8, fontStyle: "italic" },
});
