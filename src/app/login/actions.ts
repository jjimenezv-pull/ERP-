"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSessionClient } from "@/lib/supabase/session-server";
import {
  checkRateLimit,
  recordFailedAttempt,
  clearAttempts,
} from "@/lib/auth/rate-limit";

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

function getClientIp(): string | null {
  const h = headers();
  return (
    h.get("x-nf-client-connection-ip") ??
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    null
  );
}

export async function sendMagicLink(email: string): Promise<{ error?: string }> {
  const supabase = createSessionClient();
  const ip = getClientIp();
  const origin = headers().get("origin");

  const { blocked } = await checkRateLimit(email, ip ?? "");
  if (blocked) {
    return { error: "Demasiados intentos fallidos. Espera 5 minutos antes de volver a intentar." };
  }

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
): Promise<{ error?: string; remainingAttempts?: number }> {
  const ip = getClientIp();

  const { blocked, remaining } = await checkRateLimit(email, ip ?? "");
  if (blocked) {
    return { error: "Demasiados intentos fallidos. Espera 5 minutos antes de volver a intentar." };
  }

  const supabase = createSessionClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    await recordFailedAttempt(email, ip);
    return { error: mapPasswordError(error.message), remainingAttempts: remaining - 1 };
  }

  await clearAttempts(email);
  redirect("/casos");
}
