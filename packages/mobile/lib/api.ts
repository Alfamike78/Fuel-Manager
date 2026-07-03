import { hc } from "hono/client";
import Constants from "expo-constants";
import type { AppType } from "@template/web";
import { getToken, getImpersonatedCompanyId } from "./auth";

const baseUrl =
  Constants.expoConfig?.extra?.apiUrl ??
  process.env.EXPO_PUBLIC_API_URL;

const client = hc<AppType>(baseUrl!, {
  headers: () => {
    const token = getToken();
    const cid = getImpersonatedCompanyId();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (cid) headers["X-Company-Id"] = cid;
    return headers;
  },
});

export const api = client.api;

// ── Plain fetch helpers (for endpoints not using typed hc paths) ───────────
function authHeaders(): Record<string, string> {
  const token = getToken();
  const cid = getImpersonatedCompanyId();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (cid) headers["X-Company-Id"] = cid;
  return headers;
}

export const get = (path: string) => fetch(`${baseUrl}${path}`, { headers: authHeaders() }).then((r) => r.json());
export const post = (path: string, body: any) =>
  fetch(`${baseUrl}${path}`, { method: "POST", headers: authHeaders(), body: JSON.stringify(body) });
export const patch = (path: string, body: any) =>
  fetch(`${baseUrl}${path}`, { method: "PATCH", headers: authHeaders(), body: JSON.stringify(body) });
export const del = (path: string) =>
  fetch(`${baseUrl}${path}`, { method: "DELETE", headers: authHeaders() });
