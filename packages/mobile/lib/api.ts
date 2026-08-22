import { hc } from "hono/client";
import Constants from "expo-constants";
import type { AppType } from "@template/web";
import { getToken, getImpersonatedCompanyId } from "./auth";

const baseUrl = String(
  Constants.expoConfig?.extra?.apiUrl ?? process.env.EXPO_PUBLIC_API_URL ?? "",
).replace(/\/+$/, "");

export const API_BASE = baseUrl;

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

export const get = async (path: string) => {
  const r = await fetch(`${baseUrl}${path}`, { headers: authHeaders() });
  const body = await r.json().catch(() => null);
  if (!r.ok) {
    throw new Error((body as any)?.error ?? `HTTP ${r.status} su ${path}`);
  }
  return body;
};
export const post = (path: string, body: any) =>
  fetch(`${baseUrl}${path}`, { method: "POST", headers: authHeaders(), body: JSON.stringify(body) });
export const patch = (path: string, body: any) =>
  fetch(`${baseUrl}${path}`, { method: "PATCH", headers: authHeaders(), body: JSON.stringify(body) });
export const del = (path: string) =>
  fetch(`${baseUrl}${path}`, { method: "DELETE", headers: authHeaders() });
