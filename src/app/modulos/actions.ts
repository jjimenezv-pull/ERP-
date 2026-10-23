"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/get-current-profile";
import { idTareaDeReferencia } from "@/lib/proveedor/par";
import { esColorValido } from "@/lib/etiquetas";

const NOMBRE_MAX = 60;
// Máximo de ids por .in(): evita URLs de PostgREST demasiado largas.
const CHUNK_IN = 100;

export type ResultadoModulo = { error: string } | { error?: undefined };

function mensajeAdmin(err: unknown): string {
  return err instanceof Error ? err.message : "Error inesperado";
}

function trozos<T>(items: T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += CHUNK_IN) out.push(items.slice(i, i + CHUNK_IN));
  return out;
}

// Crea un módulo (solo admin). Si ya existe uno con ese nombre (sin distinguir
// mayúsculas ni espacios en los bordes) devuelve el existente.
export async function crearModulo(
  nombre: string
): Promise<{ error: string } | { error?: undefined; modulo: { id: string; nombre: string } }> {
  try {
    await requireAdmin();
  } catch (err) {
    return { error: mensajeAdmin(err) };
  }

  const limpio = (nombre ?? "").trim();
  if (!limpio) return { error: "El nombre del módulo no puede estar vacío." };
  if (limpio.length > NOMBRE_MAX) {
    return { error: `El nombre del módulo no puede superar ${NOMBRE_MAX} caracteres.` };
  }

  const supabase = createServerClient();
  const buscar = async () => {
    // Lista corta: se compara en memoria con la misma normalización del índice único.
    const { data, error } = await supabase.from("modulos").select("id, nombre");
    if (error) return { error: error.message, modulo: null };
    const clave = limpio.toLowerCase();
    return { error: undefined, modulo: (data ?? []).find((m) => m.nombre.trim().toLowerCase() === clave) ?? null };
  };

  const previo = await buscar();
  if (previo.error !== undefined) return { error: previo.error };
  if (previo.modulo) return { modulo: previo.modulo };

  const { data, error } = await supabase
    .from("modulos")
    .insert({ nombre: limpio })
    .select("id, nombre")
    .single();
  if (error || !data) {
    // Carrera con otro admin: el índice único rechazó el duplicado, se devuelve el que ganó.
    const reintento = await buscar();
    if (reintento.modulo) return { modulo: reintento.modulo };
    return { error: error?.message ?? "No se pudo crear el módulo." };
  }

  revalidatePath("/casos");
  revalidatePath("/proveedor");
  return { modulo: data };
}

// Renombra un módulo (solo admin). Rechaza el nombre si otro módulo ya lo usa
// (misma normalización que crearModulo: sin mayúsculas ni espacios en los bordes).
export async function renombrarModulo(id: string, nombre: string): Promise<ResultadoModulo> {
  try {
    await requireAdmin();
  } catch (err) {
    return { error: mensajeAdmin(err) };
  }

  const limpio = (nombre ?? "").trim();
  if (!limpio) return { error: "El nombre del módulo no puede estar vacío." };
  if (limpio.length > NOMBRE_MAX) {
    return { error: `El nombre del módulo no puede superar ${NOMBRE_MAX} caracteres.` };
  }

  const supabase = createServerClient();
  const { data, error: errorLista } = await supabase.from("modulos").select("id, nombre");
  if (errorLista) return { error: errorLista.message };
  if (!(data ?? []).some((m) => m.id === id)) return { error: "El módulo ya no existe." };

  const clave = limpio.toLowerCase();
  if ((data ?? []).some((m) => m.id !== id && m.nombre.trim().toLowerCase() === clave)) {
    return { error: `Ya existe un módulo llamado «${limpio}».` };
  }

  const { error } = await supabase.from("modulos").update({ nombre: limpio }).eq("id", id);
  if (error) {
    // Carrera con otro admin: el índice único (23505) rechazó el duplicado.
    if (error.code === "23505") return { error: `Ya existe un módulo llamado «${limpio}».` };
    return { error: error.message };
  }

  revalidatePath("/casos");
  revalidatePath("/proveedor");
  return {};
}

// Cambia el color de etiqueta de un módulo (solo admin); la clave debe ser de la paleta.
export async function cambiarColorModulo(id: string, color: string): Promise<ResultadoModulo> {
  try {
    await requireAdmin();
  } catch (err) {
    return { error: mensajeAdmin(err) };
  }
  if (typeof color !== "string" || !esColorValido(color)) return { error: "Color inválido." };

  const supabase = createServerClient();
  const { data, error: errorBusca } = await supabase.from("modulos").select("id").eq("id", id).maybeSingle();
  if (errorBusca) return { error: errorBusca.message };
  if (!data) return { error: "El módulo ya no existe." };

  const { error } = await supabase.from("modulos").update({ color }).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/casos");
  revalidatePath("/proveedor");
  revalidatePath("/ajustes");
  return {};
}

