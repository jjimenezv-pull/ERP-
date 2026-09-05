"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import type { ParsedCasoRow } from "@/lib/xlsx/parse-casos";

const CHUNK_SIZE = 500;

export async function importCasos(
  rows: ParsedCasoRow[]
): Promise<{ nuevos: number; actualizados: number }> {
  if (rows.length === 0) {
    return { nuevos: 0, actualizados: 0 };
  }

  const supabase = createServerClient();
  const ids = rows.map((r) => r.id_glpi);

  const { data: existing, error: fetchError } = await supabase
    .from("casos")
    .select("id_glpi")
    .in("id_glpi", ids);

  if (fetchError) {
    throw new Error(fetchError.message);
  }

  const existingIds = new Set((existing ?? []).map((r) => r.id_glpi));
  const nuevos = rows.filter((r) => !existingIds.has(r.id_glpi)).length;
  const actualizados = rows.length - nuevos;

  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    // No incluye caso_escalado_proveedor ni estado_proveedor: el upsert nunca toca esas columnas.
    const { error } = await supabase.from("casos").upsert(chunk, { onConflict: "id_glpi" });
    if (error) {
      throw new Error(error.message);
    }
  }

  revalidatePath("/casos");

  return { nuevos, actualizados };
}
