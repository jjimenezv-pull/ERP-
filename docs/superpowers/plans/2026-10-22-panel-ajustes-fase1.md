# Panel de ajustes fase 1 Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development to implement task-by-task. Steps use checkbox syntax.

**Goal:** Un admin gestiona tipos, módulos y colores de etiquetas desde `/ajustes`, sin tocar código.

**Architecture:** Tabla `tipos` + `tipo_id` FK en casos/tareas; `color` (clave de paleta) en tipos y módulos; paleta cerrada de 30 tokens CSS con mapa de clases literales; actions de servidor solo admin; catálogos cargados con `cache()` por solicitud.

**Tech Stack:** Next.js 14 App Router, Supabase (service_role en servidor), Tailwind, sonner, componentes `src/components/ui`.

**Spec:** `docs/superpowers/specs/2026-10-22-panel-ajustes-fase1-design.md`

## Global Constraints

- Regla de diseño de `CLAUDE.md`: `Badge variant="outline"` + `border-transparent bg-[var(--token)] text-[var(--token-fg)]`; tokens en `globals.css` en `:root` y `.dark`; sin pastel ni hex sueltos; contraste ≥ 4,5:1.
- Paleta: 30 colores `--etiqueta-1..30` (+ `-fg`). Claves de paleta: `"1"`..`"30"`.
- `etiqueta-1..10` = los 10 colores actuales de `--modulo-N` (mismo valor), `etiqueta-11..13` = Requerimiento `#1a3d96`, Incidencia `#ea580c`, Proyecto `#0f766e`; 14..30 nuevos, agrupables por tono.
- Nombres: trim, no vacío, máx 60, único sin distinguir mayúsculas.
- Acciones: `requireAdmin`, retorno `{error}` (nunca lanzar), revalidar `/casos`, `/proveedor`, `/ajustes`.
- Solo admin entra a `/ajustes`; el visualizador no ve el enlace ni la ruta.
- Importadores nunca envían `tipo`/`tipo_id`/`modulo_id`.
- Sin commit/push por subagentes; el commit local lo hace el orquestador tras QA. Push solo si el usuario lo pide. Migraciones: el subagente solo escribe el SQL; el usuario lo aplica en el SQL Editor de Supabase.
- No ejecutar `next build` con el dev server arriba.

## Review Focus

- Tipo desactivado con casos asignados: la etiqueta se sigue mostrando en tablas/detalle; no se ofrece en selectores.
- Módulo con `color` null (los existentes): usa el fallback por hash del id con las claves 1..10, mismo aspecto actual.
- Dos admins creando/renombrando al mismo nombre: gana el índice único, mensaje claro.
- Clave de color inválida enviada al servidor: rechazada.
- Filtro `?tipo=` con un id que ya no existe o con valores viejos ("Requerimiento"): no rompe la página (se ignora o muestra vacío).

---

### Task 1: Migración y tipos TS

**Files:**
- Create: `supabase/migrations/20261023_tipos_y_colores.sql`
- Modify: `src/lib/supabase/types.ts`

**Interfaces:**
- Produces: tabla `tipos(id uuid, nombre text, color text, orden int, activo bool, created_at)`; `modulos.color text null`; `casos.tipo_id`, `casos_proveedor.tipo_id uuid null`; tipo TS `Tipo`, y `tipo_id`/`color` en las filas.

- [ ] Escribir la migración idempotente: `CREATE TABLE IF NOT EXISTS tipos`, índice único `lower(btrim(nombre))`, RLS (select authenticated; ALL admin con subquery a `profiles`, igual que `modulos`), `ALTER TABLE modulos ADD COLUMN IF NOT EXISTS color text`, `tipo_id uuid REFERENCES tipos(id) ON DELETE RESTRICT` en `casos` y `casos_proveedor` + índices.
- [ ] Seed `INSERT ... ON CONFLICT DO NOTHING`: Requerimiento (color "11", orden 1), Incidencia ("12", 2), Proyecto ("13", 3).
- [ ] Backfill: `UPDATE casos SET tipo_id = t.id FROM tipos t WHERE casos.tipo = t.nombre AND casos.tipo_id IS NULL;` y lo mismo en `casos_proveedor`. No tocar la columna `tipo`.
- [ ] Añadir al final comentarios SQL con las consultas de verificación (conteos por tipo antes/después).
- [ ] Actualizar `types.ts` a mano (tabla `tipos`, columnas nuevas, tipo `Tipo`).
- [ ] `npx tsc --noEmit` (puede fallar por consumidores aún no migrados; si es solo por tipos nuevos requeridos, hacerlos opcionales).

### Task 2: Paleta y componentes de etiqueta

**Files:**
- Modify: `src/app/globals.css` (30 tokens en `:root` y `.dark`; reemplazar `--modulo-N`)
- Create: `src/lib/etiquetas.ts`, `src/components/etiquetas/etiqueta-badge.tsx`, `src/components/etiquetas/selector-color.tsx`
- Modify: `src/components/modulos/modulo-select.tsx`, `CLAUDE.md` (lista de tokens)

