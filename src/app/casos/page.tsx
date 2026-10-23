import { createServerClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { CasosFilters } from "@/components/casos/casos-filters";
import { CasosTable } from "@/components/casos/casos-table";
import { ImportDialog } from "@/components/casos/import-dialog";
import { aplicarEstadoProveedor, COLUMNAS_LISTA } from "@/lib/proveedor/cruce";
import { cargarMapaEstados } from "@/lib/proveedor/cargar-estados";
import { hoyEnBogota } from "@/lib/proveedor/tareas";
import { cargarModulos } from "@/lib/modulos";
import { cargarTipos } from "@/lib/tipos";
import { ordenaEnMemoria, ordenarEnMemoria, parseOrderBy } from "@/lib/casos-orden";
import type { EstadoInterno } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

// Filtro ?tipo=: id del tipo o "sin_clasificar". Un valor viejo (nombre de tipo)
// o un id inexistente se ignora: comparar un uuid con texto rompería la consulta.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const COLUMNAS_TEXTO_BUSCABLES = [
  "titulo",
  "solicitante",
  "tecnico_asignado",
  "categoria",
  "ubicacion",
] as const;

interface CasosPageProps {
  searchParams: {
    estado_interno?: string;
    estado_proveedor?: string;
    desde?: string;
    hasta?: string;
    desde_cierre?: string;
    hasta_cierre?: string;
    urgencia?: string;
    tipo?: string;
    columna?: string;
    q?: string;
    orderBy?: string;
    orderDir?: string;
  };
}

export default async function CasosPage({ searchParams }: CasosPageProps) {
  const supabase = createServerClient();

  const orderBy = parseOrderBy(searchParams.orderBy);
  const orderDir = searchParams.orderDir === "asc" ? "asc" : "desc";

  const ordenPorEstadoProveedor = orderBy === "estado_proveedor";
  const ordenDerivado = ordenaEnMemoria(orderBy);

  // "estado_proveedor", "dias", "modulo" y "caso_escalado_proveedor" son derivados
  // (o requieren orden numérico): se ordenan en memoria más abajo, la base ordena
  // por fecha mientras tanto.
  let query = supabase
    .from("casos")
    .select(COLUMNAS_LISTA)
    .order(ordenDerivado ? "fecha_apertura" : orderBy, {
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
  if (searchParams.tipo === "sin_clasificar") {
    query = query.is("tipo_id", null);
  } else if (searchParams.tipo && UUID_RE.test(searchParams.tipo)) {
    query = query.eq("tipo_id", searchParams.tipo);
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

  // Perfil, casos y mapa de estados son independientes: van en paralelo para
  // no encadenar round-trips a Supabase.
  const [profile, { data, error }, { mapa, estados: estadosProveedor, error: errorMapa }, modulos, tipos] =
    await Promise.all([getCurrentProfile(), query, cargarMapaEstados(), cargarModulos(), cargarTipos()]);
  const canEdit = profile?.role === "admin";
  // Solo admins reciben ids de tareas (habilitan la pestaña "Caso proveedor"). Se
  // reutiliza el mapa de estados, que ya trae todas las tareas: sin consulta extra.
  const idsTareas = canEdit ? Array.from(mapa.keys()) : undefined;
  // "Hoy" se calcula una sola vez: ver hoyEnBogota.
  const hoy = hoyEnBogota();

  if (error || errorMapa) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        Error al cargar los casos: {error?.message ?? errorMapa}
      </div>
    );
  }

  const casos = ordenarEnMemoria(
    aplicarEstadoProveedor(data ?? [], mapa, {
      filtro: searchParams.estado_proveedor,
      ordenarPorEstado: ordenPorEstadoProveedor ? orderDir : null,
    }),
    orderBy,
    orderDir,
    { hoy, nombreModulo: new Map(modulos.map((m) => [m.id, m.nombre])), nombreTipo: new Map(tipos.map((t) => [t.id, t.nombre])) }
  );

  // Sin orderBy explícito: abiertos primero (En espera / En curso), luego cerrados,
  // dentro de cada grupo por fecha_apertura desc.
  if (!searchParams.orderBy) {
    casos.sort((a, b) => {
      const prioA = a.estado_interno === "Cerrado" ? 1 : 0;
      const prioB = b.estado_interno === "Cerrado" ? 1 : 0;
      if (prioA !== prioB) return prioA - prioB;
      return (b.fecha_apertura ?? "").localeCompare(a.fecha_apertura ?? "");
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Gestión de Casos</h1>
          <p className="text-sm text-muted-foreground">{casos.length} casos</p>
        </div>
        {canEdit && <ImportDialog />}
      </div>

      <CasosFilters estadosProveedor={estadosProveedor} tipos={tipos} />

      <CasosTable casos={casos} canEdit={canEdit} idsTareas={idsTareas} hoy={hoy} modulos={modulos} tipos={tipos} />

      <p className="text-sm text-muted-foreground">
        {casos.length} {casos.length === 1 ? "caso" : "casos"}
      </p>
    </div>
  );
}