// Cuántos casos GLPI y tareas del proveedor usan el módulo (para confirmar el borrado).
export async function contarUsoModulo(
  id: string
): Promise<{ error: string } | { error?: undefined; casos: number; tareas: number }> {
  try {
    await requireAdmin();
  } catch (err) {
    return { error: mensajeAdmin(err) };
  }

  const supabase = createServerClient();
  const [casos, tareas] = await Promise.all([
    supabase.from("casos").select("id", { count: "exact", head: true }).eq("modulo_id", id),
    supabase.from("casos_proveedor").select("id", { count: "exact", head: true }).eq("modulo_id", id),
  ]);
  if (casos.error) return { error: casos.error.message };
  if (tareas.error) return { error: tareas.error.message };
  return { casos: casos.count ?? 0, tareas: tareas.count ?? 0 };
}

// Elimina un módulo (solo admin). La FK es ON DELETE SET NULL: casos y tareas
// que lo usaban quedan sin módulo.
export async function eliminarModulo(id: string): Promise<ResultadoModulo> {
  try {
    await requireAdmin();
  } catch (err) {
    return { error: mensajeAdmin(err) };
  }

  const supabase = createServerClient();
  const { error } = await supabase.from("modulos").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/casos");
  revalidatePath("/proveedor");
  return {};
}

// Asigna (o limpia con null) el módulo de casos GLPI o tareas del proveedor y lo
// replica en las filas emparejadas de la otra tabla (casos.caso_escalado_proveedor
// == casos_proveedor.id_tarea; no hay FK, ver cruce.ts).
export async function asignarModulo(
  fuente: "casos" | "tareas",
  ids: string[],
  moduloId: string | null
): Promise<ResultadoModulo> {
  try {
    await requireAdmin();
  } catch (err) {
    return { error: mensajeAdmin(err) };
  }
  if (fuente !== "casos" && fuente !== "tareas") return { error: "Origen inválido." };
  if (!Array.isArray(ids) || ids.length === 0) return { error: "No hay filas seleccionadas." };

  const supabase = createServerClient();

  if (moduloId !== null) {
    const { data, error } = await supabase.from("modulos").select("id").eq("id", moduloId).maybeSingle();
    if (error) return { error: error.message };
    if (!data) return { error: "El módulo ya no existe." };
  }

  // Todas las referencias a tareas (son pocas filas): se resuelven en memoria
  // porque la referencia es texto libre ("0123 " == 123).
  const { data: refs, error: errorRefs } = await supabase
    .from("casos")
    .select("id, caso_escalado_proveedor")
    .not("caso_escalado_proveedor", "is", null)
    .neq("caso_escalado_proveedor", "");
  if (errorRefs) return { error: errorRefs.message };

  const cambio = { modulo_id: moduloId };

  if (fuente === "casos") {
    const seleccion = new Set(ids);
    const idsTarea = new Set<number>();
    for (const c of refs ?? []) {
      if (!seleccion.has(c.id)) continue;
      const idTarea = idTareaDeReferencia(c.caso_escalado_proveedor);
      if (idTarea !== null) idsTarea.add(idTarea);
    }

    for (const parte of trozos(ids)) {
      const { error } = await supabase.from("casos").update(cambio).in("id", parte);
      if (error) return { error: error.message };
    }
    for (const parte of trozos(Array.from(idsTarea))) {
      const { error } = await supabase.from("casos_proveedor").update(cambio).in("id_tarea", parte);
      if (error) return { error: error.message };
    }
  } else {
    const idsTarea: number[] = [];
    for (const parte of trozos(ids)) {
      const { data, error } = await supabase.from("casos_proveedor").select("id_tarea").in("id", parte);
      if (error) return { error: error.message };
      for (const t of data ?? []) idsTarea.push(t.id_tarea);
    }
    const tareas = new Set(idsTarea);
    const idsCaso = (refs ?? [])
      .filter((c) => {
        const idTarea = idTareaDeReferencia(c.caso_escalado_proveedor);
        return idTarea !== null && tareas.has(idTarea);
      })
      .map((c) => c.id);

    for (const parte of trozos(ids)) {
      const { error } = await supabase.from("casos_proveedor").update(cambio).in("id", parte);
      if (error) return { error: error.message };
    }
    for (const parte of trozos(idsCaso)) {
      const { error } = await supabase.from("casos").update(cambio).in("id", parte);
      if (error) return { error: error.message };
    }
  }

  revalidatePath("/casos");
  revalidatePath("/proveedor");
  return {};
}
