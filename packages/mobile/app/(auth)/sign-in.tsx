import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { authClient, captureToken } from "../../lib/auth";
import { post } from "../../lib/api";
import { theme } from "../../lib/theme";

export default function SignIn() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        const res = await authClient.signIn.email(
          { email, password },
          { onSuccess: captureToken }
        );
        if (res.error) throw new Error(res.error.message ?? "Errore login");
      } else {
        // 1) Create company (trial)
        const coRes = await fetch(
          `${(authClient as any).options?.baseURL ?? ""}/api/companies/register`,
          { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: companyName }) }
        );
        const company = coRes.ok ? await coRes.json() : null;

        // 2) Sign up
        const res = await authClient.signUp.email(
          { name, email, password },
          { onSuccess: captureToken }
        );
        if (res.error) throw new Error(res.error.message ?? "Errore registrazione");

        // 3) Link user to company
        if (company) {
          await post("/api/companies/link", { companyId: company.id });
        }
      }
      router.replace("/(tabs)");
    } catch (e: any) {
      setError(e.message ?? "Errore");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.logoRow}>
            <View style={styles.logoBox}><Text style={{ fontSize: 28 }}>🚁</Text></View>
            <View>
              <Text style={styles.brand}>PilotCraft</Text>
              <Text style={styles.brandSub}>SOLUTIONS</Text>
            </View>
          </View>
          <Text style={styles.tagline}>Forest Expertise in Air Response</Text>

          <Text style={styles.title}>{mode === "login" ? "Accedi" : "Registrati"}</Text>

          {mode === "register" && (
            <>
              <Text style={styles.label}>Nome</Text>
              <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Mario Rossi" placeholderTextColor={theme.muted} />
              <Text style={styles.label}>Nome Azienda</Text>
              <TextInput style={styles.input} value={companyName} onChangeText={setCompanyName} placeholder="Elicotteri Nord Italia SRL" placeholderTextColor={theme.muted} />
            </>
          )}

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input} value={email} onChangeText={setEmail} placeholder="nome@azienda.com"
            placeholderTextColor={theme.muted} autoCapitalize="none" keyboardType="email-address"
          />
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input} value={password} onChangeText={setPassword} placeholder="••••••••"
            placeholderTextColor={theme.muted} secureTextEntry
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity style={styles.btn} onPress={handleSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color={theme.sand} /> : (
              <Text style={styles.btnText}>{mode === "login" ? "Accedi" : "Registrati"}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>
            <Text style={styles.switchText}>
              {mode === "login" ? "Non hai un account? " : "Hai già un account? "}
              <Text style={{ color: theme.sand, fontWeight: "700" }}>
                {mode === "login" ? "Registrati" : "Accedi"}
              </Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.dark },
  scroll: { padding: 24, paddingTop: 40, flexGrow: 1, justifyContent: "center" },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 4 },
  logoBox: {
    width: 52, height: 52, borderRadius: 12, backgroundColor: theme.primary,
    alignItems: "center", justifyContent: "center", marginRight: 12,
  },
  brand: { fontSize: 22, fontWeight: "800", color: theme.sand, letterSpacing: -0.5 },
  brandSub: { fontSize: 11, color: theme.muted, letterSpacing: 2 },
  tagline: { color: theme.muted, fontSize: 13, marginBottom: 32 },
  title: { fontSize: 22, fontWeight: "700", color: theme.text, marginBottom: 20 },
  label: { fontSize: 12, color: theme.muted, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: theme.dark, borderWidth: 1, borderColor: theme.border, borderRadius: 8,
    padding: 12, color: theme.text, fontSize: 15,
  },
  error: {
    color: theme.red, backgroundColor: "rgba(239,68,68,0.1)", borderWidth: 1,
    borderColor: "rgba(239,68,68,0.3)", borderRadius: 8, padding: 10, marginTop: 16, fontSize: 13,
  },
  btn: { backgroundColor: theme.primary, borderRadius: 8, padding: 14, alignItems: "center", marginTop: 24 },
  btnText: { color: theme.sand, fontWeight: "700", fontSize: 15 },
  switchText: { textAlign: "center", marginTop: 20, color: theme.muted, fontSize: 13 },
});
