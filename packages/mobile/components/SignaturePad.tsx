import { useRef, useState } from "react";
import { View, Text, TouchableOpacity, PanResponder, StyleSheet } from "react-native";
import Svg, { Path } from "react-native-svg";
import { theme } from "../lib/theme";

const W = 300;
const H = 140;

/**
 * Firma a dito. I tratti vengono raccolti come path SVG:
 * - `paths` viene salvato in DB (rendering e PDF)
 * - `toSvg()` produce il file SVG caricato su storage come immagine della firma
 */
export function SignaturePad({ paths, onChange, t }: { paths: string[]; onChange: (p: string[]) => void; t: (k: any) => string }) {
  const current = useRef<string>("");
  const [live, setLive] = useState("");

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const { locationX, locationY } = e.nativeEvent;
        current.current = `M${locationX.toFixed(1)},${locationY.toFixed(1)}`;
        setLive(current.current);
      },
      onPanResponderMove: (e) => {
        const { locationX, locationY } = e.nativeEvent;
        current.current += ` L${locationX.toFixed(1)},${locationY.toFixed(1)}`;
        setLive(current.current);
      },
      onPanResponderRelease: () => {
        if (current.current.includes("L")) {
          onChange([...pathsRef.current, current.current]);
        }
        current.current = "";
        setLive("");
      },
    }),
  ).current;

  // Ref sempre aggiornata: il PanResponder viene creato una sola volta.
  const pathsRef = useRef(paths);
  pathsRef.current = paths;

  return (
    <View>
      <View style={styles.pad} {...responder.panHandlers}>
        <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
          {paths.map((d, i) => (
            <Path key={i} d={d} stroke={theme.text} strokeWidth={2.2} fill="none" strokeLinecap="round" />
          ))}
          {live ? <Path d={live} stroke={theme.text} strokeWidth={2.2} fill="none" strokeLinecap="round" /> : null}
        </Svg>
        {paths.length === 0 && !live ? <Text style={styles.placeholder}>{t("signHere")}</Text> : null}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
        <Text style={{ color: theme.muted, fontSize: 11, flex: 1 }}>{t("signatureHint")}</Text>
        <TouchableOpacity onPress={() => onChange([])} style={styles.clearBtn}>
          <Text style={{ color: theme.muted, fontSize: 12 }}>✕ {t("clearSignature")}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/** Serializza i tratti in un file SVG autonomo. */
export function pathsToSvg(paths: string[]): string {
  const body = paths
    .map((d) => `<path d="${d}" stroke="#101820" stroke-width="2.2" fill="none" stroke-linecap="round"/>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="100%" height="100%" fill="#ffffff"/>${body}</svg>`;
}

const styles = StyleSheet.create({
  pad: {
    height: H,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.04)",
    justifyContent: "center",
    overflow: "hidden",
  },
  placeholder: { position: "absolute", alignSelf: "center", color: theme.muted, fontSize: 12 },
  clearBtn: { paddingVertical: 4, paddingHorizontal: 8, borderWidth: 1, borderColor: theme.border, borderRadius: 6 },
});
