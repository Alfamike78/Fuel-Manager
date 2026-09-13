import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { AppModal } from "./Modal";
import { theme } from "../lib/theme";
import { post } from "../lib/api";

/**
 * Registro filtri carburante per cisterna: modello, data installazione,
 * validità (1 o 2 anni) — la scadenza viene calcolata dal server.
 * Passa `tank` per bloccare la cisterna target (bottone sulla card),
 * oppure omettilo per mostrare la selezione cisterna (tab Filtri).
 */
export function FilterChangeModal({ visible, tank, tanks, t, onClose, onSaved }: any) {
  const [tankId, setTankId] = useState<string>(tank?.id ?? "");
  const [model, setModel] = useState("");
  const [installedDate, setInstalledDate] = useState(new Date().toISOString().split("T")[0]);
  const [validityMonths, setValidityMonths] = useState<12 | 24>(12);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setTankId(tank?.id ?? ""); setModel(""); setInstalledDate(new Date().toISOString().split("T")[0]);
    setValidityMonths(12); setNotes("");
  };

  const save = async () => {
    if (!tankId) return Alert.alert(t("error"), t("tank"));
    if (!model.trim()) return Alert.alert(t("error"), t("filterModel"));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(installedDate)) return Alert.alert(t("error"), "Data: AAAA-MM-GG");

    setSaving(true);
    try {
      const res = await post("/api/filter-changes", {
        tankId, model: model.trim(), installedDate, validityMonths, notes: notes || undefined,
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? t("error")); }
      reset();
      onSaved();
    } catch (e: any) {
      Alert.alert(t("error"), e.message ?? t("error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppModal visible={visible} title={`🧰 ${t("newFilterChange")}`} onClose={onClose}>
      <Text style={styles.label}>{t("tank")}</Text>
      {tank ? (
        <Text style={styles.lockedTank}>{tank.name}</Text>
      ) : (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
          {(tanks as any[]).map((tk: any) => (
            <TouchableOpacity key={tk.id} onPress={() => setTankId(tk.id)} style={[styles.chip, tankId === tk.id && styles.chipActive]}>
              <Text style={{ color: tankId === tk.id ? theme.sand : theme.muted, fontSize: 12 }}>{tk.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <Text style={styles.label}>{t("filterModel")}</Text>
      <TextInput style={styles.input} value={model} onChangeText={setModel} placeholder={t("filterModel")} placeholderTextColor={theme.muted} />

      <Text style={styles.label}>{t("installedDate")} (AAAA-MM-GG)</Text>
      <TextInput style={styles.input} value={installedDate} onChangeText={setInstalledDate} placeholder="2026-09-13" placeholderTextColor={theme.muted} />

      <Text style={styles.label}>{t("validity")}</Text>
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
        {([12, 24] as const).map((m) => (
          <TouchableOpacity key={m} onPress={() => setValidityMonths(m)} style={[styles.chip, validityMonths === m && styles.chipActive]}>
            <Text style={{ color: validityMonths === m ? theme.sand : theme.muted, fontSize: 12 }}>{m === 12 ? t("months12") : t("months24")}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>{t("notes")}</Text>
      <TextInput style={styles.input} value={notes} onChangeText={setNotes} placeholder="" placeholderTextColor={theme.muted} />

      <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
        {saving ? <ActivityIndicator color={theme.sand} /> : <Text style={styles.saveBtnText}>{t("save")}</Text>}
      </TouchableOpacity>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, color: theme.muted, marginBottom: 6, marginTop: 8 },
  lockedTank: { color: theme.sand, fontWeight: "700", fontSize: 14, marginBottom: 8 },
  input: {
    backgroundColor: theme.dark, borderWidth: 1, borderColor: theme.border, borderRadius: 8,
    padding: 12, color: theme.text, fontSize: 15,
  },
  chip: { borderWidth: 1, borderColor: theme.border, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  chipActive: { borderColor: theme.sand, backgroundColor: "rgba(214,196,160,0.1)" },
  saveBtn: { backgroundColor: theme.primary, borderRadius: 10, padding: 14, alignItems: "center", marginTop: 20, marginBottom: 10 },
  saveBtnText: { color: theme.sand, fontWeight: "700", fontSize: 15 },
});
