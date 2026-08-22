import { Tabs } from "expo-router";
import { Text } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { get } from "../../lib/api";
import { theme } from "../../lib/theme";
import { useLang } from "../../lib/lang";

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>;
}

export default function TabsLayout() {
  const { t } = useLang();
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => get("/api/admin/me/role") });
  const role = (me as any)?.role;
  const isAdmin = role === "admin" || role === "superadmin";
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: theme.card, borderTopColor: theme.border },
        tabBarActiveTintColor: theme.sand,
        tabBarInactiveTintColor: theme.muted,
        tabBarLabelStyle: { fontSize: 10 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: t("dashboard"), tabBarIcon: ({ focused }) => <TabIcon emoji="📊" focused={focused} /> }}
      />
      <Tabs.Screen
        name="history"
        options={{ title: t("history"), tabBarIcon: ({ focused }) => <TabIcon emoji="📋" focused={focused} /> }}
      />
      <Tabs.Screen
        name="analytics"
        options={{ title: t("analytics"), tabBarIcon: ({ focused }) => <TabIcon emoji="📈" focused={focused} /> }}
      />
      <Tabs.Screen
        name="drainlog"
        options={{ title: t("drainCheck"), tabBarIcon: ({ focused }) => <TabIcon emoji="🔍" focused={focused} /> }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: t("config"),
          tabBarIcon: ({ focused }) => <TabIcon emoji="⚙️" focused={focused} />,
          // operatori: tab nascosta (il backend blocca comunque con 403)
          href: isAdmin ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: t("profile"), tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} /> }}
      />
    </Tabs>
  );
}
