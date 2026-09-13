import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Image, Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { AppModal } from "./Modal";
import { SignaturePad, pathsToSvg } from "./SignaturePad";
import { theme } from "../lib/theme";
import { post } from "../lib/api";
import { uploadPhoto, uploadSignatureSvg } from "../lib/upload";

const QUALITIES = [
  { value: "ok", icon: "✅", key: "qualityOk", color: theme.green },
  { value: "water", icon: "💧", key: "qualityWater", color: theme.blue },
  { value: "impurities", icon: "🔴", key: "qualityImpurities", color: theme.red },
] as const;

export const SAMPLE_POINTS = [
  "Serbatoio principale",
  "Serbatoio ausiliario",
  "Sump / drenaggio serbatoio",
  "Sump ala sinistra",
  "Sump ala destra",
  "Filtro carburante / gascolator",
  "Altro",
];

/**
 * Drain check completo — su cisterna O su mezzo aereo, stessa identica
 * configurazione per entrambi: punto di prelievo, litri, esito, 2 foto
 * opzionali (contalitri + barattolo campione, se manca una delle due il
 * record viene registrato come "incompleto"), firma a dito obbligatoria che
 * sigilla il record (diventa immodificabile). Passa `tank` per una cisterna
 * o `aircraft` per un mezzo aereo (uno solo dei due).
 */
