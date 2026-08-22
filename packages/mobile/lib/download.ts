import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { post } from "./api";

export type ReportKind = "movements" | "drain-checks";
export type ReportFormat = "pdf" | "xlsx";

type ReportBody = { format: ReportFormat; from?: string; to?: string; ids?: string[] };

/**
 * Chiede al backend il report (base64), lo salva su disco e apre il foglio di
 * condivisione (iOS/Android). Su web forza il download dal browser.
 * Usa POST: le selezioni lunghe in query-string rompono su iOS.
 */
export async function downloadReport(kind: ReportKind, body: ReportBody): Promise<string> {
  const res = await post(`/api/reports/${kind}`, body);
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error((data as any)?.error ?? `HTTP ${res.status}`);
  }
  const { filename, mime, base64 } = data as { filename: string; mime: string; base64: string };
  if (!base64) throw new Error("Report vuoto");

  if (Platform.OS === "web") {
    const bin = atob(base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return filename;
  }

  const dir = FileSystem.documentDirectory ?? FileSystem.cacheDirectory ?? "";
  const uri = `${dir}${filename}`;
  await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });

  if (await Sharing.isAvailableAsync()) {
    // iOS: da qui l'utente sceglie "Salva su File", Mail, WhatsApp, ecc.
    // Android: apre il selettore app / salvataggio in una cartella.
    await Sharing.shareAsync(uri, { mimeType: mime, dialogTitle: filename, UTI: mime === "application/pdf" ? "com.adobe.pdf" : "org.openxmlformats.spreadsheetml.sheet" });
  }
  return filename;
}

/** Ritorna { from, to } in formato YYYY-MM-DD per gli ultimi N giorni. */
export function lastDays(n: number): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - (n - 1));
  const fmt = (d: Date) => d.toISOString().split("T")[0];
  return { from: fmt(from), to: fmt(to) };
}
