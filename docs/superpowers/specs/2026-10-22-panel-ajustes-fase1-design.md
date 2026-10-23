# Panel de ajustes — Fase 1: tipos, módulos y colores

Fecha: 2026-10-22 · Estado: borrador para revisión del usuario

## Objetivo

Que un admin gestione desde la app, sin tocar código, los catálogos que hoy están
fijos o dispersos: **tipos** de caso, **módulos** impactados y el **color** de sus
etiquetas. Es la fase 1 de un panel mayor (ver "Fases siguientes").

Éxito = un admin crea/renombra/reordena/desactiva tipos, cambia el color de cualquier
tipo o módulo, y todo se refleja en las dos tablas, filtros y detalles sin desplegar;
los datos existentes (323 casos GLPI, 33 tareas) conservan su clasificación.

## Lo que pidió el usuario / supuestos

Pedido: panel para controlar nuevos tipos, nuevos módulos y colores de etiquetas,
más otras opciones. Respuestas: arrancar por la fase 1; rangos de días editables
(fase 2). Supuestos míos, a corregir si no aplican:
- Solo admin entra al panel; el visualizador solo ve las etiquetas.
- Los colores se eligen de una **paleta cerrada**, no con selector libre (preserva la
  regla de diseño de `CLAUDE.md`: relleno sólido, contraste, claro/oscuro).
- Un tipo en uso no se borra: se **desactiva** (deja de ofrecerse, los casos
  conservan su etiqueta).

## Diseño

### Datos (una migración, reversible)
- Tabla `tipos`: `id uuid`, `nombre text`, `color text` (clave de paleta),
  `orden int`, `activo bool default true`, `created_at`. Índice único sobre
  `lower(btrim(nombre))`. RLS: lectura authenticated, escritura solo admin (misma
  política que `modulos`).
- `modulos.color text` (clave de paleta). Backfill con el color que hoy se deriva
  del hash del id, para que nada cambie de aspecto.
- `casos.tipo_id` y `casos_proveedor.tipo_id` → FK a `tipos(id)`, `ON DELETE
  RESTRICT` (un tipo con uso no se puede borrar a nivel de BD).
- Seed de `Requerimiento`, `Incidencia`, `Proyecto` con sus colores actuales y
  backfill de `tipo_id` por coincidencia de texto con la columna `tipo` existente.
- La columna de texto `tipo` **se conserva sin usar** durante esta fase como respaldo
  de reversa; se elimina en una migración posterior cuando se verifique en producción.
- Verificación de la migración: conteos por tipo antes/después deben coincidir
  (hoy: casos 292 Requerimiento / 31 Incidencia; tareas 19 / 11 / 3 sin clasificar).

### Paleta de etiquetas
- Paleta amplia de 30 colores (decisión del usuario: "una gran selección") como
  tokens `--etiqueta-1..30` (+ `-fg`) en `globals.css`, claro y oscuro, con contraste
  ≥ 4,5:1, todos en el estilo sólido saturado actual (sin pastel). Incluye los tres
  colores de tipo actuales y los 10 de módulo; sustituye a `--modulo-N` y a los hex de
  `TIPO_CLASS`. El selector los muestra en cuadrícula agrupada por tono.
- `src/lib/etiquetas.ts`: mapa clave → clase literal
  (`border-transparent bg-[var(--etiqueta-N)] text-[var(--etiqueta-N-fg)]`).
  Literales completos, así Tailwind los genera; **no hace falta inyectar CSS en
  tiempo de ejecución** (simplifica lo dicho en el plan previo).
- Componente único `EtiquetaBadge` (tipo y módulo) y selector de color reutilizable.

### Aplicación (admin)
- Ruta `/ajustes`, solo admin (mismo guard que `/usuarios`), enlace en el menú
  junto a "Usuarios". Pestañas **Tipos** y **Módulos**.
- Cada pestaña: lista con color, nombre editable en línea, selector de color,
  contador de uso, y para tipos: orden (subir/bajar) y activar/desactivar; borrar
  solo con uso 0. Crear nuevo desde la misma pantalla.
- Server actions con `requireAdmin` y retorno `{error}`: crear, renombrar, cambiar
  color, reordenar, activar/desactivar y eliminar (tipos); renombrar, color y
  eliminar (módulos, ya existen las dos últimas). Revalidan `/casos`, `/proveedor`,
  `/ajustes`.
- `cargarTipos()` con `cache()` de React, una lectura por solicitud, igual que
  `cargarModulos()`.

### Cambios en lo existente (43 usos en 11 archivos)
- Casos y tareas leen/escriben `tipo_id`; `COLUMNAS_LISTA` / `COLUMNAS_TAREAS_LISTA`
  traen `tipo_id`; el nombre y color se resuelven con el catálogo.
- Selectores de tipo en detalles y filtro de tipo usan el catálogo (solo activos;
  un caso con tipo desactivado sigue mostrando su etiqueta).
- Los botones de color por tipo de la barra en bloque pasan a un selector
  "Tipo…" dinámico (con N tipos los botones fijos no escalan).
- Filtro `?tipo=` pasa de nombre a id, conservando `sin_clasificar`.
- Importadores: siguen sin enviar `tipo`/`tipo_id` (no se pisa la clasificación).
- Orden por columna Tipo y Módulo: por nombre, vacíos al final (como hoy).

### Manejo de errores
- Nombre vacío, > 60 caracteres o duplicado (sin distinguir mayúsculas): mensaje
  claro, sin cambios. Carrera entre admins: el índice único gana y se informa.
- Eliminar con uso: bloqueado con mensaje (tipos) o confirmación con conteo (módulos,
  como hoy). Color fuera de paleta: rechazado en el servidor.

### Pruebas
- `tsc`, `lint`, `next build` (con el dev server detenido).
- Migración: conteos antes/después; reversa posible porque `tipo` texto se conserva.
- Manual en local como admin y visualizador: crear/renombrar/cambiar color/desactivar
  tipo; ver el cambio en ambas tablas, filtros, detalles y orden; confirmar que el
  visualizador no ve controles; reimportar GLPI y CSV no altera tipos ni módulos.

## Fuera de alcance (esta fase)
Colores libres (hex), rangos de días, autores del proveedor, usuarios como pestaña,
colores de urgencia/estado, borrar la columna `tipo` de texto.

## Fases siguientes
- **Fase 2:** rangos de días editables (umbrales + color de paleta), tabla propia.
- **Fase 3:** autores del proveedor editables (hoy `autores.ts`), usuarios como pestaña.
- **Fase 4:** estados del proveedor y opciones de importación.
- Migración final: eliminar `casos.tipo` / `casos_proveedor.tipo` (texto).

## Riesgos
- Migrar `tipo` toca datos reales: mitigado con backfill verificable y columna de respaldo.
- Rendimiento: una lectura más por solicitud, cacheada por request.
- Contraste en modo oscuro: cada color de la paleta se define y valida en ambos modos.
