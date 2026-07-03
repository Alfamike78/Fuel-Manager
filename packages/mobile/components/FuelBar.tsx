import { View } from "react-native";
import { theme } from "../lib/theme";

export function FuelBar({ level, capacity, alert }: { level: number; capacity: number; alert: number }) {
  const pct = Math.min(100, (level / capacity) * 100);
  const color = level <= alert ? theme.red : level <= alert * 1.5 ? theme.orange : theme.green;
  return (
    <View style={{ height: 8, borderRadius: 4, backgroundColor: theme.border, overflow: "hidden", marginTop: 6 }}>
      <View style={{ width: `${pct}%`, height: "100%", backgroundColor: color, borderRadius: 4 }} />
    </View>
  );
}
