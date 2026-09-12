"use server";

import { redirect } from "next/navigation";
import { createSessionClient } from "@/lib/supabase/session-server";
import { createServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-current-profile";

export async function establecerPassword(password: string) {
  if (password.length < 8) {
    throw new Error("La contraseña debe tener al menos 8 caracteres.");
  }

  const user = await getCurrentUser();
  if (!user) {
    throw new Error("No autorizado.");
  }

  const session = createSessionClient();
  const { error } = await session.auth.updateUser({ password });
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

  redirect("/casos");
}
