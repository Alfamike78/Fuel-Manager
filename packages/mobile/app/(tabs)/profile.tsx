import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { get } from "../../lib/api";
import { authClient, clearToken, clearImpersonation } from "../../lib/auth";
import { theme } from "../../lib/theme";
import { useLang } from "../../lib/lang";
import { LanguageSelector } from "../../components/LanguageSelector";

export default function Profile() {
  const qc = useQueryClient();
  const { t } = useLang();
  const router = useRouter();
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => get("/api/admin/me/role") });
  const { data: company } = useQuery({ queryKey: ["company"], queryFn: () => get("/api/companies/me"), enabled: !!me });

  const handleLogout = async () => {
    Alert.alert(t("logout"), t("confirmLogout"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("logout"), style: "destructive", onPress: async () => {
          await authClient.signOut();
          await clearToken();
          clearImpersonation();
          qc.clear();
          router.replace("/(auth)/sign-in");
        },
      },
    ]);
  };

  const roleLabel =
    (me as any)?.role === "superadmin" ? t("superAdminRole") : (me as any)?.role === "admin" ? t("adminRole") : t("operatorRole");

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View style={styles.avatarBox}>
          <Text style={{ fontSize: 32 }}>👤</Text>
        </View>
        <Text style={styles.name}>{(me as any)?.name ?? "—"}</Text>
        <Text style={styles.email}>{(me as any)?.email ?? "—"}</Text>

        <View style={styles.card}>
          <Row label={t("role")} value={roleLabel} />
          <Row label={t("company")} value={company?.brandName ?? company?.name ?? "—"} />
          <Row label={t("plan")} value={company?.plan ?? "—"} />
        </View>

        <Text style={styles.sectionLabel}>🌐 {t("language")}</Text>
        <View style={[styles.card, { padding: 12 }]}>
          <LanguageSelector />
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>🚪 {t("logout")}</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>PilotCraft Solutions · Fuel Manager</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.dark },
  avatarBox: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: theme.primary,
    alignItems: "center", justifyContent: "center", alignSelf: "center", marginTop: 12, marginBottom: 12,
  },
  name: { color: theme.text, fontSize: 18, fontWeight: "700", textAlign: "center" },
  email: { color: theme.muted, fontSize: 13, textAlign: "center", marginBottom: 24 },
  card: { backgroundColor: theme.card, borderRadius: 12, borderWidth: 1, borderColor: theme.border, padding: 4, marginBottom: 24 },
  row: { flexDirection: "row", justifyContent: "space-between", padding: 12, borderBottomWidth: 1, borderBottomColor: theme.border },
  rowLabel: { color: theme.muted, fontSize: 13 },
  rowValue: { color: theme.text, fontSize: 13, fontWeight: "600" },
  logoutBtn: { backgroundColor: "rgba(239,68,68,0.12)", borderWidth: 1, borderColor: "rgba(239,68,68,0.3)", borderRadius: 10, padding: 14, alignItems: "center" },
  logoutText: { color: theme.red, fontWeight: "700" },
  sectionLabel: { color: theme.muted, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 },
  footer: { color: theme.muted, fontSize: 11, textAlign: "center", marginTop: 30 },
});
