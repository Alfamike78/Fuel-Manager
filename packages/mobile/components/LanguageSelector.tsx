import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useLang } from "../lib/lang";
import { translations, Lang } from "../i18n/translations";
import { theme } from "../lib/theme";

/**
 * Selettore lingua a chip (6 lingue).
 * compact = solo bandiera (per header), altrimenti bandiera + nome lingua.
 */
export function LanguageSelector({ compact = false }: { compact?: boolean }) {
  const { lang, changeLang, langs } = useLang();

  return (
    <View style={styles.row}>
      {langs.map((l: Lang) => {
        const active = l === lang;
        return (
          <TouchableOpacity
            key={l}
            onPress={() => changeLang(l)}
            style={[styles.chip, active && styles.chipActive, compact && styles.chipCompact]}
            accessibilityLabel={translations[l].langName}
          >
            <Text style={{ fontSize: compact ? 16 : 14 }}>{translations[l].flag}</Text>
            {!compact && (
              <Text style={[styles.label, active && styles.labelActive]}>{translations[l].langName}</Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: theme.dark,
  },
  chipCompact: { paddingHorizontal: 8, paddingVertical: 4, gap: 0 },
  chipActive: { borderColor: theme.sand, backgroundColor: "rgba(214,196,160,0.12)" },
  label: { color: theme.muted, fontSize: 12 },
  labelActive: { color: theme.sand, fontWeight: "700" },
});
