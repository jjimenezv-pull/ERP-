import { differenceInCalendarDays, format, parseISO, subDays } from "date-fns";

import { createServerClient } from "@/lib/supabase/server";
import { resolveDateRange } from "@/lib/date-range";
import {
  bucketResolutionTrend,
  deltaVs,
  groupByCategoria,
  groupByUrgencia,
  previousRangeFor,
} from "@/lib/dashboard-metrics";
import type { EstadoProveedor } from "@/lib/supabase/types";
import { DashboardFilters } from "@/components/dashboard/dashboard-filters";
import { OpenVsClosedChart } from "@/components/dashboard/open-vs-closed-chart";
import { ResolutionTimeCard } from "@/components/dashboard/resolution-time-card";
import { EstadoProveedorChart } from "@/components/dashboard/estado-proveedor-chart";
import { RankedBarChart } from "@/components/dashboard/ranked-bar-chart";
import { ResolutionTrendChart } from "@/components/dashboard/resolution-trend-chart";

export const dynamic = "force-dynamic";

const ESTADOS_PROVEEDOR: EstadoProveedor[] = ["N/A", "Pendiente", "En revisión", "Resuelto"];
const TREND_WEEKS = 8;

interface DashboardPageProps {
  searchParams: { vista?: string; desde?: string; hasta?: string };
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const { desde, hasta } = resolveDateRange(searchParams.vista, searchParams.desde, searchParams.hasta);
  const prevRange = previousRangeFor(desde, hasta);

  const supabase = createServerClient();

  let abiertosQuery = supabase.from("casos").select("*");
  if (desde) abiertosQuery = abiertosQuery.gte("fecha_apertura", desde);
  if (hasta) abiertosQuery = abiertosQuery.lte("fecha_apertura", hasta);

  let cerradosQuery = supabase.from("casos").select("*").not("fecha_cierre", "is", null);
  if (desde) cerradosQuery = cerradosQuery.gte("fecha_cierre", desde);
  if (hasta) cerradosQuery = cerradosQuery.lte("fecha_cierre", hasta);

  let abiertosPrevQuery = supabase.from("casos").select("id", { count: "exact", head: true });
  let cerradosPrevQuery = supabase
    .from("casos")
    .select("id", { count: "exact", head: true })
    .not("fecha_cierre", "is", null);
  if (prevRange) {
    abiertosPrevQuery = abiertosPrevQuery.gte("fecha_apertura", prevRange.desde).lte("fecha_apertura", prevRange.hasta);
    cerradosPrevQuery = cerradosPrevQuery.gte("fecha_cierre", prevRange.desde).lte("fecha_cierre", prevRange.hasta);
  }

  const trendDesde = format(subDays(new Date(), TREND_WEEKS * 7), "yyyy-MM-dd");
  const trendQuery = supabase
    .from("casos")
    .select("fecha_apertura, fecha_cierre")
    .not("fecha_cierre", "is", null)
    .gte("fecha_cierre", trendDesde);

  const [
    { data: abiertos, error: errorAbiertos },
    { data: cerrados, error: errorCerrados },
    { count: abiertosPrevCount, error: errorAbiertosPrev },
    { count: cerradosPrevCount, error: errorCerradosPrev },
    { data: trendRows, error: errorTrend },
  ] = await Promise.all([abiertosQuery, cerradosQuery, abiertosPrevQuery, cerradosPrevQuery, trendQuery]);

  const firstError = errorAbiertos ?? errorCerrados ?? errorAbiertosPrev ?? errorCerradosPrev ?? errorTrend;
  if (firstError) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        Error al cargar el dashboard: {firstError.message}
      </div>
    );
  }

  const abiertosRows = abiertos ?? [];
  const cerradosRows = cerrados ?? [];

  // a) Casos abiertos vs cerrados en el periodo, comparado con el periodo anterior
  const abiertosCount = abiertosRows.length;
  const cerradosCount = cerradosRows.length;
  const abiertosDelta = prevRange ? deltaVs(abiertosCount, abiertosPrevCount ?? 0) : null;
  const cerradosDelta = prevRange ? deltaVs(cerradosCount, cerradosPrevCount ?? 0) : null;

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
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  // e) Casos por categoría y por urgencia, sobre los casos abiertos en el periodo
  const categoriaCounts = groupByCategoria(abiertosRows);
  const urgenciaCounts = groupByUrgencia(abiertosRows);

  // f) Tendencia de tiempo de solución, últimas 8 semanas (independiente del periodo seleccionado)
  const trend = bucketResolutionTrend(trendRows ?? [], TREND_WEEKS);

  const rangoLabel =
    desde && hasta ? `${desde} — ${hasta}` : desde ? `Desde ${desde}` : hasta ? `Hasta ${hasta}` : "Todo el histórico";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">{rangoLabel}</p>
      </div>

      <DashboardFilters />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Resumen del periodo</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <OpenVsClosedChart
            abiertos={abiertosCount}
            cerrados={cerradosCount}
            abiertosDelta={abiertosDelta}
            cerradosDelta={cerradosDelta}
          />
          <ResolutionTimeCard promedioDias={promedioDias} casosConsiderados={duraciones.length} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Distribución</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <EstadoProveedorChart data={estadoCounts} />
          <RankedBarChart
            title="Casos por categoría"
            description="Casos abiertos en el periodo, por subcategoría"
            data={categoriaCounts}
          />
          <RankedBarChart
            title="Casos por urgencia"
            description="Casos abiertos en el periodo, por nivel de urgencia"
            data={urgenciaCounts}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Tendencia y solicitantes</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <ResolutionTrendChart data={trend} />
          <RankedBarChart
            title="Top 5 solicitantes"
            description="Con más casos abiertos en el periodo seleccionado"
            data={topSolicitantes}
          />
        </div>
      </section>
    </div>
  );
}
