"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSessionClient } from "@/lib/supabase/session-server";
import { createServerClient } from "@/lib/supabase/server";
import { getVerifiedUser } from "@/lib/auth/get-current-profile";

export async function establecerPassword(password: string) {
  if (password.length < 8) {
    throw new Error("La contraseña debe tener al menos 8 caracteres.");
  }

  const user = await getVerifiedUser();
  if (!user) {
    throw new Error("No autorizado.");
  }

  const session = createSessionClient();
  const { data: updated, error } = await session.auth.updateUser({ password });
  if (error) {
    throw new Error(error.message);
  }

  const admin = createServerClient();
  const { error: profileError } = await admin
    .from("profiles")
    .update({ password_set: true })
    .eq("id", user.id);
  if (profileError) {
    throw new Error(profileError.message);
  }

  // Espejo en app_metadata para que el middleware no consulte `profiles` en cada request.
  // Se parte del app_metadata actual por si la API reemplaza en vez de fusionar. Si falla,
  // el middleware cae a `profiles` (ya en true), así que no se bloquea al usuario.
  const { error: metaError } = await admin.auth.admin.updateUserById(user.id, {
    app_metadata: { ...updated.user?.app_metadata, password_set: true },
  });
  if (metaError) {
    console.error("No se pudo marcar password_set en app_metadata:", metaError.message);
  }

  // El menú (layout raíz) se pinta según passwordSet: sin esto seguiría oculto tras el redirect.
  revalidatePath("/", "layout");
  redirect("/casos");
}
