// Giorni interi trascorsi da una data "YYYY-MM-DD" a oggi (positivo = nel passato).
export function daysSince(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const then = new Date(dateStr + "T00:00:00");
  if (isNaN(then.getTime())) return null;
  const now = new Date();
  return Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24));
}

// Data "YYYY-MM-DD" da un timestamp epoch (ms).
export function dateFromTs(ts: number | null | undefined): string | null {
  if (!ts) return null;
  return new Date(ts).toISOString().split("T")[0];
}

// Ultimo filtro registrato per ogni cisterna, dato l'elenco filterChanges.
export function latestFilterByTank(filterChanges: any[]): Record<string, any> {
  const map: Record<string, any> = {};
  (filterChanges ?? []).forEach((fc: any) => {
    const cur = map[fc.tankId];
    if (!cur || (fc.installedDate ?? "") > (cur.installedDate ?? "") ||
      ((fc.installedDate ?? "") === (cur.installedDate ?? "") && (fc.createdAt ?? 0) > (cur.createdAt ?? 0))) {
      map[fc.tankId] = fc;
    }
  });
  return map;
}
