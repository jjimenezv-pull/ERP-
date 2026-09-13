"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/get-current-profile";
import type { ParsedTareaProveedor } from "@/lib/proveedor/parse-tareas";

const CHUNK_SIZE = 500;

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
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    const { error } = await supabase.from("casos_proveedor").upsert(chunk, { onConflict: "id_tarea" });
    if (error) {
      throw new Error(error.message);
    }
  }

  revalidatePath("/proveedor");

  return { nuevos, actualizados };
}
