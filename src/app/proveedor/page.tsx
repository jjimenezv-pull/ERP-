import { createServerClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { CasosFilters } from "@/components/casos/casos-filters";
import { CasosTable } from "@/components/casos/casos-table";
import { ImportTareasDialog } from "@/components/proveedor/import-tareas-dialog";
import { TareasProveedorTable } from "@/components/proveedor/tareas-proveedor-table";
import { ProveedorKpiCards } from "@/components/proveedor/proveedor-kpi-cards";
import { aplicarEstadoProveedor, COLUMNAS_LISTA } from "@/lib/proveedor/cruce";
import { construirParesGlpi } from "@/lib/proveedor/par";
import { cargarMapaEstados } from "@/lib/proveedor/cargar-estados";
import { COLUMNAS_TAREAS_LISTA, hoyEnBogota, type TareaLista } from "@/lib/proveedor/tareas";
import type { EstadoInterno } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const COLUMNAS_TEXTO_BUSCABLES = [
  "titulo",
  "solicitante",
  "tecnico_asignado",
  "categoria",
  "ubicacion",
] as const;

// Debe coincidir con SORTABLE_COLUMNS en src/components/casos/casos-table.tsx.
const COLUMNAS_ORDENABLES = [
  "id_glpi",
  "titulo",
  "estado_interno",
  "categoria",
  "solicitante",
  "tecnico_asignado",
  "fecha_apertura",
  "fecha_cierre",
  "urgencia",
  "estado_proveedor",
] as const;

interface ProveedorPageProps {
  searchParams: {
    estado_interno?: string;
    estado_proveedor?: string;
    desde?: string;
    hasta?: string;
    desde_cierre?: string;
    hasta_cierre?: string;
    columna?: string;
    q?: string;
    orderBy?: string;
    orderDir?: string;
    urgencia?: string;
  };
}

export default async function ProveedorPage({ searchParams }: ProveedorPageProps) {
  const supabase = createServerClient();

  const orderBy = (COLUMNAS_ORDENABLES as readonly string[]).includes(searchParams.orderBy ?? "")
    ? (searchParams.orderBy as (typeof COLUMNAS_ORDENABLES)[number])
    : "fecha_apertura";
  const orderDir = searchParams.orderDir === "asc" ? "asc" : "desc";

  const ordenPorEstadoProveedor = orderBy === "estado_proveedor";

  // A diferencia de /casos, esta vista siempre excluye los casos no
  // escalados a proveedor (sin referencia escrita) — no es un filtro que el
  // usuario pueda quitar desde la UI, se aplica en memoria más abajo.
  let query = supabase
    .from("casos")
    .select(COLUMNAS_LISTA)
    .not("caso_escalado_proveedor", "is", null)
    .neq("caso_escalado_proveedor", "")
    .order(ordenPorEstadoProveedor ? "fecha_apertura" : orderBy, {
      ascending: orderDir === "asc",
      nullsFirst: false,
    });

  if (searchParams.estado_interno) {
    query = query.eq("estado_interno", searchParams.estado_interno as EstadoInterno);
  }
  if (searchParams.desde) {
    query = query.gte("fecha_apertura", searchParams.desde);
  }
  if (searchParams.hasta) {
    query = query.lte("fecha_apertura", searchParams.hasta);
  }
  if (searchParams.desde_cierre) {
    query = query.gte("fecha_cierre", searchParams.desde_cierre);
  }
  if (searchParams.hasta_cierre) {
    query = query.lte("fecha_cierre", searchParams.hasta_cierre);
  }
  if (searchParams.urgencia) {
    query = query.eq("urgencia", searchParams.urgencia);
  }

  const q = searchParams.q?.trim();
  if (q) {
    const columna = searchParams.columna;
    // Sanea comas y paréntesis: rompen la sintaxis del filtro `.or()` de PostgREST.
    const term = q.replace(/[,()]/g, " ").trim();
    if (term) {
      if (columna === "id_glpi") {
        const idBuscado = Number.parseInt(term, 10);
        if (Number.isInteger(idBuscado)) {
          query = query.eq("id_glpi", idBuscado);
        }
      } else if (columna && (COLUMNAS_TEXTO_BUSCABLES as readonly string[]).includes(columna)) {
        query = query.ilike(columna, `%${term}%`);
      } else {
        query = query.or(
          COLUMNAS_TEXTO_BUSCABLES.map((col) => `${col}.ilike.%${term}%`).join(",")
        );
      }
    }
  }

  // Todo en paralelo para no encadenar round-trips. Las tareas del proveedor y los
  // pares caso<->tarea se piden siempre (son pocas filas) pero solo se usan y
  // envían al cliente si el usuario es admin.
  const [profile, { data, error }, { mapa, estados: estadosProveedor, error: errorMapa }, tareasRes, paresRes] =
    await Promise.all([
      getCurrentProfile(),
      query,
      cargarMapaEstados(),
      supabase
        .from("casos_proveedor")
        .select(COLUMNAS_TAREAS_LISTA)
        .order("fecha_inicio", { ascending: false }),
      // Sin los filtros de la página: la columna "Caso GLPI" y la pestaña del
      // detalle de cada tarea no deben depender de lo que se filtre arriba.
      supabase
        .from("casos")
        .select("id, id_glpi, titulo, caso_escalado_proveedor")
        .not("caso_escalado_proveedor", "is", null)
        .neq("caso_escalado_proveedor", "")
        .order("id_glpi", { ascending: true }),
    ]);
  const canEdit = profile?.role === "admin";

  if (error || errorMapa) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        Error al cargar los casos: {error?.message ?? errorMapa}
      </div>
    );
  }

  const casos = aplicarEstadoProveedor(data ?? [], mapa, {
    filtro: searchParams.estado_proveedor,
    soloEscalados: true,
    ordenarPorEstado: ordenPorEstadoProveedor ? orderDir : null,
  });

  // Solo admins reciben las tareas. Sin los textos largos (se piden al abrir el detalle).
  const tareasProveedor: TareaLista[] = canEdit ? (tareasRes.data ?? []) : [];
  const paresGlpi = canEdit ? construirParesGlpi(paresRes.data ?? []) : [];
  // Ids de tareas existentes (para la pestaña "Caso proveedor" de la tabla de casos).
  const idsTareas = canEdit ? Array.from(mapa.keys()) : undefined;
  // "Hoy" se calcula una sola vez aquí: ver hoyEnBogota.
  const hoy = hoyEnBogota();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Casos Escalados a Proveedor</h1>
          <p className="text-sm text-muted-foreground">{casos.length} casos</p>
        </div>
      </div>

      <CasosFilters estadosProveedor={estadosProveedor} />

      <CasosTable casos={casos} canEdit={canEdit} idsTareas={idsTareas} />

      <p className="text-sm text-muted-foreground">
        {casos.length} {casos.length === 1 ? "caso" : "casos"}
      </p>

      {canEdit && (
        <section className="space-y-4 border-t pt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold tracking-tight">Tareas del proveedor</h2>
            <ImportTareasDialog />
          </div>
          <ProveedorKpiCards tareas={tareasProveedor} />
          <TareasProveedorTable tareas={tareasProveedor} paresGlpi={paresGlpi} canEdit={canEdit} hoy={hoy} />
        </section>
      )}
    </div>
  );
}
