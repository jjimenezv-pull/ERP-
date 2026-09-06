import { createServerClient } from "@/lib/supabase/server";
import { resolveDateRange } from "@/lib/date-range";
import {
  bucketResolutionTrend,
  bucketVolumeTrend,
  computeBacklogAging,
  computeDurationStats,
  countByEstadoInterno,
  groupByCategoria,
  groupByTecnico,
  groupByUrgencia,
  topOldestOpen,
} from "@/lib/dashboard-metrics";
import type { EstadoProveedor } from "@/lib/supabase/types";
import { DashboardFilters } from "@/components/dashboard/dashboard-filters";
import { EstadoInternoChart } from "@/components/dashboard/estado-interno-chart";
import { SlaKpiCard } from "@/components/dashboard/sla-kpi-card";
import { ResolutionTimeCard } from "@/components/dashboard/resolution-time-card";
import { BacklogAgingCard } from "@/components/dashboard/backlog-aging-card";
import { EstadoProveedorChart } from "@/components/dashboard/estado-proveedor-chart";
import { RankedBarChart } from "@/components/dashboard/ranked-bar-chart";
import { TrendLineChart } from "@/components/dashboard/trend-line-chart";
import { OldestOpenCasesList } from "@/components/dashboard/oldest-open-cases-list";
import { RefreshButton } from "@/components/dashboard/refresh-button";
import { ExportPptxButton } from "@/components/dashboard/export-pptx-button";

export const dynamic = "force-dynamic";

const ESTADOS_PROVEEDOR: EstadoProveedor[] = ["N/A", "Pendiente", "En revisión", "Resuelto"];
const TREND_WEEKS = 8;
const SLA_WINDOW_DAYS = 7;
const SLA_TARGET_PCT = 90;

interface DashboardPageProps {
  searchParams: { vista?: string; desde?: string; hasta?: string };
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const { desde, hasta } = resolveDateRange(searchParams.vista, searchParams.desde, searchParams.hasta);
  const today = new Date();

  const supabase = createServerClient();

  const allQuery = supabase.from("casos").select("*");

  let abiertosQuery = supabase.from("casos").select("*");
  if (desde) abiertosQuery = abiertosQuery.gte("fecha_apertura", desde);
  if (hasta) abiertosQuery = abiertosQuery.lte("fecha_apertura", hasta);

  let cerradosQuery = supabase.from("casos").select("*").not("fecha_cierre", "is", null);
  if (desde) cerradosQuery = cerradosQuery.gte("fecha_cierre", desde);
  if (hasta) cerradosQuery = cerradosQuery.lte("fecha_cierre", hasta);

  const [
    { data: all, error: errorAll },
    { data: abiertos, error: errorAbiertos },
    { data: cerrados, error: errorCerrados },
  ] = await Promise.all([allQuery, abiertosQuery, cerradosQuery]);

  const firstError = errorAll ?? errorAbiertos ?? errorCerrados;
  if (firstError) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        Error al cargar el dashboard: {firstError.message}
      </div>
    );
  }

  const allRows = all ?? [];
  const abiertosRows = abiertos ?? [];
  const cerradosRows = cerrados ?? [];

  // Sección "Estado actual": snapshot de todo el histórico, no depende del periodo.
  const estadoInternoCounts = countByEstadoInterno(allRows);
  const backlogAging = computeBacklogAging(allRows, today);
  const oldestOpen = topOldestOpen(allRows, today, 5);
  const volumeTrend = bucketVolumeTrend(allRows, TREND_WEEKS).map((d) => ({ x: d.semana, y: d.casos }));
  const resolutionTrend = bucketResolutionTrend(allRows, TREND_WEEKS).map((d) => ({
    x: d.semana,
    y: d.diasPromedio,
  }));

  // Tiempo de resolución / SLA: sí respeta el periodo seleccionado.
  const durationStats = computeDurationStats(cerradosRows, SLA_WINDOW_DAYS);

  // Distribución dentro del periodo seleccionado.
  const estadoProveedorCounts = ESTADOS_PROVEEDOR.map((estado) => ({
    estado,
    count: abiertosRows.filter((r) => (r.estado_proveedor ?? "N/A") === estado).length,
  }));
  const categoriaCounts = groupByCategoria(abiertosRows);
  const urgenciaCounts = groupByUrgencia(abiertosRows);
  const tecnicoCounts = groupByTecnico(abiertosRows);

  const solicitanteCounts = new Map<string, number>();
  for (const row of abiertosRows) {
    const nombre = row.solicitante?.trim() || "Sin especificar";
    solicitanteCounts.set(nombre, (solicitanteCounts.get(nombre) ?? 0) + 1);
  }
  const topSolicitantes = Array.from(solicitanteCounts.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const rangoLabel =
    desde && hasta ? `${desde} — ${hasta}` : desde ? `Desde ${desde}` : hasta ? `Hasta ${hasta}` : "Todo el histórico";

  const exportData = {
    rangoLabel,
    slaWindowDays: SLA_WINDOW_DAYS,
    slaTargetPct: SLA_TARGET_PCT,
    estadoInterno: estadoInternoCounts.map((e) => ({ label: e.estado, value: e.count })),
    duration: durationStats,
    backlog: backlogAging,
    categoria: categoriaCounts,
    urgencia: urgenciaCounts,
    tecnico: tecnicoCounts,
    estadoProveedor: estadoProveedorCounts.map((e) => ({ label: e.estado, value: e.count })),
    volumeTrend,
    resolutionTrend,
    oldestOpen,
    topSolicitantes,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">{rangoLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <RefreshButton />
          <ExportPptxButton data={exportData} />
        </div>
      </div>

      <DashboardFilters />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Estado actual</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <EstadoInternoChart data={estadoInternoCounts} />
          <ResolutionTimeCard
            mean={durationStats.mean}
            median={durationStats.median}
            p90={durationStats.p90}
            casosConsiderados={durationStats.n}
          />
          <SlaKpiCard
            windowDays={SLA_WINDOW_DAYS}
            withinWindow={durationStats.withinWindow}
            total={durationStats.n}
            pct={durationStats.withinWindowPct}
          />
          <BacklogAgingCard
            count={backlogAging.count}
            oldestDias={backlogAging.oldestDias}
            staleCount={backlogAging.staleCount}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Distribución</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <EstadoProveedorChart data={estadoProveedorCounts} />
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
          <RankedBarChart
            title="Carga de trabajo por técnico"
            description="Casos abiertos en el periodo, por técnico asignado"
            data={tecnicoCounts}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Tendencias</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <TrendLineChart
            title="Volumen de casos nuevos"
            description={`Casos abiertos por semana, últimas ${TREND_WEEKS} semanas`}
            data={volumeTrend}
            valueLabel="Casos"
          />
          <TrendLineChart
            title="Tendencia de tiempo de solución"
            description={`Promedio de días para cerrar un caso, últimas ${TREND_WEEKS} semanas`}
            data={resolutionTrend}
            valueLabel="Días promedio"
            emptyMessage={`Sin casos cerrados en las últimas ${TREND_WEEKS} semanas.`}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Detalle accionable</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <OldestOpenCasesList data={oldestOpen} />
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
