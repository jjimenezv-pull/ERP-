"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/get-current-profile";
import { validarTipoActivo } from "@/lib/tipos";
import type { ParsedTareaProveedor } from "@/lib/proveedor/parse-tareas";
import { COLUMNAS_TAREA_DETALLE, hoyEnBogota, type TareaDetalle } from "@/lib/proveedor/tareas";
import type { TareaPar } from "@/lib/proveedor/par";

const CHUNK_SIZE = 500;

function soloCamposImportables(r: ParsedTareaProveedor): ParsedTareaProveedor {
  return {
    id_tarea: r.id_tarea,
    proyecto: r.proyecto,
    autor: r.autor,
    tipo_tarea: r.tipo_tarea,
    prioridad: r.prioridad,
    fecha_inicio: r.fecha_inicio,
    fecha_fin: r.fecha_fin,
    estado: r.estado,
    asunto: r.asunto,
    asignatario: r.asignatario,
    porcentaje_realizado: r.porcentaje_realizado,
    tipo_facturacion: r.tipo_facturacion,
    ultima_actualizacion: r.ultima_actualizacion,
    descripcion: r.descripcion,
    last_comments: r.last_comments,
    fecha_ultima_respuesta: r.fecha_ultima_respuesta,
  };
}

export async function importTareasProveedor(
  rows: ParsedTareaProveedor[]
): Promise<{ nuevos: number; actualizados: number }> {
  await requireAdmin();

  if (rows.length === 0) {
    return { nuevos: 0, actualizados: 0 };
  }

  const supabase = createServerClient();
  const ids = rows.map((r) => r.id_tarea);

  const { data: existing, error: fetchError } = await supabase
    .from("casos_proveedor")
    .select("id_tarea")
    .in("id_tarea", ids);

  if (fetchError) {
    throw new Error(fetchError.message);
  }

  const existingIds = new Set((existing ?? []).map((r) => r.id_tarea));
  const nuevos = rows.filter((r) => !existingIds.has(r.id_tarea)).length;
  const actualizados = rows.length - nuevos;

  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    // Se arma el payload campo por campo (nunca se esparce la fila): `tipo`/`tipo_id` son
    // la clasificación hecha en la app y el upsert jamás debe sobreescribirla.
    const chunk = rows.slice(i, i + CHUNK_SIZE).map(soloCamposImportables);
    const { error } = await supabase.from("casos_proveedor").upsert(chunk, { onConflict: "id_tarea" });
    if (error) {
      throw new Error(error.message);
    }
  }

  revalidatePath("/proveedor");

  return { nuevos, actualizados };
}

export async function updateTareasTipo(ids: string[], tipoId: string | null) {
  await requireAdmin();
  await validarTipoActivo(tipoId);

  const supabase = createServerClient();
  const { error } = await supabase.from("casos_proveedor").update({ tipo_id: tipoId }).in("id", ids);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/proveedor");
}

// Textos largos que la lista no envía. La sección de tareas es solo para
// administradores, por eso requireAdmin.
export async function getTareaDetalle(id: string): Promise<TareaDetalle> {
  await requireAdmin();

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("casos_proveedor")
    .select("descripcion, last_comments")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error("Tarea no encontrada.");
  }
  return data;
}

// Tarea emparejada con un caso GLPI (lista + textos largos), o null si no existe.
// Solo admin, como el resto de acciones de tareas.
export async function getTareaPorIdTarea(idTarea: number): Promise<TareaPar | null> {
  await requireAdmin();
  if (!Number.isSafeInteger(idTarea) || idTarea < 0) {
    throw new Error("ID de tarea inválido.");
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("casos_proveedor")
    .select(COLUMNAS_TAREA_DETALLE)
    .eq("id_tarea", idTarea)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) return null;

  const { descripcion, last_comments, ...tarea } = data;
  return { tarea, detalle: { descripcion, last_comments }, hoy: hoyEnBogota() };
}
