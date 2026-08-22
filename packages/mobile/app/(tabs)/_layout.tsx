import { Tabs } from "expo-router";
import { Text } from "react-native";
import { theme } from "../../lib/theme";
import { useLang } from "../../lib/lang";

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>;
}

export default function TabsLayout() {
  const { t } = useLang();
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
        name="profile"
        options={{ title: t("profile"), tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} /> }}
      />
    </Tabs>
  );
}
