import {
  differenceInCalendarDays,
  format,
  parseISO,
  startOfWeek,
  subDays,
} from "date-fns";
import type { Caso } from "@/lib/supabase/types";

export function previousRangeFor(
  desde: string | null,
  hasta: string | null
): { desde: string; hasta: string } | null {
  if (!desde || !hasta) return null;
  const desdeDate = parseISO(desde);
  const hastaDate = parseISO(hasta);
  const lengthDays = differenceInCalendarDays(hastaDate, desdeDate) + 1;
  const prevHasta = subDays(desdeDate, 1);
  const prevDesde = subDays(prevHasta, lengthDays - 1);
  return {
    desde: format(prevDesde, "yyyy-MM-dd"),
    hasta: format(prevHasta, "yyyy-MM-dd"),
  };
}

export function deltaVs(current: number, previous: number | null): number | null {
  if (previous === null) return null;
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 100);
}

// El texto de categoría viene como "01. ERP e-Satellite > Bloqueo Sesión ..."
// La parte útil para agrupar es lo que sigue al último ">".
function subcategoria(categoria: string | null): string {
  if (!categoria) return "Sin categoría";
  const parts = categoria.split(">");
  return parts[parts.length - 1].trim() || "Sin categoría";
}

export function groupByCategoria(
  rows: Caso[],
  topN = 5
): { label: string; value: number }[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = subcategoria(row.categoria);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const sorted = Array.from(counts.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  if (sorted.length <= topN) return sorted;

  const top = sorted.slice(0, topN);
  const otras = sorted.slice(topN).reduce((sum, r) => sum + r.value, 0);
  return [...top, { label: "Otras", value: otras }];
}

const URGENCIAS_ORDEN = ["Alta", "Mediana", "Baja"] as const;

export function groupByUrgencia(rows: Caso[]): { label: string; value: number }[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = row.urgencia?.trim() || "Sin especificar";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const ordered = URGENCIAS_ORDEN.filter((u) => counts.has(u)).map((u) => ({
    label: u,
    value: counts.get(u)!,
  }));
  const resto = Array.from(counts.entries())
    .filter(([label]) => !(URGENCIAS_ORDEN as readonly string[]).includes(label))
    .map(([label, value]) => ({ label, value }));
  return [...ordered, ...resto];
}

export function bucketResolutionTrend(
  rows: Pick<Caso, "fecha_apertura" | "fecha_cierre">[],
  weeks = 8
): { semana: string; diasPromedio: number | null }[] {
  const today = new Date();
  const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });

  const buckets = new Map<string, number[]>();
  const order: string[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = subDays(currentWeekStart, i * 7);
    const key = format(weekStart, "yyyy-MM-dd");
    buckets.set(key, []);
    order.push(key);
  }

  for (const row of rows) {
    if (!row.fecha_apertura || !row.fecha_cierre) continue;
    const cierre = parseISO(row.fecha_cierre);
    const weekKey = format(startOfWeek(cierre, { weekStartsOn: 1 }), "yyyy-MM-dd");
    const bucket = buckets.get(weekKey);
    if (!bucket) continue;
    const dias = differenceInCalendarDays(cierre, parseISO(row.fecha_apertura));
    if (dias >= 0) bucket.push(dias);
  }

  return order.map((key) => {
    const values = buckets.get(key)!;
    const diasPromedio =
      values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null;
    return { semana: format(parseISO(key), "dd/MM"), diasPromedio };
  });
}
