"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/get-current-profile";
import type { UserRole } from "@/lib/supabase/types";

export async function invitarUsuario(email: string) {
  await requireAdmin();

  const origin = headers().get("origin");
  const supabase = createServerClient();
  const { error } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${origin}/auth/accept-invite`,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/usuarios");
}

export async function enviarRestablecerPassword(email: string) {
  await requireAdmin();

  const origin = headers().get("origin");
  const supabase = createServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/accept-invite`,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function cambiarRolUsuario(id: string, role: UserRole) {
  await requireAdmin();

  const supabase = createServerClient();
  // Atomic RPC: locks the admin rows, re-checks the last-admin invariant against
  // that locked state, and writes the new role in the same transaction — closes
  // the TOCTOU race a plain read-then-check-then-write has under concurrent calls.
  const { error } = await supabase.rpc("cambiar_rol_usuario_seguro", {
    target_id: id,
    nuevo_rol: role,
  });
  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/usuarios");
}

export async function bloquearUsuario(id: string, bloquear: boolean) {
  await requireAdmin();

  const supabase = createServerClient();
  // Same atomic invariant check as cambiarRolUsuario, locking the same rows so
  // the two serialize against each other. The actual ban lives in auth.users, so
  // it's applied via the Admin API right after this check succeeds.
  const { error: checkError } = await supabase.rpc("bloquear_usuario_seguro", {
    target_id: id,
    bloquear,
  });
  if (checkError) {
    throw new Error(checkError.message);
  }

  const { error } = await supabase.auth.admin.updateUserById(id, {
    ban_duration: bloquear ? "876000h" : "none",
  });
  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/usuarios");
}
