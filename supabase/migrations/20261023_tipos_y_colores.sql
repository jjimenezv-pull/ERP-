-- Panel de ajustes fase 1: catálogo editable de tipos y color de etiquetas.
-- Idempotente. La columna legacy `tipo` (texto) NO se toca; `tipo_id` es la
-- referencia nueva. Aplicar en el SQL Editor de Supabase.

CREATE TABLE IF NOT EXISTS public.tipos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  color text NOT NULL,            -- clave de paleta "1".."30"
  orden int NOT NULL DEFAULT 0,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Nombres únicos sin distinguir mayúsculas ni espacios en los bordes.
CREATE UNIQUE INDEX IF NOT EXISTS tipos_nombre_unico
  ON public.tipos (lower(btrim(nombre)));

-- RLS: lectura para autenticados, escritura solo admin (igual que modulos).
ALTER TABLE public.tipos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tipos_select_authenticated ON public.tipos;
CREATE POLICY tipos_select_authenticated ON public.tipos
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS tipos_write_admin ON public.tipos;
CREATE POLICY tipos_write_admin ON public.tipos
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin')
  );

-- Color de módulo (null = fallback por hash del id en la app).
ALTER TABLE public.modulos ADD COLUMN IF NOT EXISTS color text;

-- Referencia al tipo en casos y tareas del proveedor.
ALTER TABLE public.casos
  ADD COLUMN IF NOT EXISTS tipo_id uuid REFERENCES public.tipos(id) ON DELETE RESTRICT;
ALTER TABLE public.casos_proveedor
  ADD COLUMN IF NOT EXISTS tipo_id uuid REFERENCES public.tipos(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS casos_tipo_id_idx ON public.casos (tipo_id);
CREATE INDEX IF NOT EXISTS casos_proveedor_tipo_id_idx ON public.casos_proveedor (tipo_id);

-- Seed (los colores 11..13 son Requerimiento, Incidencia y Proyecto).
INSERT INTO public.tipos (nombre, color, orden) VALUES
  ('Requerimiento', '11', 1),
  ('Incidencia', '12', 2),
  ('Proyecto', '13', 3)
ON CONFLICT DO NOTHING;

-- Backfill desde la columna de texto existente.
UPDATE public.casos c
   SET tipo_id = t.id
  FROM public.tipos t
 WHERE c.tipo = t.nombre AND c.tipo_id IS NULL;

UPDATE public.casos_proveedor c
   SET tipo_id = t.id
  FROM public.tipos t
 WHERE c.tipo = t.nombre AND c.tipo_id IS NULL;

-- Verificación (ejecutar a mano; los conteos deben coincidir por tipo):
-- SELECT tipo, count(*) FROM public.casos GROUP BY tipo ORDER BY 1;
-- SELECT t.nombre, count(*) FROM public.casos c JOIN public.tipos t ON t.id = c.tipo_id GROUP BY t.nombre ORDER BY 1;
-- SELECT tipo, count(*) FROM public.casos_proveedor GROUP BY tipo ORDER BY 1;
-- SELECT t.nombre, count(*) FROM public.casos_proveedor c JOIN public.tipos t ON t.id = c.tipo_id GROUP BY t.nombre ORDER BY 1;
-- Sin coincidencia (debe ser solo los sin clasificar):
-- SELECT count(*) FROM public.casos WHERE tipo IS NOT NULL AND tipo_id IS NULL;
-- SELECT count(*) FROM public.casos_proveedor WHERE tipo IS NOT NULL AND tipo_id IS NULL;
