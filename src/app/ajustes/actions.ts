"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/get-current-profile";
import { esColorValido } from "@/lib/etiquetas";

const NOMBRE_MAX = 60;

export type ResultadoTipo = { error: string } | { error?: undefined };

function mensajeAdmin(err: unknown): string {
  return err instanceof Error ? err.message : "Error inesperado";
}

async function comprobarAdmin(): Promise<string | null> {
  try {
    await requireAdmin();
    return null;
  } catch (err) {
    return mensajeAdmin(err);
  }
}

function revalidar() {
  revalidatePath("/casos");
  revalidatePath("/proveedor");
  revalidatePath("/ajustes");
}

function validarNombre(nombre: string): { error: string } | { nombre: string } {
  const limpio = (nombre ?? "").trim();
  if (!limpio) return { error: "El nombre del tipo no puede estar vacío." };
  if (limpio.length > NOMBRE_MAX) {
    return { error: `El nombre del tipo no puede superar ${NOMBRE_MAX} caracteres.` };
  }
  return { nombre: limpio };
}

function validarColor(color: string): string | null {
  return typeof color === "string" && esColorValido(color) ? null : "Color inválido.";
}

const duplicado = (nombre: string) => `Ya existe un tipo llamado «${nombre}».`;

// Crea un tipo al final del orden (solo admin).
export async function crearTipo(
  nombre: string,
  color: string
): Promise<{ error: string } | { error?: undefined; tipo: { id: string; nombre: string } }> {
  const errAdmin = await comprobarAdmin();
  if (errAdmin) return { error: errAdmin };

  const n = validarNombre(nombre);
  if ("error" in n) return { error: n.error };
  const errColor = validarColor(color);
  if (errColor) return { error: errColor };

  const supabase = createServerClient();
  const { data: lista, error: errorLista } = await supabase.from("tipos").select("nombre, orden");
  if (errorLista) return { error: errorLista.message };

  const clave = n.nombre.toLowerCase();
  if ((lista ?? []).some((t) => t.nombre.trim().toLowerCase() === clave)) {
    return { error: duplicado(n.nombre) };
  }
  const orden = (lista ?? []).reduce((max, t) => Math.max(max, t.orden), 0) + 1;

  const { data, error } = await supabase
    .from("tipos")
    .insert({ nombre: n.nombre, color, orden })
    .select("id, nombre")
    .single();
  if (error || !data) {
    if (error?.code === "23505") return { error: duplicado(n.nombre) };
    return { error: error?.message ?? "No se pudo crear el tipo." };
  }

  revalidar();
  return { tipo: data };
}

// Renombra un tipo (solo admin); rechaza nombres ya usados por otro tipo.
export async function renombrarTipo(id: string, nombre: string): Promise<ResultadoTipo> {
  const errAdmin = await comprobarAdmin();
  if (errAdmin) return { error: errAdmin };

  const n = validarNombre(nombre);
  if ("error" in n) return { error: n.error };

  const supabase = createServerClient();
  const { data, error: errorLista } = await supabase.from("tipos").select("id, nombre");
  if (errorLista) return { error: errorLista.message };
  if (!(data ?? []).some((t) => t.id === id)) return { error: "El tipo ya no existe." };

  const clave = n.nombre.toLowerCase();
  if ((data ?? []).some((t) => t.id !== id && t.nombre.trim().toLowerCase() === clave)) {
    return { error: duplicado(n.nombre) };
  }

  const { error } = await supabase.from("tipos").update({ nombre: n.nombre }).eq("id", id);
  if (error) {
    if (error.code === "23505") return { error: duplicado(n.nombre) };
    return { error: error.message };
  }

  revalidar();
  return {};
}

export async function cambiarColorTipo(id: string, color: string): Promise<ResultadoTipo> {
  const errAdmin = await comprobarAdmin();
  if (errAdmin) return { error: errAdmin };
  const errColor = validarColor(color);
  if (errColor) return { error: errColor };

  const supabase = createServerClient();
  const { data, error: errorBusca } = await supabase.from("tipos").select("id").eq("id", id).maybeSingle();
  if (errorBusca) return { error: errorBusca.message };
  if (!data) return { error: "El tipo ya no existe." };

  const { error } = await supabase.from("tipos").update({ color }).eq("id", id);
  if (error) return { error: error.message };

  revalidar();
  return {};
}

