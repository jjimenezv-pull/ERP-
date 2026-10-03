import "server-only";
import { cache } from "react";
import { createSessionClient } from "@/lib/supabase/session-server";
import { createServerClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/supabase/types";
import { timed } from "@/lib/perf";

export interface CurrentProfile {
  id: string;
  email: string;
  role: UserRole;
  passwordSet: boolean;
}

export interface SessionUser {
  id: string;
  email: string | null;
}

// cache() memoiza por request: layout.tsx y cada page.tsx llaman a estas
// funciones de forma independiente, y sin esto cada llamada repetía el
// trabajo (validar sesión + leer perfil) en la misma carga.
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = createSessionClient();
  // getClaims() verifica el JWT localmente (ES256 + JWKS en caché), sin red.
  // El middleware ya hizo el getUser() autoritativo en esta request (ahí se
  // aplica el ban de auth.users), así que aquí basta validar la firma.
  const { data } = await timed("rsc.getClaims", () => supabase.auth.getClaims());
  const claims = data?.claims;
  if (!claims?.sub) return null;
  return { id: claims.sub, email: typeof claims.email === "string" ? claims.email : null };
});

// Validación autoritativa contra el servidor de Auth. Para /login y set-password:
// si el servidor invalidó la sesión pero el JWT sigue vigente, getCurrentUser
// diría "hay sesión" mientras el middleware (getUser) dice que no -> bucle de redirecciones.
export const getVerifiedUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? { id: user.id, email: user.email ?? null } : null;
});

export const getCurrentProfile = cache(async (): Promise<CurrentProfile | null> => {
  const user = await getCurrentUser();
  if (!user) return null;

  // Lectura con el cliente service_role: ya validamos la sesión arriba, así que esto evita un
  // segundo round-trip de auth y es consistente con el patrón existente de "casos siempre vía service_role".
  const admin = createServerClient();
  const { data } = await timed("rsc.profile", () =>
    admin.from("profiles").select("id, email, role, password_set").eq("id", user.id).single()
  );

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
