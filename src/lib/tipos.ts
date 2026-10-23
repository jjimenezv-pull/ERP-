import "server-only";
import { cache } from "react";
import { createServerClient } from "@/lib/supabase/server";
import type { Tipo } from "@/lib/supabase/types";

export type { Tipo };

// Catálogo de tipos (activos e inactivos), una sola lectura por request.
// Si falla devuelve lista vacía: las etiquetas quedan en "—" pero la página carga.
export const cargarTipos = cache(async (): Promise<Tipo[]> => {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("tipos")
    .select("id, nombre, color, orden, activo, created_at")
    .order("orden", { ascending: true })
    .order("nombre", { ascending: true });
  return data ?? [];
});

// Para las acciones que asignan un tipo: lanza si el tipo no existe o está inactivo.
// `null` (quitar el tipo) siempre es válido.
export async function validarTipoActivo(tipoId: string | null): Promise<void> {
  if (tipoId === null) return;
  const mensaje = "El tipo no existe o está inactivo.";
  // Un valor que no es uuid rompería la consulta con un error de Postgres.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tipoId)) {
    throw new Error(mensaje);
  }
  const supabase = createServerClient();
  const { data } = await supabase.from("tipos").select("id").eq("id", tipoId).eq("activo", true).maybeSingle();
  if (!data) throw new Error(mensaje);
}
