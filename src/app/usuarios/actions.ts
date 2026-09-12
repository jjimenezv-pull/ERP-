"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/get-current-profile";
import type { UserRole } from "@/lib/supabase/types";

async function contarAdmins(): Promise<number> {
  const supabase = createServerClient();
  const { count } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin");
  return count ?? 0;
}

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

  if (role !== "admin") {
    const admins = await contarAdmins();
    const supabase = createServerClient();
    const { data: objetivo } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", id)
      .single();
    if (objetivo?.role === "admin" && admins <= 1) {
      throw new Error("No puedes quitarle el rol de admin al único administrador restante.");
    }
  }

  const supabase = createServerClient();
  const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/usuarios");
}

export async function bloquearUsuario(id: string, bloquear: boolean) {
  await requireAdmin();

  const supabase = createServerClient();

  if (bloquear) {
    const admins = await contarAdmins();
    const { data: objetivo } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", id)
      .single();
    if (objetivo?.role === "admin" && admins <= 1) {
      throw new Error("No puedes bloquear al único administrador restante.");
    }
  }

  const { error } = await supabase.auth.admin.updateUserById(id, {
    ban_duration: bloquear ? "876000h" : "none",
  });
  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/usuarios");
}
