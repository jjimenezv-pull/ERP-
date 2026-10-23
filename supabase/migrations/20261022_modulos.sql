-- Módulo impactado de un caso. Catálogo editable por admin; casos y tareas del
-- proveedor emparejados (casos.caso_escalado_proveedor = casos_proveedor.id_tarea)
-- comparten módulo: la app escribe en ambas tablas (no hay FK entre ellas).
CREATE TABLE IF NOT EXISTS public.modulos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Nombres únicos sin distinguir mayúsculas ni espacios en los bordes.
CREATE UNIQUE INDEX IF NOT EXISTS modulos_nombre_unico
  ON public.modulos (lower(btrim(nombre)));

ALTER TABLE public.casos
  ADD COLUMN IF NOT EXISTS modulo_id uuid REFERENCES public.modulos(id) ON DELETE SET NULL;
ALTER TABLE public.casos_proveedor
  ADD COLUMN IF NOT EXISTS modulo_id uuid REFERENCES public.modulos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS casos_modulo_id_idx ON public.casos (modulo_id);
CREATE INDEX IF NOT EXISTS casos_proveedor_modulo_id_idx ON public.casos_proveedor (modulo_id);

-- RLS: lectura para cualquier usuario autenticado, escritura solo admin
-- (profiles.role). La app escribe con service_role, que ignora RLS; esto cubre
-- el acceso directo con la anon key / sesión de usuario.
ALTER TABLE public.modulos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS modulos_select_authenticated ON public.modulos;
CREATE POLICY modulos_select_authenticated ON public.modulos
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS modulos_write_admin ON public.modulos;
CREATE POLICY modulos_write_admin ON public.modulos
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin')
  );
