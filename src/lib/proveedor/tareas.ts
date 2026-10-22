import { differenceInCalendarDays, isValid, parseISO } from "date-fns";
import type { CasoProveedor } from "@/lib/supabase/types";

// Fila de la lista de tareas: sin los textos largos (descripcion, last_comments),
// que se piden bajo demanda al abrir el detalle (getTareaDetalle).
export type TareaLista = Omit<CasoProveedor, "descripcion" | "last_comments">;

export interface TareaDetalle {
  descripcion: string | null;
  last_comments: string | null;
}

// Debe cubrir exactamente las columnas de TareaLista (todas menos los 2 textos largos).
export const COLUMNAS_TAREAS_LISTA =
  "id, id_tarea, autor, fecha_inicio, fecha_fin, asunto, asignatario, tipo_facturacion, prioridad, proyecto, porcentaje_realizado, actualizado_por, estado, tipo, tipo_tarea, ultima_actualizacion, fecha_ultima_respuesta, created_at, updated_at" as const;

// Días calendario entre `hoy` (yyyy-MM-dd, calculado en el servidor en zona
// Bogotá) y `fecha` (yyyy-MM-dd). Nunca negativo; null si no hay fecha válida.
export function diasDesde(hoy: string, fecha: string | null): number | null {
  if (!fecha) return null;
  const desde = parseISO(fecha);
  const hasta = parseISO(hoy);
  if (!isValid(desde) || !isValid(hasta)) return null;
  return Math.max(0, differenceInCalendarDays(hasta, desde));
}
