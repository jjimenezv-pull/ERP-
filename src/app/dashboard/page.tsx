import { differenceInCalendarDays, parseISO } from "date-fns";

import { createServerClient } from "@/lib/supabase/server";
import { resolveDateRange } from "@/lib/date-range";
import type { EstadoProveedor } from "@/lib/supabase/types";
import { DashboardFilters } from "@/components/dashboard/dashboard-filters";
import { OpenVsClosedChart } from "@/components/dashboard/open-vs-closed-chart";
import { ResolutionTimeCard } from "@/components/dashboard/resolution-time-card";
import { EstadoProveedorChart } from "@/components/dashboard/estado-proveedor-chart";
import { TopSolicitantesChart } from "@/components/dashboard/top-solicitantes-chart";

export const dynamic = "force-dynamic";

const ESTADOS_PROVEEDOR: EstadoProveedor[] = ["N/A", "Pendiente", "En revisión", "Resuelto"];

interface DashboardPageProps {
  searchParams: { vista?: string; desde?: string; hasta?: string };
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const { desde, hasta } = resolveDateRange(searchParams.vista, searchParams.desde, searchParams.hasta);

  const supabase = createServerClient();

  let abiertosQuery = supabase.from("casos").select("*");
  if (desde) abiertosQuery = abiertosQuery.gte("fecha_apertura", desde);
  if (hasta) abiertosQuery = abiertosQuery.lte("fecha_apertura", hasta);

  let cerradosQuery = supabase.from("casos").select("*").not("fecha_cierre", "is", null);
  if (desde) cerradosQuery = cerradosQuery.gte("fecha_cierre", desde);
  if (hasta) cerradosQuery = cerradosQuery.lte("fecha_cierre", hasta);

  const [{ data: abiertos, error: errorAbiertos }, { data: cerrados, error: errorCerrados }] =
    await Promise.all([abiertosQuery, cerradosQuery]);

  if (errorAbiertos || errorCerrados) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        Error al cargar el dashboard: {(errorAbiertos ?? errorCerrados)?.message}
      </div>
    );
  }

  const abiertosRows = abiertos ?? [];
  const cerradosRows = cerrados ?? [];

  // a) Casos abiertos vs cerrados en el periodo
  const abiertosCount = abiertosRows.length;
  const cerradosCount = cerradosRows.length;

  // b) Tiempo promedio de resolución, sobre los casos cerrados en el periodo
  const duraciones = cerradosRows
    .filter((r) => r.fecha_apertura && r.fecha_cierre)
    .map((r) => differenceInCalendarDays(parseISO(r.fecha_cierre!), parseISO(r.fecha_apertura!)))
    .filter((dias) => dias >= 0);
  const promedioDias =
    duraciones.length > 0 ? duraciones.reduce((a, b) => a + b, 0) / duraciones.length : null;

  // c) Distribución de casos abiertos en el periodo por estado_proveedor
  const estadoCounts = ESTADOS_PROVEEDOR.map((estado) => ({
    estado,
    count: abiertosRows.filter((r) => (r.estado_proveedor ?? "N/A") === estado).length,
  }));

  // d) Top 5 solicitantes con más casos abiertos en el periodo
  const solicitanteCounts = new Map<string, number>();
  for (const row of abiertosRows) {
    const nombre = row.solicitante?.trim() || "Sin especificar";
    solicitanteCounts.set(nombre, (solicitanteCounts.get(nombre) ?? 0) + 1);
  }
  const topSolicitantes = Array.from(solicitanteCounts.entries())
    .map(([nombre, count]) => ({ nombre, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const rangoLabel =
    desde && hasta ? `${desde} — ${hasta}` : desde ? `Desde ${desde}` : hasta ? `Hasta ${hasta}` : "Todo el histórico";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">{rangoLabel}</p>
      </div>

      <DashboardFilters />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <OpenVsClosedChart abiertos={abiertosCount} cerrados={cerradosCount} />
        <ResolutionTimeCard promedioDias={promedioDias} casosConsiderados={duraciones.length} />
        <EstadoProveedorChart data={estadoCounts} />
        <TopSolicitantesChart data={topSolicitantes} />
      </div>
    </div>
  );
}
