import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { cargarTipos } from "@/lib/tipos";
import { cargarModulos } from "@/lib/modulos";
import { AjustesTabs } from "@/components/ajustes/ajustes-tabs";
import type { Uso } from "@/components/ajustes/fila-etiqueta";

export const dynamic = "force-dynamic";

type Fila = { tipo_id?: string | null; modulo_id?: string | null };

// Agrupa en memoria: usos[id].casos / .tareas según la tabla de origen.
function acumular(
  usos: Record<string, Uso>,
  filas: Fila[] | null,
  campo: keyof Fila,
  clave: keyof Uso
) {
  for (const f of filas ?? []) {
    const id = f[campo];
    if (!id) continue;
    (usos[id] ??= { casos: 0, tareas: 0 })[clave]++;
  }
}

export default async function AjustesPage() {
  const profile = await getCurrentProfile();
  if (profile?.role !== "admin") {
    redirect("/casos");
  }

  const supabase = createServerClient();

  const [tipos, modulos, casos, tareas] = await Promise.all([
    cargarTipos(),
    cargarModulos(),
    supabase.from("casos").select("tipo_id, modulo_id").range(0, 49999),
    supabase.from("casos_proveedor").select("tipo_id, modulo_id").range(0, 49999),
  ]);

  const usoTipos: Record<string, Uso> = {};
  const usoModulos: Record<string, Uso> = {};
  acumular(usoTipos, casos.data, "tipo_id", "casos");
  acumular(usoTipos, tareas.data, "tipo_id", "tareas");
  acumular(usoModulos, casos.data, "modulo_id", "casos");
  acumular(usoModulos, tareas.data, "modulo_id", "tareas");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Ajustes</h1>
        <p className="text-sm text-muted-foreground">Tipos y módulos: nombre, color y orden.</p>
      </div>

      {(casos.error || tareas.error) && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          No se pudo calcular el uso: {(casos.error ?? tareas.error)?.message}
        </div>
      )}

      <AjustesTabs tipos={tipos} modulos={modulos.map((m) => ({ ...m, color: m.color ?? null }))} usoTipos={usoTipos} usoModulos={usoModulos} />
    </div>
  );
}
