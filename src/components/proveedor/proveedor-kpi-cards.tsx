import type { CasoProveedor } from "@/lib/supabase/types";

function KpiCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

export function ProveedorKpiCards({ tareas }: { tareas: CasoProveedor[] }) {
  if (tareas.length === 0) return null;

  const total = tareas.length;
  const cerradas = tareas.filter((t) => t.estado === "Cerrada" || t.estado === "Caducada").length;
  const enDesarrollo = tareas.filter((t) => t.estado === "En Desarrollo").length;
  const pendienteCliente = tareas.filter((t) => t.estado === "Pendiente Cliente").length;
  const pctCerradas = total > 0 ? Math.round((cerradas / total) * 100) : 0;

  const tareasConAvance = tareas.filter((t) => t.porcentaje_realizado !== null);
  const promedioAvance =
    tareasConAvance.length > 0
      ? Math.round(
          tareasConAvance.reduce((acc, t) => acc + (t.porcentaje_realizado ?? 0), 0) /
            tareasConAvance.length
        )
      : null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <KpiCard label="Total tareas" value={total} />
      <KpiCard label="Cerradas / Caducadas" value={cerradas} sub={`${pctCerradas}% del total`} />
      <KpiCard label="En desarrollo" value={enDesarrollo} />
      <KpiCard
        label="% avance promedio"
        value={promedioAvance !== null ? `${promedioAvance}%` : "—"}
        sub={`${pendienteCliente} pendiente cliente`}
      />
    </div>
  );
}
