import { differenceInCalendarDays, format, parseISO, startOfWeek, subDays } from "date-fns";
import type { Caso, EstadoInterno } from "@/lib/supabase/types";

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

// Una celda de técnico puede traer varios nombres separados por ", " — parse-casos.ts ya
// normaliza el "<br>" de GLPI a ese separador antes de guardar en la base.
function splitTecnicos(tecnico: string | null): string[] {
  const names = (tecnico ?? "").split(",").map((t) => t.trim()).filter(Boolean);
  return names.length > 0 ? names : ["Sin asignar"];
}

// El equipo real de soporte son estos dos; el resto de valores que aparecen en
// tecnico_asignado (cuentas de bot como "titan chatbot", asignaciones puntuales de
// otras áreas) no cuentan como carga de trabajo. Ajustar aquí si el equipo cambia.
const TECNICOS_EQUIPO = ["Daniel Alejandro Melo (4387)", "Jean Carlo Jimenez Vanegas (5512)"];

export function groupByTecnico(rows: Caso[], topN = 5): { label: string; value: number }[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    for (const nombre of splitTecnicos(row.tecnico_asignado)) {
      if (!TECNICOS_EQUIPO.includes(nombre)) continue;
      counts.set(nombre, (counts.get(nombre) ?? 0) + 1);
    }
  }
  const sorted = Array.from(counts.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  if (sorted.length <= topN) return sorted;

  const top = sorted.slice(0, topN);
  const otros = sorted.slice(topN).reduce((sum, r) => sum + r.value, 0);
  return [...top, { label: "Otros", value: otros }];
}

const ESTADOS_INTERNOS_ORDEN: EstadoInterno[] = ["En espera", "En curso (asignada)", "Cerrado"];

export function countByEstadoInterno(rows: Caso[]): { estado: EstadoInterno; count: number }[] {
  return ESTADOS_INTERNOS_ORDEN.map((estado) => ({
    estado,
    count: rows.filter((r) => r.estado_interno === estado).length,
  }));
}

function percentile(sorted: number[], p: number): number {
  const idx = Math.floor((sorted.length - 1) * p);
  return sorted[idx];
}

export function computeDurationStats(
  closedRows: Pick<Caso, "fecha_apertura" | "fecha_cierre">[],
  slaWindowDays = 7
): {
  n: number;
  mean: number | null;
  median: number | null;
  p90: number | null;
  withinWindow: number;
  withinWindowPct: number | null;
} {
  const durations = closedRows
    .filter((r) => r.fecha_apertura && r.fecha_cierre)
    .map((r) => differenceInCalendarDays(parseISO(r.fecha_cierre!), parseISO(r.fecha_apertura!)))
    .filter((d) => d >= 0)
    .sort((a, b) => a - b);

  const n = durations.length;
  if (n === 0) {
    return { n: 0, mean: null, median: null, p90: null, withinWindow: 0, withinWindowPct: null };
  }

  const withinWindow = durations.filter((d) => d <= slaWindowDays).length;

  return {
    n,
    mean: durations.reduce((a, b) => a + b, 0) / n,
    median: percentile(durations, 0.5),
    p90: percentile(durations, 0.9),
    withinWindow,
    withinWindowPct: Math.round((withinWindow / n) * 100),
  };
}

const STALE_THRESHOLD_DAYS = 15;

export function computeBacklogAging(
  allRows: Caso[],
  today: Date
): { count: number; oldestDias: number | null; staleCount: number } {
  const abiertos = allRows.filter((r) => r.estado_interno !== "Cerrado" && r.fecha_apertura);
  if (abiertos.length === 0) {
    return { count: 0, oldestDias: null, staleCount: 0 };
  }
  const dias = abiertos.map((r) => differenceInCalendarDays(today, parseISO(r.fecha_apertura!)));
  return {
    count: abiertos.length,
    oldestDias: Math.max(...dias),
    staleCount: dias.filter((d) => d > STALE_THRESHOLD_DAYS).length,
  };
}

export function topOldestOpen(
  allRows: Caso[],
  today: Date,
  n = 5
): { id_glpi: number; titulo: string | null; solicitante: string | null; dias: number; urgencia: string | null }[] {
  return allRows
    .filter((r) => r.estado_interno !== "Cerrado" && r.fecha_apertura)
    .map((r) => ({
      id_glpi: r.id_glpi,
      titulo: r.titulo,
      solicitante: r.solicitante,
      urgencia: r.urgencia,
      dias: differenceInCalendarDays(today, parseISO(r.fecha_apertura!)),
    }))
    .sort((a, b) => b.dias - a.dias)
    .slice(0, n);
}

function weekBuckets(weeks: number) {
  const today = new Date();
  const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });
  const keys: string[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    keys.push(format(subDays(currentWeekStart, i * 7), "yyyy-MM-dd"));
  }
  return keys;
}

export function bucketResolutionTrend(
  rows: Pick<Caso, "fecha_apertura" | "fecha_cierre">[],
  weeks = 8
): { semana: string; diasPromedio: number | null }[] {
  const order = weekBuckets(weeks);
  const buckets = new Map<string, number[]>(order.map((k) => [k, []]));

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

export function bucketVolumeTrend(
  rows: Pick<Caso, "fecha_apertura">[],
  weeks = 8
): { semana: string; casos: number }[] {
  const order = weekBuckets(weeks);
  const buckets = new Map<string, number>(order.map((k) => [k, 0]));

  for (const row of rows) {
    if (!row.fecha_apertura) continue;
    const weekKey = format(startOfWeek(parseISO(row.fecha_apertura), { weekStartsOn: 1 }), "yyyy-MM-dd");
    if (buckets.has(weekKey)) buckets.set(weekKey, buckets.get(weekKey)! + 1);
  }

  return order.map((key) => ({ semana: format(parseISO(key), "dd/MM"), casos: buckets.get(key)! }));
}
