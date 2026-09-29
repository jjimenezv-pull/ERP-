"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSessionClient } from "@/lib/supabase/session-server";

function mapPasswordError(msg: string): string {
  if (msg.includes("Invalid login credentials") || msg.includes("invalid_credentials"))
    return "Usuario o contraseña incorrectos. Intente nuevamente.";
  if (msg.includes("Email not confirmed"))
    return "Este correo no ha sido verificado. Usa el enlace de acceso.";
  if (msg.includes("Too many requests"))
    return "Demasiados intentos fallidos. Espera unos minutos antes de volver a intentarlo.";
  if (msg.includes("User not found") || msg.includes("user_not_found"))
    return "Este correo no tiene acceso al sistema. Comuníquese con el administrador.";
  return "No se pudo iniciar sesión. Intente nuevamente.";
}

export async function sendMagicLink(email: string): Promise<{ error?: string }> {
  const supabase = createSessionClient();
  const origin = headers().get("origin");

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });

  if (error) {
    return { error: "Comuníquese con el administrador para solicitar acceso." };
  }
  return {};
}

export async function signInWithPassword(
  email: string,
  password: string
): Promise<{ error?: string }> {
  const supabase = createSessionClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: mapPasswordError(error.message) };
  }

  redirect("/casos");
}
