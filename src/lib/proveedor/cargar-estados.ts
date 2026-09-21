import { createServerClient } from "@/lib/supabase/server";
import { construirMapaEstados, type MapaEstadosProveedor } from "./cruce";

export async function cargarMapaEstados(): Promise<{
  mapa: MapaEstadosProveedor;
  estados: string[];
  error: string | null;
}> {
  const supabase = createServerClient();
  const { data, error } = await supabase.from("casos_proveedor").select("id_tarea, estado");
  if (error) return { mapa: new Map(), estados: [], error: error.message };

  const mapa = construirMapaEstados(data ?? []);
  const estados = Array.from(new Set(mapa.values())).sort((a, b) => a.localeCompare(b, "es"));
  return { mapa, estados, error: null };
}
