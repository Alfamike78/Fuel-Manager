import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { get, post, del } from "../../lib/api";
import { theme } from "../../lib/theme";
import { useLang } from "../../lib/lang";
import { FilterChangeModal } from "../../components/FilterChangeModal";
import { daysSince, latestFilterByTank } from "../../lib/dates";

export default function Filters() {
  const qc = useQueryClient();
  const { t } = useLang();
  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => get("/api/admin/me/role") });
  const { data: tanks = [] } = useQuery({ queryKey: ["tanks"], queryFn: () => get("/api/tanks"), enabled: !!me });
  const { data: filterChanges = [] } = useQuery({ queryKey: ["filterChanges"], queryFn: () => get("/api/filter-changes"), enabled: !!me });

  const role = (me as any)?.role;
  const isAdmin = role === "admin" || role === "superadmin";
  const tankMap = Object.fromEntries((tanks as any[]).map((tk) => [tk.id, tk.name]));
  const filterMap = latestFilterByTank(filterChanges as any[]);

  const onRefresh = async () => {
    setRefreshing(true);
    await qc.invalidateQueries({ queryKey: ["filterChanges"] });
    await qc.invalidateQueries({ queryKey: ["tanks"] });
    setRefreshing(false);
  };

  const afterSave = () => {
    onRefresh();
    setModalOpen(false);
  };

  const onDelete = async (id: string) => {
    Alert.alert(t("confirm") ?? "Confermi?", "", [
      { text: t("cancel") ?? "Annulla", style: "cancel" },
      {
        text: t("delete") ?? "Elimina", style: "destructive",
        onPress: async () => {
          try {
            const r = await del(`/api/filter-changes/${id}`);
            if (!r.ok) throw new Error("HTTP " + r.status);
            onRefresh();
          } catch (e: any) {
            Alert.alert(t("error"), e?.message ?? "Errore");
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <Text style={styles.title}>🧰 {t("filterRegistry")}</Text>

      <TouchableOpacity style={styles.newBtn} onPress={() => setModalOpen(true)}>
        <Text style={styles.newBtnTxt}>{t("newFilterChange")}</Text>
      </TouchableOpacity>

      <FlatList
        data={[{ __section: "status" } as any, ...(tanks as any[]), { __section: "history" } as any, ...(filterChanges as any[])]}
        keyExtractor={(item, i) => item.__section ? `sec-${item.__section}` : item.id ?? String(i)}
        contentContainerStyle={{ padding: 16, paddingTop: 0 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.sand} />}
        renderItem={({ item }: any) => {
          if (item.__section === "status") {
            return <Text style={styles.sectionTitle}>{t("currentFilter")}</Text>;
          }
          if (item.__section === "history") {
            return <Text style={[styles.sectionTitle, { marginTop: 20 }]}>{t("filterHistory")}</Text>;
          }
          // Tank status card (has capacity field, no model field)
          if (item.capacity !== undefined) {
            const filt = filterMap[item.id];
            const days = filt ? daysSince(filt.expiresDate) : null;
            const expired = days !== null && days > 0;
            const expiringSoon = days !== null && days <= 0 && days >= -30;
            return (
              <View style={styles.card}>
                <Text style={{ color: theme.text, fontWeight: "700" }}>{item.name}</Text>
                {filt ? (
                  <>
                    <Text style={styles.cardMeta}>{t("filterModel")}: {filt.model}</Text>
                    <Text style={styles.cardMeta}>{t("installedDate")}: {filt.installedDate}</Text>
                    <Text
                      style={{
                        fontSize: 12, marginTop: 4, fontWeight: "700",
                        color: expired ? theme.red : expiringSoon ? theme.orange : theme.muted,
                      }}
                    >
                      {expired ? t("filterExpired") : expiringSoon ? t("filterExpiringSoon") : t("expiresDate")}: {filt.expiresDate}
                    </Text>
                  </>
                ) : (
                  <Text style={{ color: theme.muted, fontSize: 12, marginTop: 4 }}>{t("noFilterRegistered")}</Text>
                )}
              </View>
            );
          }
          // Filter change history row
          const fc = item;
          return (
            <View style={[styles.card, { flexDirection: "row", alignItems: "center", gap: 12 }]}>
              <Text style={{ fontSize: 20 }}>🧰</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.text, fontWeight: "700" }}>{tankMap[fc.tankId] ?? "—"}</Text>
                <Text style={styles.cardMeta}>{t("filterModel")}: {fc.model}</Text>
                {fc.notes ? <Text style={styles.cardNotes}>{fc.notes}</Text> : null}
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.cardMeta}>{t("installedDate")}: {fc.installedDate}</Text>
                <Text style={styles.cardMeta}>{t("expiresDate")}: {fc.expiresDate}</Text>
                <Text style={{ color: theme.muted, fontSize: 10 }}>
                  {fc.validityMonths === 24 ? t("months24") : t("months12")} · {fc.operatorName ?? ""}
                </Text>
              </View>
              {isAdmin && (
                <TouchableOpacity onPress={() => onDelete(fc.id)}>
                  <Text style={{ color: theme.red, fontSize: 16 }}>🗑️</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        }}
        ListEmptyComponent={<Text style={{ color: theme.muted, textAlign: "center", padding: 30 }}>{t("noData")}</Text>}
      />

      <FilterChangeModal
        visible={modalOpen}
        tank={null}
        tanks={tanks as any[]}
        t={t}
        onClose={() => setModalOpen(false)}
        onSaved={afterSave}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.dark },
  title: { fontSize: 20, fontWeight: "800", color: theme.sand, paddingHorizontal: 16, paddingTop: 8, marginBottom: 12 },
  newBtn: {
    marginHorizontal: 16, marginBottom: 10, borderWidth: 1, borderColor: theme.sand, borderRadius: 10,
    paddingVertical: 11, alignItems: "center",
  },
  newBtnTxt: { color: theme.sand, fontWeight: "700", fontSize: 13 },
  sectionTitle: {
    fontSize: 12, fontWeight: "700", color: theme.muted, textTransform: "uppercase",
    letterSpacing: 1, marginBottom: 10,
  },
  card: { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 14, marginBottom: 8 },
  cardMeta: { color: theme.muted, fontSize: 11, marginTop: 2 },
  cardNotes: { color: theme.muted, fontSize: 11, marginTop: 2, fontStyle: "italic" },
});
