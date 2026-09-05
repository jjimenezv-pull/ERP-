import { createServerClient } from "@/lib/supabase/server";
import { CasosFilters } from "@/components/casos/casos-filters";
import { CasosTable } from "@/components/casos/casos-table";
import { ImportDialog } from "@/components/casos/import-dialog";
import type { EstadoInterno, EstadoProveedor } from "@/lib/supabase/types";

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

interface CasosPageProps {
  searchParams: {
    estado_interno?: string;
    estado_proveedor?: string;
    desde?: string;
    hasta?: string;
    columna?: string;
    q?: string;
    orderBy?: string;
    orderDir?: string;
  };
}

export default async function CasosPage({ searchParams }: CasosPageProps) {
  const supabase = createServerClient();

  const orderBy = (COLUMNAS_ORDENABLES as readonly string[]).includes(searchParams.orderBy ?? "")
    ? (searchParams.orderBy as (typeof COLUMNAS_ORDENABLES)[number])
    : "fecha_apertura";
  const orderDir = searchParams.orderDir === "asc" ? "asc" : "desc";

  let query = supabase
    .from("casos")
    .select("*")
    .order(orderBy, { ascending: orderDir === "asc", nullsFirst: false });

  if (searchParams.estado_interno) {
    query = query.eq("estado_interno", searchParams.estado_interno as EstadoInterno);
  }
  if (searchParams.estado_proveedor) {
    query = query.eq("estado_proveedor", searchParams.estado_proveedor as EstadoProveedor);
  }
  if (searchParams.desde) {
    query = query.gte("fecha_apertura", searchParams.desde);
  }
  if (searchParams.hasta) {
    query = query.lte("fecha_apertura", searchParams.hasta);
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

  const { data: casos, error } = await query;

  if (error) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        Error al cargar los casos: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Gestión de Casos</h1>
          <p className="text-sm text-muted-foreground">{casos.length} casos</p>
        </div>
        <ImportDialog />
      </div>

      <CasosFilters />

      <CasosTable casos={casos} />
    </div>
  );
}
