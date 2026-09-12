import "server-only";
import { cache } from "react";
import { createSessionClient } from "@/lib/supabase/session-server";
import { createServerClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/supabase/types";

export interface CurrentProfile {
  id: string;
  email: string;
  role: UserRole;
  passwordSet: boolean;
}

// cache() memoiza por request: layout.tsx y cada page.tsx llaman a estas
// funciones de forma independiente, y sin esto cada llamada repetía el
// round-trip a Supabase (validar sesión + leer perfil) en la misma carga.
export const getCurrentUser = cache(async () => {
  const supabase = createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const getCurrentProfile = cache(async (): Promise<CurrentProfile | null> => {
  const user = await getCurrentUser();
  if (!user) return null;

  // Lectura con el cliente service_role: ya validamos al usuario vía getUser()
  // arriba, así que esto evita un segundo round-trip de auth y es consistente
  // con el patrón existente de "casos siempre vía service_role".
  const admin = createServerClient();
  const { data } = await admin
    .from("profiles")
    .select("id, email, role, password_set")
    .eq("id", user.id)
    .single();

  if (!data) return null;
  return { id: data.id, email: data.email, role: data.role, passwordSet: data.password_set };
});

export async function requireAdmin(): Promise<CurrentProfile> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") {
    throw new Error("No autorizado: se requiere rol de administrador.");
  }
  return profile;
}
