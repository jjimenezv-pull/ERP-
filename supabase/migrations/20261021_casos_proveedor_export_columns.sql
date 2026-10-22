-- Nueva estructura del export de tareas del proveedor (Tareas_5.csv).
-- tipo_tarea: "Tipo de tarea" del export (ej. "02 HelpDesk"); NO confundir con `tipo`
--   (clasificación Requerimiento/Incidencia hecha a mano en el ERP, que el import nunca toca).
-- ultima_actualizacion: "Última tarea actualizada" (fecha y hora locales, sin zona horaria).
-- fecha_ultima_respuesta: se deriva al importar de "Last comments" (último comentario real,
--   ignorando las líneas automáticas del Help desk).
-- actualizado_por queda como columna heredada (el export nuevo ya no la trae).
ALTER TABLE public.casos_proveedor
  ADD COLUMN IF NOT EXISTS tipo_tarea text,
  ADD COLUMN IF NOT EXISTS ultima_actualizacion timestamp without time zone,
  ADD COLUMN IF NOT EXISTS fecha_ultima_respuesta date,
  ADD COLUMN IF NOT EXISTS descripcion text,
  ADD COLUMN IF NOT EXISTS last_comments text;
