import { createAuthClient } from "better-auth/react";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";

const isWeb = Platform.OS === "web";
const TOKEN_KEY = "pc_bearer_token";

const baseURL =
  Constants.expoConfig?.extra?.apiUrl ??
  process.env.EXPO_PUBLIC_API_URL;

export function getToken(): string {
  try {
    return SecureStore.getItem(TOKEN_KEY) ?? "";
  } catch {
    try {
      return localStorage.getItem(TOKEN_KEY) ?? "";
    } catch {
      return "";
    }
  }
}

export function setToken(token: string) {
  try {
    SecureStore.setItem(TOKEN_KEY, token);
  } catch {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {}
  }
}

export async function removeToken() {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {}
  }
}

export const authClient = createAuthClient({
  baseURL,
  basePath: "/api/auth",
  fetchOptions: {
    ...(isWeb ? { credentials: "omit" as const } : {}),
    auth: {
      type: "Bearer",
      token: () => getToken(),
    },
    headers: isWeb ? {} : { "expo-origin": "mobile://" },
  },
});

/** Call in onSuccess of signIn/signUp to capture the bearer token */
export function captureToken(ctx: { response: Response }) {
  const token = ctx.response.headers.get("set-auth-token");
  if (token) setToken(token);
}

/** Clear stored token on sign-out */
export async function clearToken() {
  await removeToken();
}

// ── Impersonation (superadmin) ──────────────────────────────────────────────
const IMP_ID_KEY = "pc_impersonate_company";
const IMP_NAME_KEY = "pc_impersonate_name";

export function getImpersonatedCompanyId(): string | null {
  try {
    return SecureStore.getItem(IMP_ID_KEY);
  } catch {
    try {
      return localStorage.getItem(IMP_ID_KEY);
    } catch {
      return null;
    }
  }
}

export function getImpersonatedCompanyName(): string | null {
  try {
    return SecureStore.getItem(IMP_NAME_KEY);
  } catch {
    try {
      return localStorage.getItem(IMP_NAME_KEY);
    } catch {
      return null;
    }
  }
}

export function setImpersonation(id: string, name: string) {
  try {
    SecureStore.setItem(IMP_ID_KEY, id);
    SecureStore.setItem(IMP_NAME_KEY, name);
  } catch {
    try {
      localStorage.setItem(IMP_ID_KEY, id);
      localStorage.setItem(IMP_NAME_KEY, name);
    } catch {}
  }
}

export function clearImpersonation() {
  try {
    SecureStore.deleteItemAsync(IMP_ID_KEY);
    SecureStore.deleteItemAsync(IMP_NAME_KEY);
  } catch {
    try {
      localStorage.removeItem(IMP_ID_KEY);
      localStorage.removeItem(IMP_NAME_KEY);
    } catch {}
  }
}
