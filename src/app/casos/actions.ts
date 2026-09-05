"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import type { EstadoProveedor } from "@/lib/supabase/types";

export async function updateCasoProveedor(
  id: string,
  data: { caso_escalado_proveedor?: string | null; estado_proveedor?: EstadoProveedor }
) {
  const supabase = createServerClient();
  const { error } = await supabase.from("casos").update(data).eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/casos");
}
