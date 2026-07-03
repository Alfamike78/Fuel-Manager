import { useEffect, useState } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { View, ActivityIndicator } from "react-native";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { OneDollarStatsProvider } from "../lib/analytics";
import { authClient, getImpersonatedCompanyId } from "../lib/auth";
import { get } from "../lib/api";
import { theme } from "../lib/theme";
import appJson from "../app.json";

const queryClient = new QueryClient();

const applicationId = appJson.expo.extra.applicationId ?? "";
const hostname = applicationId ? `${applicationId}-mobile` : "localhost";

function AuthGate() {
  const { data: session, isPending } = authClient.useSession();
  const segments = useSegments();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  const { data: me, isLoading: meLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => get("/api/admin/me/role"),
    enabled: !!session,
  });

  useEffect(() => {
    if (isPending) return;
    if (session && meLoading) return; // wait for role before routing

    const segment0 = segments[0];
    const inAuthGroup = segment0 === "(auth)";
    const inSuperAdminGroup = segment0 === "(superadmin)";
    const isSuperAdmin = (me as any)?.role === "superadmin";
    const impersonating = !!getImpersonatedCompanyId();

    if (!session && !inAuthGroup) {
      router.replace("/(auth)/sign-in");
    } else if (session && inAuthGroup) {
      router.replace(isSuperAdmin ? "/(superadmin)" : "/(tabs)");
    } else if (session && isSuperAdmin && !impersonating && !inSuperAdminGroup) {
      router.replace("/(superadmin)");
    } else if (session && (!isSuperAdmin || impersonating) && inSuperAdminGroup) {
      router.replace("/(tabs)");
    }
    setReady(true);
  }, [session, isPending, meLoading, me, segments]);

  if (isPending || !ready || (session && meLoading)) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.dark }}>
        <ActivityIndicator color={theme.sand} size="large" />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      {/* Runable analytics provider — do not remove, required for analytics tracking */}
      <OneDollarStatsProvider
        config={{
          hostname,
          collectorUrl: "https://r.lilstts.com/events",
          devmode: true,
        }}
      >
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <AuthGate />
          </QueryClientProvider>
        </SafeAreaProvider>
      </OneDollarStatsProvider>
    </ErrorBoundary>
  );
}
