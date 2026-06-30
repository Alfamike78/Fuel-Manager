import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";

const SUPERADMIN_EMAIL = "augustomarzorati@libero.it";

async function fetchMe() {
  const res = await fetch("/api/admin/me/role", { credentials: "include" });
  if (!res.ok) return null;
  return res.json();
}

export function useMe() {
  return useQuery({ queryKey: ["me"], queryFn: fetchMe, retry: false, staleTime: 30_000 });
}

export function useAuth() {
  const qc = useQueryClient();
  const [, setLocation] = useLocation();

  const login = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const res = await fetch("/api/auth/sign-in/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message ?? "Errore login"); }
      return res.json();
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["me"] });
      const me = await fetchMe();
      if (me?.role === "superadmin") {
        setLocation("/superadmin");
      } else {
        setLocation("/dashboard");
      }
    },
  });

  const register = useMutation({
    mutationFn: async ({ name, email, password, companyName }: { name: string; email: string; password: string; companyName: string }) => {
      // Create company first
      const coRes = await fetch("/api/companies/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: companyName }),
      });
      // Sign up
      const res = await fetch("/api/auth/sign-up/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, email, password }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message ?? "Errore registrazione"); }
      return { signUp: await res.json(), company: coRes.ok ? await coRes.json() : null };
    },
    onSuccess: async (data) => {
      // Link user to company after signup
      if (data.company) {
        await fetch("/api/companies/link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ companyId: data.company.id }),
        });
      }
      await qc.invalidateQueries({ queryKey: ["me"] });
      setLocation("/dashboard");
    },
  });

  const logout = useMutation({
    mutationFn: async () => {
      await fetch("/api/auth/sign-out", { method: "POST", credentials: "include" });
      localStorage.removeItem("pc_impersonate_company");
      localStorage.removeItem("pc_impersonate_name");
    },
    onSuccess: () => {
      qc.clear();
      window.location.href = "/";
    },
  });

  return { login, register, logout };
}

export function getImpersonatedCompanyId(): string | null {
  return localStorage.getItem("pc_impersonate_company");
}

export function getImpersonatedCompanyName(): string | null {
  return localStorage.getItem("pc_impersonate_name");
}

export function setImpersonation(id: string, name: string) {
  localStorage.setItem("pc_impersonate_company", id);
  localStorage.setItem("pc_impersonate_name", name);
}

export function clearImpersonation() {
  localStorage.removeItem("pc_impersonate_company");
  localStorage.removeItem("pc_impersonate_name");
}

export function authHeaders(): HeadersInit {
  const cid = getImpersonatedCompanyId();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (cid) headers["X-Company-Id"] = cid;
  return headers;
}