**Interfaces:**
- Produces: `CLAVES_COLOR: readonly string[]` ("1".."30"); `claseEtiqueta(clave: string | null, fallbackId?: string): string` (clave inválida/null → hash estable de `fallbackId` sobre claves 1..10, o neutro si no hay id); `esColorValido(clave: string): boolean`; `<EtiquetaBadge nombre clave fallbackId className />`; `<SelectorColor valor onChange />` (cuadrícula 30, agrupada por tono, con check en el seleccionado, accesible por teclado).

- [ ] Definir los 30 tokens (valor claro y oscuro, par `-fg`), verificando contraste; 1..13 con los valores actuales.
- [ ] `etiquetas.ts` con mapa de 30 clases literales completas (`border-transparent bg-[var(--etiqueta-N)] text-[var(--etiqueta-N-fg)]`).
- [ ] `ModuloBadge`/puntos del selector usan `claseEtiqueta(modulo.color, modulo.id)`; eliminar `PALETA_MODULO`.
- [ ] `tsc` + `lint`.

### Task 3: Catálogos y acciones de servidor

**Files:**
- Create: `src/lib/tipos.ts` (`cargarTipos()` con `cache`, devuelve todos ordenados por `orden`), `src/app/ajustes/actions.ts`
- Modify: `src/lib/modulos.ts` (incluir `color`), `src/app/modulos/actions.ts` (sin romper API existente)

**Interfaces:**
- Produces (todas `Promise<{error}|{error?:undefined,...}>`): `crearTipo(nombre, color)`, `renombrarTipo(id, nombre)`, `cambiarColorTipo(id, color)`, `moverTipo(id, "arriba"|"abajo")`, `activarTipo(id, activo)`, `eliminarTipo(id)` (error si tiene uso), `contarUsoTipo(id) -> {casos, tareas}`, `cambiarColorModulo(id, color)`; `type Tipo = {id,nombre,color,orden,activo}`.

- [ ] Validación compartida de nombre y color (`esColorValido`); índice único 23505 → mismo mensaje que duplicado.
- [ ] `moverTipo` intercambia `orden` con el vecino de forma segura.
- [ ] `tsc` + `lint`.

### Task 4: Página /ajustes

**Files:**
- Create: `src/app/ajustes/page.tsx`, `src/components/ajustes/tipos-panel.tsx`, `src/components/ajustes/modulos-panel.tsx`
- Modify: `src/components/main-nav.tsx` (enlace "Ajustes" solo admin, junto a "Usuarios")

**Interfaces:**
- Consumes: Task 2 y 3.

- [ ] Guard: `requireAdmin`-equivalente de `/usuarios` (copiar patrón; no admin → redirect `/casos`).
- [ ] Pestañas Tipos / Módulos (`@radix-ui/react-tabs` ya instalado). Cada fila: `EtiquetaBadge`, nombre editable en línea, `SelectorColor` en popover, contador de uso, y en tipos: subir/bajar, activar/desactivar, borrar solo con uso 0. Crear nuevo arriba. Edición optimista con toast.
- [ ] `loading.tsx` en `/ajustes` (patrón de las otras rutas).
- [ ] `tsc` + `lint`.

### Task 5: Migrar consumidores de `tipo` a `tipo_id`

**Files (43 usos):** `src/lib/proveedor/{cruce,tareas,parse-tareas}.ts`, `src/app/casos/{page,actions}.tsx|ts`, `src/app/proveedor/{page.tsx,import-actions.ts}`, `src/components/casos/{casos-table,casos-filters,caso-glpi-detalle}.tsx`, `src/components/proveedor/{tareas-proveedor-table,tarea-detalle,import-tareas-dialog}.tsx`, `src/lib/casos-orden.ts`, `src/lib/supabase/types.ts`
- Create: `src/components/etiquetas/tipo-select.tsx`

**Interfaces:**
- `updateCasosTipo(ids, tipoId | null)` y `updateTareasTipo(ids, tipoId | null)` escriben `tipo_id` (validan que exista y esté activo).

- [ ] Listas traen `tipo_id`; páginas cargan `cargarTipos()` en el `Promise.all` y pasan `tipos` a las tablas.
- [ ] Columna Tipo → `EtiquetaBadge` por catálogo (incluye desactivados); orden por nombre del tipo en memoria (vacíos al final).
- [ ] Selector de tipo en detalles y selector "Tipo…" en la barra en bloque (solo activos) reemplazan los botones fijos; eliminar `TIPO_CLASS`.
- [ ] Filtro de tipo del catálogo; `?tipo=<id>` + `sin_clasificar`; valores viejos o ids inexistentes no rompen.
- [ ] Verificar con grep que no queden `"Requerimiento"/"Incidencia"/"Proyecto"` literales en `src`.
- [ ] `tsc` + `lint`.

### Task 6: QA y cierre

- [ ] El usuario aplica la migración (SQL Editor); verificar conteos por tipo (casos 292/31; tareas 19/11/3 sin clasificar) y que `tipo_id` coincide.
- [ ] `next build` con dev server detenido; reiniciar dev server.
- [ ] Pruebas manuales admin y visualizador (spec, sección Pruebas); reimportar no altera tipos/módulos.
- [ ] Actualizar `resumen.md` y `CLAUDE.md`; commit local.