export function AircraftDrainModal({ visible, tank, aircraft, t, onClose, onSaved }: any) {
  const isTank = !!tank;
  const target = isTank ? tank : aircraft;
  const targetLabel = isTank ? target?.name : (target?.identifier ?? target?.name);
  const now = new Date();
  const [quality, setQuality] = useState<"ok" | "water" | "impurities">("ok");
  const [samplePoint, setSamplePoint] = useState(SAMPLE_POINTS[0]);
  const [customPoint, setCustomPoint] = useState("");
  const [liters, setLiters] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(now.toISOString().split("T")[0]);
  const [time, setTime] = useState(now.toTimeString().slice(0, 5));
  const [counterUri, setCounterUri] = useState<string | null>(null);
  const [sampleUri, setSampleUri] = useState<string | null>(null);
  const [sigPaths, setSigPaths] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState("");

  const shoot = async (which: "counter" | "sample") => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t("error"), t("cameraPermissionNeeded"));
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ quality: 0.6, allowsEditing: false });
    if (res.canceled || !res.assets?.[0]?.uri) return;
    which === "counter" ? setCounterUri(res.assets[0].uri) : setSampleUri(res.assets[0].uri);
  };

  const pickFromLibrary = async (which: "counter" | "sample") => {
    const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.6, mediaTypes: ["images"] });
    if (res.canceled || !res.assets?.[0]?.uri) return;
    which === "counter" ? setCounterUri(res.assets[0].uri) : setSampleUri(res.assets[0].uri);
  };

  const reset = () => {
    setQuality("ok"); setSamplePoint(SAMPLE_POINTS[0]); setCustomPoint(""); setLiters("");
    setNotes(""); setCounterUri(null); setSampleUri(null); setSigPaths([]); setStep("");
  };

  const save = async () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return Alert.alert(t("error"), "Data: YYYY-MM-DD");
    if (!/^\d{2}:\d{2}$/.test(time)) return Alert.alert(t("error"), "Ora: HH:MM");
    if (sigPaths.length === 0) return Alert.alert(t("error"), t("signatureRequired"));
    const point = samplePoint === "Altro" ? customPoint.trim() : samplePoint;
    if (!point) return Alert.alert(t("error"), t("samplePointRequired"));

    setSaving(true);
    try {
      let photoCounterKey: string | null = null;
      let photoSampleKey: string | null = null;
      if (counterUri) { setStep(t("uploadingCounterPhoto")); photoCounterKey = await uploadPhoto(counterUri); }
      if (sampleUri) { setStep(t("uploadingSamplePhoto")); photoSampleKey = await uploadPhoto(sampleUri); }

      setStep(t("sealingRecord"));
      const signatureKey = await uploadSignatureSvg(pathsToSvg(sigPaths));

      const r = await post("/api/drain-checks", {
        tankId: isTank ? target.id : undefined,
        helicopterId: isTank ? undefined : target.id,
        quality,
        liters: Number(liters || 0),
        notes: notes.trim() || null,
        date,
        time,
        samplePoint: point,
        photoCounterKey,
        photoSampleKey,
        signatureKey,
        signaturePath: JSON.stringify(sigPaths),
        device: `${Platform.OS} ${Platform.Version}`,
      });
      if (!r.ok) {
        const b: any = await r.json().catch(() => ({}));
        throw new Error(b?.error ?? `HTTP ${r.status}`);
      }
      const saved: any = await r.json().catch(() => ({}));
      reset();
      onSaved();
      Alert.alert(
        t("drainCheckSaved"),
        `${targetLabel} · ${point}\n${saved?.isIncomplete ? t("recordIncomplete") : t("recordComplete")}`,
      );
    } catch (e: any) {
      Alert.alert(t("error"), e?.message ?? "Errore");
    } finally {
      setSaving(false);
      setStep("");
    }
  };

  if (!target) return null;

  return (
    <AppModal
      visible={visible}
      title={`🔍 ${t("drainCheck")} — ${targetLabel}`}
      onClose={onClose}
    >
      <Text style={s.label}>{t("date")} / {t("time")}</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <TextInput style={[s.input, { flex: 1 }]} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" placeholderTextColor={theme.muted} />
        <TextInput style={[s.input, { width: 100 }]} value={time} onChangeText={setTime} placeholder="HH:MM" placeholderTextColor={theme.muted} />
      </View>

      <Text style={s.label}>{t("samplePoint")}</Text>
      <View style={s.chipsWrap}>
        {SAMPLE_POINTS.map((p) => (
          <TouchableOpacity key={p} onPress={() => setSamplePoint(p)} style={[s.chip, samplePoint === p && s.chipActive]}>
            <Text style={{ color: samplePoint === p ? theme.sand : theme.muted, fontSize: 12 }}>{p}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {samplePoint === "Altro" && (
        <TextInput style={s.input} value={customPoint} onChangeText={setCustomPoint} placeholder={t("specifyPoint")} placeholderTextColor={theme.muted} />
      )}

      <Text style={s.label}>{t("liters")}</Text>
      <TextInput style={s.input} value={liters} onChangeText={setLiters} keyboardType="numeric" placeholder="es. 0.5" placeholderTextColor={theme.muted} />

      <Text style={s.label}>{t("result")}</Text>
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 4 }}>
        {QUALITIES.map((q) => (
          <TouchableOpacity
            key={q.value}
            onPress={() => setQuality(q.value)}
            style={[s.qBtn, { borderColor: quality === q.value ? q.color : theme.border, backgroundColor: quality === q.value ? q.color + "22" : "transparent" }]}
          >
            <Text style={{ color: quality === q.value ? q.color : theme.muted, fontSize: 12, fontWeight: "700" }}>
              {q.icon} {t(q.key)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={s.label}>📷 {t("photos")}</Text>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <PhotoSlot uri={counterUri} label={t("photoCounter")} onShoot={() => shoot("counter")} onPick={() => pickFromLibrary("counter")} onClear={() => setCounterUri(null)} t={t} />
        <PhotoSlot uri={sampleUri} label={t("photoSample")} onShoot={() => shoot("sample")} onPick={() => pickFromLibrary("sample")} onClear={() => setSampleUri(null)} t={t} />
      </View>
      {(!counterUri || !sampleUri) && <Text style={s.warn}>⚠︎ {t("photosOptionalWarning")}</Text>}

      <Text style={s.label}>✍️ {t("signature")}</Text>
      <SignaturePad paths={sigPaths} onChange={setSigPaths} t={t} />

      <Text style={s.label}>{t("notes")}</Text>
      <TextInput style={s.input} value={notes} onChangeText={setNotes} placeholder="" placeholderTextColor={theme.muted} />

      <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
        {saving ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <ActivityIndicator color={theme.dark} />
            <Text style={s.saveTxt}>{step || t("loading")}</Text>
          </View>
        ) : (
          <Text style={s.saveTxt}>🔒 {t("signAndSave")}</Text>
        )}
      </TouchableOpacity>
      <Text style={s.sealHint}>{t("sealHint")}</Text>
    </AppModal>
  );
}

function PhotoSlot({ uri, label, onShoot, onPick, onClear, t }: any) {
  return (
    <View style={{ flex: 1 }}>
      <TouchableOpacity onPress={onShoot} style={s.photoBox}>
        {uri ? (
          <Image source={{ uri }} style={{ width: "100%", height: "100%", borderRadius: 8 }} resizeMode="cover" />
        ) : (
          <Text style={{ color: theme.muted, fontSize: 11, textAlign: "center" }}>📷{"\n"}{label}</Text>
        )}
      </TouchableOpacity>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
        <TouchableOpacity onPress={onPick}>
          <Text style={{ color: theme.muted, fontSize: 10 }}>🖼 {t("fromGallery")}</Text>
        </TouchableOpacity>
        {uri ? (
          <TouchableOpacity onPress={onClear}>
            <Text style={{ color: theme.red, fontSize: 10 }}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  label: { color: theme.muted, fontSize: 12, marginTop: 12, marginBottom: 6, fontWeight: "600" },
  input: {
    backgroundColor: theme.dark, borderWidth: 1, borderColor: theme.border, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, color: theme.text, fontSize: 14, marginBottom: 4,
  },
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1, borderColor: theme.border, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6 },
  chipActive: { borderColor: theme.sand, backgroundColor: "rgba(214,196,160,0.12)" },
  qBtn: { flex: 1, borderWidth: 1, borderRadius: 8, paddingVertical: 10, alignItems: "center" },
  photoBox: {
    height: 110, borderWidth: 1, borderColor: theme.border, borderRadius: 8,
    backgroundColor: theme.dark, alignItems: "center", justifyContent: "center", overflow: "hidden",
  },
  warn: { color: theme.orange, fontSize: 11, marginTop: 6 },
  saveBtn: { backgroundColor: theme.sand, borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 18 },
  saveTxt: { color: theme.dark, fontWeight: "800", fontSize: 15 },
  sealHint: { color: theme.muted, fontSize: 10, textAlign: "center", marginTop: 8, marginBottom: 10 },
});
