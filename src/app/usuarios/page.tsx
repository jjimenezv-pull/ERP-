import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { InviteUserDialog } from "@/components/usuarios/invite-user-dialog";
import { UsuariosTable, type Usuario } from "@/components/usuarios/usuarios-table";

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  const profile = await getCurrentProfile();
  if (profile?.role !== "admin") {
    redirect("/casos");
  }

  const supabase = createServerClient();

  const [{ data: perfiles, error }, { data: authData, error: authError }] = await Promise.all([
    supabase.from("profiles").select("id, email, role, created_at").order("created_at"),
    supabase.auth.admin.listUsers(),
  ]);

  if (error || authError) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        Error al cargar usuarios: {(error ?? authError)?.message}
      </div>
    );
  }

  const authById = new Map(authData.users.map((u) => [u.id, u]));

  const usuarios: Usuario[] = (perfiles ?? []).map((p) => {
    const authUser = authById.get(p.id);
    const bannedUntil = authUser?.banned_until ? new Date(authUser.banned_until) : null;
    return {
      id: p.id,
      email: p.email,
      role: p.role,
      confirmado: Boolean(authUser?.email_confirmed_at),
      bloqueado: bannedUntil !== null && bannedUntil.getTime() > Date.now(),
    };
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Usuarios</h1>
          <p className="text-sm text-muted-foreground">{usuarios.length} usuarios</p>
        </div>
        <InviteUserDialog />
      </div>

      <UsuariosTable usuarios={usuarios} currentUserId={profile.id} />
    </div>
  );
}
