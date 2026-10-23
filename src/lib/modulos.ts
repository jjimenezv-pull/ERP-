import "server-only";
import { cache } from "react";
import { createServerClient } from "@/lib/supabase/server";
import type { Modulo } from "@/lib/supabase/types";

// Catálogo de módulos, una sola lectura por request (lo usan /casos y /proveedor).
// Si falla devuelve lista vacía: la columna Módulo queda en "—" pero la página carga.
export const cargarModulos = cache(async (): Promise<Pick<Modulo, "id" | "nombre">[]> => {
  const supabase = createServerClient();
  const { data } = await supabase.from("modulos").select("id, nombre").order("nombre", { ascending: true });
  return data ?? [];
});
