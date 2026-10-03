"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { getCurrentProfile, requireAdmin } from "@/lib/auth/get-current-profile";

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
