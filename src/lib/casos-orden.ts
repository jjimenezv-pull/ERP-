import { diasCaso } from "@/lib/formato";
import type { Caso } from "@/lib/supabase/types";

// Columnas por las que se puede ordenar la tabla de casos GLPI (param orderBy).
// Lo comparten las páginas (validación en servidor) y la tabla (encabezados).
export const COLUMNAS_ORDENABLES = [
  "id_glpi",
  "titulo",
  "estado_interno",
  "categoria",
  "solicitante",
  "tecnico_asignado",
  "ubicacion",
  "fecha_apertura",
  "fecha_cierre",
  "dias",
  "urgencia",
  "tipo",
  "modulo",
  "caso_escalado_proveedor",
  "estado_proveedor",
] as const;

export type ColumnaOrdenable = (typeof COLUMNAS_ORDENABLES)[number];

// Derivadas (no son columnas de `casos`): la base ordena por fecha de apertura
// mientras tanto y el orden real se aplica en memoria (ver ordenarEnMemoria).
// "estado_proveedor" se resuelve aparte, en aplicarEstadoProveedor.
const EN_MEMORIA = new Set<ColumnaOrdenable>(["dias", "modulo", "tipo", "caso_escalado_proveedor"]);

export function ordenaEnMemoria(col: ColumnaOrdenable): boolean {
  return col === "estado_proveedor" || EN_MEMORIA.has(col);
}

export function parseOrderBy(raw: string | undefined): ColumnaOrdenable {
  return (COLUMNAS_ORDENABLES as readonly string[]).includes(raw ?? "")
    ? (raw as ColumnaOrdenable)
    : "fecha_apertura";
}

// Ordena por una columna derivada. Los vacíos van siempre al final, sin importar
// la dirección. La referencia del proveedor se compara como número cuando se
// puede (numeric: true) y como texto si no.
export function ordenarEnMemoria<
  T extends Pick<Caso, "estado_interno" | "fecha_apertura" | "fecha_cierre" | "modulo_id" | "tipo_id" | "caso_escalado_proveedor">,
>(
  casos: T[],
  col: ColumnaOrdenable,
  dir: "asc" | "desc",
  ctx: { hoy: string; nombreModulo: Map<string, string>; nombreTipo: Map<string, string> }
): T[] {
  if (!EN_MEMORIA.has(col)) return casos;
  const signo = dir === "asc" ? 1 : -1;
  const valor = (c: T): number | string | null => {
    if (col === "dias") return diasCaso(ctx.hoy, c).dias;
    if (col === "modulo") return c.modulo_id ? (ctx.nombreModulo.get(c.modulo_id) ?? null) : null;
    if (col === "tipo") return c.tipo_id ? (ctx.nombreTipo.get(c.tipo_id) ?? null) : null;
    return c.caso_escalado_proveedor?.trim() || null;
  };
  return [...casos].sort((a, b) => {
    const va = valor(a);
    const vb = valor(b);
    if (va === null) return vb === null ? 0 : 1;
    if (vb === null) return -1;
    const cmp =
      typeof va === "number" && typeof vb === "number"
        ? va - vb
        : String(va).localeCompare(String(vb), "es", { numeric: true });
    return signo * cmp;
  });
}
