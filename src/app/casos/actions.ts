"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { getCurrentProfile, requireAdmin } from "@/lib/auth/get-current-profile";
import {
  COLUMNAS_CASO_DETALLE,
  conEstadoProveedor,
  construirMapaEstados,
} from "@/lib/proveedor/cruce";
import { idTareaDeReferencia, type CasoGlpiPar } from "@/lib/proveedor/par";

export async function updateCasoProveedor(
  id: string,
  data: { caso_escalado_proveedor?: string | null }
) {
  await requireAdmin();

  const supabase = createServerClient();
  const { error } = await supabase.from("casos").update(data).eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/casos");
  revalidatePath("/proveedor");
}

export async function updateCasosTipo(ids: string[], tipo: string | null) {
  await requireAdmin();

  const supabase = createServerClient();
  const { error } = await supabase.from("casos").update({ tipo }).in("id", ids);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/casos");
  // /proveedor también lista casos y edita su tipo desde el detalle de la tarea.
  revalidatePath("/proveedor");
}

export interface CasoDetalle {
  descripcion: string | null;
  solucion: string | null;
  seguimientos: string | null;
}

// Textos largos que la lista no envía; los ve cualquier usuario autenticado
// (viewers incluidos), por eso getCurrentProfile y no requireAdmin.
export async function getCasoDetalle(id: string): Promise<CasoDetalle> {
  const profile = await getCurrentProfile();
  if (!profile) {
    throw new Error("No autorizado.");
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("casos")
    .select("descripcion, solucion, seguimientos")
    .eq("id", id)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Caso no encontrado.");
  }
  return data;
}

// Caso GLPI emparejado con una tarea del proveedor (lista + textos largos), o
// null si ninguno la referencia. Solo admin: se pide desde el detalle de la tarea.
export async function getCasoGlpiPorTarea(idTarea: number): Promise<CasoGlpiPar | null> {
  await requireAdmin();
  if (!Number.isSafeInteger(idTarea) || idTarea < 0) {
    throw new Error("ID de tarea inválido.");
  }

  const supabase = createServerClient();
  // Paso 1 liviano: solo la referencia. El ilike acota (la referencia puede traer
  // espacios o ceros a la izquierda) y la comparación exacta se hace aquí.
  const { data: candidatos, error: errorCandidatos } = await supabase
    .from("casos")
    .select("id, caso_escalado_proveedor")
    .ilike("caso_escalado_proveedor", `%${idTarea}%`)
    .order("id_glpi", { ascending: true });
  if (errorCandidatos) {
    throw new Error(errorCandidatos.message);
  }
  const elegido = (candidatos ?? []).find(
    (c) => idTareaDeReferencia(c.caso_escalado_proveedor) === idTarea
  );
  if (!elegido) return null;

  const [casoRes, tareaRes] = await Promise.all([
    supabase.from("casos").select(COLUMNAS_CASO_DETALLE).eq("id", elegido.id).maybeSingle(),
    supabase.from("casos_proveedor").select("estado").eq("id_tarea", idTarea).maybeSingle(),
  ]);
  if (casoRes.error) throw new Error(casoRes.error.message);
  if (tareaRes.error) throw new Error(tareaRes.error.message);
  if (!casoRes.data) return null;

  const { descripcion, solucion, seguimientos, ...lista } = casoRes.data;
  // La referencia del caso es esta tarea, así que su estado derivado es el de la tarea.
  const mapa = construirMapaEstados(
    tareaRes.data ? [{ id_tarea: idTarea, estado: tareaRes.data.estado }] : []
  );
  const [caso] = conEstadoProveedor([lista], mapa);
  return { caso, detalle: { descripcion, solucion, seguimientos } };
}