// Intercambia el orden con el tipo vecino. Si hay órdenes repetidos los normaliza
// antes a 1..N. No hace nada en los extremos.
export async function moverTipo(id: string, direccion: "arriba" | "abajo"): Promise<ResultadoTipo> {
  const errAdmin = await comprobarAdmin();
  if (errAdmin) return { error: errAdmin };
  if (direccion !== "arriba" && direccion !== "abajo") return { error: "Dirección inválida." };

  const supabase = createServerClient();
  const { data, error: errorLista } = await supabase
    .from("tipos")
    .select("id, orden")
    .order("orden", { ascending: true })
    .order("nombre", { ascending: true });
  if (errorLista) return { error: errorLista.message };

  const lista = (data ?? []).map((t) => ({ id: t.id, orden: t.orden }));
  const pos = lista.findIndex((t) => t.id === id);
  if (pos === -1) return { error: "El tipo ya no existe." };

  // Normaliza a 1..N solo las filas cuyo orden difiere.
  for (let i = 0; i < lista.length; i++) {
    if (lista[i].orden !== i + 1) {
      const { error } = await supabase.from("tipos").update({ orden: i + 1 }).eq("id", lista[i].id);
      if (error) return { error: error.message };
      lista[i].orden = i + 1;
    }
  }

  const vecino = direccion === "arriba" ? pos - 1 : pos + 1;
  if (vecino < 0 || vecino >= lista.length) {
    revalidar();
    return {};
  }

  const a = lista[pos];
  const b = lista[vecino];
  const [r1, r2] = await Promise.all([
    supabase.from("tipos").update({ orden: b.orden }).eq("id", a.id),
    supabase.from("tipos").update({ orden: a.orden }).eq("id", b.id),
  ]);
  if (r1.error) return { error: r1.error.message };
  if (r2.error) return { error: r2.error.message };

  revalidar();
  return {};
}

export async function activarTipo(id: string, activo: boolean): Promise<ResultadoTipo> {
  const errAdmin = await comprobarAdmin();
  if (errAdmin) return { error: errAdmin };

  const supabase = createServerClient();
  const { data, error: errorBusca } = await supabase.from("tipos").select("id").eq("id", id).maybeSingle();
  if (errorBusca) return { error: errorBusca.message };
  if (!data) return { error: "El tipo ya no existe." };

  const { error } = await supabase.from("tipos").update({ activo: !!activo }).eq("id", id);
  if (error) return { error: error.message };

  revalidar();
  return {};
}

async function contar(id: string): Promise<{ error: string } | { casos: number; tareas: number }> {
  const supabase = createServerClient();
  const [casos, tareas] = await Promise.all([
    supabase.from("casos").select("id", { count: "exact", head: true }).eq("tipo_id", id),
    supabase.from("casos_proveedor").select("id", { count: "exact", head: true }).eq("tipo_id", id),
  ]);
  if (casos.error) return { error: casos.error.message };
  if (tareas.error) return { error: tareas.error.message };
  return { casos: casos.count ?? 0, tareas: tareas.count ?? 0 };
}

// Cuántos casos GLPI y tareas del proveedor usan el tipo.
export async function contarUsoTipo(
  id: string
): Promise<{ error: string } | { error?: undefined; casos: number; tareas: number }> {
  const errAdmin = await comprobarAdmin();
  if (errAdmin) return { error: errAdmin };
  return contar(id);
}

// Elimina un tipo sin uso (solo admin). Con uso devuelve error: hay que desactivarlo.
export async function eliminarTipo(id: string): Promise<ResultadoTipo> {
  const errAdmin = await comprobarAdmin();
  if (errAdmin) return { error: errAdmin };

  const supabase = createServerClient();
  const { data, error: errorBusca } = await supabase.from("tipos").select("id").eq("id", id).maybeSingle();
  if (errorBusca) return { error: errorBusca.message };
  if (!data) return { error: "El tipo ya no existe." };

  const uso = await contar(id);
  if ("error" in uso) return { error: uso.error };
  if (uso.casos > 0 || uso.tareas > 0) {
    return {
      error: `Está asignado a ${uso.casos} casos y ${uso.tareas} tareas; desactívalo en vez de eliminarlo.`,
    };
  }

  const { error } = await supabase.from("tipos").delete().eq("id", id);
  if (error) {
    // La FK es ON DELETE RESTRICT: alguien lo asignó entre el conteo y el borrado.
    if (error.code === "23503") {
      return { error: "Está en uso; desactívalo en vez de eliminarlo." };
    }
    return { error: error.message };
  }

  revalidar();
  return {};
}
