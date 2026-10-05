# Resumen de sesión — 2026-09-08

## Estado del repo ahora mismo

- **`main` ya tiene todo mergeado y desplegado a producción** (`https://esatellite.netlify.app`, deploy `6aa1440c...`, confirmado `Deploy is live!`). La rama `pruebas` se mergeó con `--no-ff` (commit `0a34fe6`) y se hizo push + `netlify deploy --prod`.
- Commits que quedaron en producción con esta sesión (además del fix de RLS y el primer overlap fix, que ya estaban):
  - fix gráfico de carga por técnico (splitTecnicos partía por `<br>`, los datos usan `", "`; ahora además filtra solo a los 2 técnicos reales del equipo).
  - números de SLA/backlog/resolución/escalados con tamaño fijo compartido (no responsivo por contenedor — ver nota de diseño abajo).
  - reestructura KPI row: chart de estado bajó a fila 2 (junto a casos abiertos más antiguos), KPI de "Escalados a proveedor" agregado, tarjeta de resolución más ancha con separadores entre Promedio/Mediana/P90.
  - "Top 5 solicitantes" quedó solo pero a ancho completo en "Detalle accionable".
- Working tree limpio, `.env.local` tiene `SUPABASE_SERVICE_ROLE_KEY` (local, gitignored — no está en git).
- La rama `pruebas` sigue existiendo en el remoto (ya mergeada) — se puede borrar cuando se confirme que ya no hace falta.
- El CLI de Netlify (`netlify-cli@17`, instalado vía `npx netlify-cli@17`) quedó autenticado en esta máquina — se puede seguir publicando previews o producción con:
  ```
  npx netlify-cli@17 deploy --site 9b82e847-0dc7-42a4-a2b1-473af5d58f05 --build --message "..."
  ```
  (sin `--prod` = draft, no toca producción; con `--prod` sí publica).

## Actualización 2026-09-09/10

- **Cargue de datos de prueba en producción: hecho y validado.** Casos nuevos y repetidos se subieron correctamente — la lógica de `importCasos` (nuevo → insertar, repetido por `id_glpi` → actualizar vía upsert) funcionó como se esperaba. Cierra el pendiente #2 original.
- Se intentó dar acceso al dashboard a una persona externa. Hallazgo: el control de acceso de Netlify (SSO/contraseña) es **por cuenta, no por sitio**, y el plan Free no soporta contraseña de sitio. Se decidió invitarla como miembro del equipo de Netlify (SSO) en vez de exponer nada públicamente — pero eso significa que puede editar/importar casos igual que un admin, no solo ver el dashboard, porque no existe un rol de solo-lectura dentro de la app. Este ítem subió de prioridad en la hoja de ruta.
- Netlify no tiene branch deploys habilitados (Site settings → Build & deploy → Deploy contexts) — por eso se usó `netlify deploy` draft manual para las vistas previas. Si se quiere automatizar previews por rama, hay que activarlo ahí (no hay tool de MCP para eso).

## Actualización 2026-09-11 a 2026-09-13 — reforma grande: login, roles, CSV de GLPI, gestor de proveedor

Sesión larga, varias fases, todo desplegado y verificado en producción (`esatellite.netlify.app`) contra datos reales en cada paso.

**Fase 1 — Login + roles.** Reemplaza el workaround de SSO de Netlify (item #1 de la sesión anterior) por auth real:
- Supabase Auth con dos vías: contraseña (pestaña por defecto en `/login`) y magic link (primera vez / "olvidé mi contraseña"). Middleware (`src/middleware.ts`) fuerza pasar por `/set-password` la primera vez que alguien entra sin tener contraseña definida.
- Tabla `profiles` (rol `admin`/`viewer`, `password_set`), trigger que la crea automáticamente al aparecer un `auth.users` nuevo, rol por defecto `viewer`.
- `requireAdmin()` protege las Server Actions de escritura (`updateCasoProveedor`, `importCasos`, etc.) — es la barrera real, ya que el cliente de datos sigue siendo `service_role` (sin RLS, igual que antes).
- Panel `/usuarios` (solo admin, colgado del menú de usuario, no como pestaña visible): invitar por correo, ver lista con estado (Activo/Pendiente/Bloqueado), cambiar rol, bloquear/desbloquear acceso, y **enviar un enlace de restablecer contraseña** a cualquier usuario activo (nadie, ni el admin, puede fijarle la contraseña a otro — solo puede forzar un enlace nuevo).
- SMTP: se intentó con el dominio de pruebas de Resend (solo entrega a la cuenta propia, no sirve para invitar a otros) → se cambió a **Gmail SMTP** con contraseña de aplicación, ya configurado y funcionando.
- Prerrequisitos hechos en el dashboard de Supabase: alta pública desactivada, Redirect URLs de `/auth/callback` y `/auth/accept-invite` agregadas (local + producción). "Leaked Password Protection" **no se pudo activar** — es de pago, sigue pendiente si algún día se sube de plan.

**Fase 2 — Reforma del import de GLPI.** GLPI ahora exporta CSV (antes era un XLSX de 13 columnas fijas sin encabezado). Nuevo parser (`src/lib/xlsx/parse-casos-csv.ts`) que resuelve columnas por nombre, soporta ambos formatos en el mismo diálogo de importar (detecta `.xlsx` vs `.csv` por extensión). **Bug encontrado y corregido:** la librería `xlsx` auto-detecta fechas tipo "02-07-2026" y las convierte a un serial numérico con una heurística en inglés (mes primero), invirtiendo día/mes en silencio cuando el día es ≤12 — se corrigió leyendo con `raw: true` a nivel de `XLSX.read()` (no solo en `sheet_to_json`) para que todo llegue como texto y se parsee con formato explícito. Este mismo patrón se reutilizó después para el CSV del proveedor.

**Fase 3 — Gestor de casos por proveedor.** Ruta `/proveedor`, reutiliza `CasosTable`/`CasosFilters` tal cual con un filtro fijo (`estado_proveedor != "N/A"`) no removible por UI. Visible para ambos roles.

**Fase 3b — Tabla `casos_proveedor`.** El usuario compartió los exports reales de la plataforma del proveedor (Freematica). Hallazgos: el `.xlsx` de esa plataforma le falta la columna de estado (usar siempre `.csv`), y el CSV viene en **Windows-1252, no UTF-8** (mismo patrón de bug de encoding que ya se había visto, pero al revés — aquí hay que decodificar explícito con `TextDecoder("windows-1252")`). Se creó la tabla (estado como texto libre, no enum — no se conoce el catálogo completo de estados del proveedor), su parser (`src/lib/proveedor/parse-tareas.ts`) y una sección de import/listado de solo lectura dentro de `/proveedor` (visible solo para admin). Validado con el archivo real: 10 tareas importadas sin errores, tildes correctas, reimport confirma el upsert (0 nuevas/10 actualizadas).
**Diseño acordado para el cruce** (ver memoria `proveedor_tabla_diseno.md`): cruce flexible por texto entre `casos.caso_escalado_proveedor` y `casos_proveedor.id_tarea` (sin llave foránea estricta, porque se escala primero a mano y el import del proveedor llega después). El enum manual `casos.estado_proveedor` se debe reemplazar por el estado real vía ese cruce — **deliberadamente no se hizo todavía** en esta sesión (queda como el siguiente paso, ver pendientes).

**Reinicio completo de datos de `casos`.** A petición del usuario, se vació la tabla y se recargó desde exports reales de GLPI (cerrados + abiertos), quedando en 188 casos. Esto borró el `estado_proveedor`/`caso_escalado_proveedor` manual que tenían 4 casos (92579, 92773, 93239, 93437) — se le mostraron al usuario antes de borrar para que los guardara aparte. Consecuencia directa: **hoy ningún caso tiene `caso_escalado_proveedor` con valor**, por lo que el cruce con `casos_proveedor` no tiene nada que emparejar todavía.

**Ajustes de UX/bugs encontrados y corregidos sobre la marcha:**
- Botón "Importar otro archivo" en los diálogos de import (antes solo se podía subir un archivo por apertura del diálogo).
- Gráfico "Estado actual" del dashboard: la barra de "Cerrado" ahora sí respeta el periodo filtrado (antes era snapshot fijo como las otras dos).
- Gráfico "Carga de trabajo por técnico": estaba comparando contra nombres con sufijo `" (id)"` que ya no existe en los datos (se quitó al importar) → siempre salía vacío. Corregido, y cambiado a contar casos **cerrados** (no abiertos) en el periodo.
- Filtro de fechas del calendario: clic en un día ya seleccionado no lo deseleccionaba. Causa raíz real (no el calendario): `new Date("2026-09-20")` se interpreta como medianoche UTC → en Colombia (UTC-5) cae un día antes en local. Se corrigió usando `parseISO`/`format` de date-fns en vez de `new Date()`/`toISOString()` en `casos-filters.tsx`.
- Barra de filtros de `/casos` y `/proveedor`: se rompía a pantallas más angostas (grupos de filtros con ancho fijo, envolvían en momentos distintos). Se unificó en un solo grupo flex-wrap con anchos fluidos — verificado a 1366px (resolución típica de oficina) sin quiebres.

**Proceso de deploy (para la próxima sesión):** Claude Code bloquea automáticamente los `netlify deploy --prod` y los `DELETE`/`TRUNCATE` masivos en la base — el usuario tiene que correr esos comandos él mismo (con el prefijo `!` en el chat). El flujo que funcionó toda la sesión: commit → dar el comando de deploy al usuario → esperar notificación → confirmar `currentDeploy` vía la herramienta de Netlify antes de dar por bueno el despliegue (una vez el deploy pareció exitoso pero no era el `currentDeploy` real — falsa alarma por caché del CLI, pero desde entonces siempre se verifica).

**`graphify-out/` quedó desactualizado** — se generó al principio de esta sesión, antes de todo este trabajo. Correr `/graphify` de nuevo (o `--update`) antes de confiar en él para navegar el código.

## Actualización 2026-09-18 a 2026-09-27 — seguridad, cruce proveedor y polish UI

**2026-09-18 — `7a5d383` Seguridad y limpieza de repo:**
- **TOCTOU cerrado:** `cambiarRolUsuario` y `bloquearUsuario` tenían un patrón leer → verificar → escribir susceptible a race condition. Reemplazado por RPCs de Postgres que hacen el lock y re-verifican el invariante del último admin dentro de la misma transacción (hallazgo F1 de Claude Security, no tenía parche aplicado).
- **`graphify-out/` desindexado de git** — era regenerable y añadía miles de líneas de diff en cada actualización. Se agregó al `.gitignore`.
- **`.gitignore` endurecido** — patrón ampliado para capturar variaciones de nombre como `credencials.env.local` (mismo error que filtró la anon key antes).

**2026-09-20 — `d1a9014` Cruce estado proveedor (pendiente #1 del resumen anterior):**
- `casos.estado_proveedor` (enum manual editable) reemplazado por estado derivado cruzando `casos.caso_escalado_proveedor` con `casos_proveedor.id_tarea` sin FK.
- Tres estados posibles: **No escalado** (campo vacío), **Sin match** (hay id pero no está en `casos_proveedor`), o el **estado real del proveedor** (texto del CSV de Freematica).
- Nueva lógica en `src/lib/proveedor/cruce.ts` y `src/lib/proveedor/cargar-estados.ts`. Tabla, filtros, `/proveedor`, dashboard y export PPTX usan el estado derivado. "Pendiente" = escalado cuyo estado no es `Cerrada` ni `Caducada`.
- La columna de estado en `CasosTable` es ahora solo lectura (antes era un Select editable manual).

**2026-09-26 — `2f786cb` Polish UI (ronda 3):**
- Badges de Urgencia y estado de tareas migrados a colores sólidos saturados (texto blanco) para igualar el peso visual de los badges de Estado interno.
- Toggle **"Ajustar columnas"** / **"Vista normal"** en tablas de casos y tareas: reduce padding/fuente para que las 13 columnas quepan sin scroll horizontal.
- Secciones de descripción y solución en el diálogo de caso: colapsan a 3 líneas por defecto con toggle "Ver más / Ver menos" (solo cuando >200 chars).
- Orden por defecto de la tabla: casos abiertos (En espera / En curso) primero, luego cerrados; ambos grupos por `fecha_apertura` desc.
- Fix de timezone en el selector de rango semanal (`parseISO` en vez de `new Date`).
- Diálogo reconstruido con 4 secciones etiquetadas y divisores horizontales.
- Columna Proyecto: limpia el prefijo `?? NNNNN Client - Provider` y muestra solo el tipo de servicio.
- `% Realizado` reemplazado por barra de progreso inline.
- Clave de urgencia `'Mediana'` añadida (el valor en BD difiere del esperado `'Media'`).

**2026-09-27 — `b991b0a` Polish UI ronda 4:**
- Header: logo.png reemplaza el ícono LifeBuoy; links de nav ocultos en la página de login; texto inactivo en blanco completo, activo en pill blanco sólido con texto azul.
- Login: errores ahora son mensajes inline centrados (no toasts); copy en español amigable para credenciales inválidas.
- Dashboard: botón "Actualizar" es solo ícono.
- Toggle de modo compacto de la tabla de casos movido al ribbon de filtros como ícono; persiste en URL param.
- Tabla de tareas del proveedor: barra de filtros nueva (búsqueda + estado), encabezados de columna ordenables, toggle compacto en la barra.

**Estado de `graphify-out`:** desindexado de git desde `7a5d383`. Para regenerar: `/graphify --update`. No es urgente.

## Reglas del proyecto (innegociables)

1. **Registro en `resumen.md`:** Cada cambio que se haga queda registrado aquí al ritmo en que ocurre.
2. **Deploy solo cuando se indique:** Nunca hacer deploy por iniciativa propia. Antes de cerrar un bloque de cambios, preguntar al usuario si quiere (a) captura de pantalla del estado actual, o (b) levantar un ambiente local para revisar. Deploy a producción solo cuando el usuario lo diga explícitamente.
3. **Subagentes para implementación:** Las tareas de código las ejecutan subagentes. El rol principal es coordinación y QA con ojo crítico sobre los resultados.

## Actualización 2026-09-28 — ajustes UI, login y seguimientos GLPI

**Reglas de flujo de trabajo establecidas (innegociables desde esta sesión):**
- Registrar cada cambio en `resumen.md` al momento de hacerse.
- Deploy solo cuando el usuario lo indique explícitamente.
- Implementación via subagentes; rol principal = coordinación + QA.

**Cambios aplicados:**

- **Header:** Link activo ahora translucido (`bg-white/20 border border-white/40`) en vez de pill blanco sólido. Texto siempre blanco.
- **Casos Proveedor:** Título de sección cambiado de "Tareas del proveedor (import)" → "Tareas del proveedor".
- **Login — errores de contraseña incorrecta:** La causa real era que Next.js no transmite mensajes de server actions que lanzan (`throw`) en producción. Se refactorizó para devolver `{error?: string}` en lugar de lanzar. Ahora el error llega correctamente: "Usuario o contraseña incorrectos. Intente nuevamente."
- **Login — magic link no autorizado:** Mismo patrón. Antes el error causaba un crash de Server Components. Ahora muestra: "Comuníquese con el administrador para solicitar acceso."
- **Bloqueo por intentos:** Supabase free no bloquea cuentas nativamente. Queda como ítem de hoja de ruta si se sube de plan.
- **Seguimientos GLPI ("Avance hasta la fecha"):**
  - Nueva columna `seguimientos text` en la tabla `casos` de Supabase (migración requerida: `ALTER TABLE casos ADD COLUMN IF NOT EXISTS seguimientos text;`).
  - Parser CSV (`parse-casos-csv.ts`): captura la columna `"Followups - Descripción"` (nombre real en el export de GLPI). Opcional: no falla si el archivo no la trae.
  - Parser XLSX legacy (`parse-casos.ts`): escribe `null` siempre (formato de 13 columnas fijas, sin seguimientos).
  - Diálogo de caso (`casos-table.tsx`): nueva sección "Avance hasta la fecha" con fondo ámbar, visible **solo** en casos no cerrados que tengan seguimientos. En casos cerrados o sin datos, no aparece.

**Migración Supabase aplicada (2026-09-28):**
```sql
ALTER TABLE casos ADD COLUMN IF NOT EXISTS seguimientos text;
```
Columna ya existe en producción. El próximo import de GLPI poblará los seguimientos para todos los casos existentes (el campo venía en todos los exports anteriores bajo `"Followups - Descripción"`).

## Actualización 2026-10-01 — Rate limiting de login

**Protección contra fuerza bruta sin costo adicional (Opción A: tabla Supabase).**

- Nueva tabla `login_attempts` (email, ip, attempted_at) con índices en email+tiempo e IP+tiempo.
- `src/lib/auth/rate-limit.ts`: tres funciones (`checkRateLimit`, `recordFailedAttempt`, `clearAttempts`). Umbral: 5 intentos fallidos por email en 15 min, o 20 por IP en 15 min. Fail-open: si la BD falla, el login sigue funcionando.
- `src/app/login/actions.ts` actualizado:
  - `signInWithPassword`: chequea rate limit antes de llamar a Supabase Auth, registra fallo si auth falla, limpia intentos en login exitoso.
  - `sendMagicLink`: chequea rate limit (pero no registra fallos — evita info-leak de si el email existe).
  - IP extraída de `x-nf-client-connection-ip` (Netlify) con fallback a `x-forwarded-for`.
- Migración: `supabase/migrations/20261001_login_attempts.sql` — **pendiente aplicar en Supabase dashboard**.

## Actualización 2026-10-01 (continuación) — UX de login

- **Ventana de bloqueo:** 5 minutos (antes 15).
- **Contador de intentos restantes:** aparece en ámbar a partir del 3er fallo. Cuando `remainingAttempts = 0` (último intento libre), muestra "Último intento. El siguiente bloquea el acceso por 5 minutos." Los bloqueos activos muestran solo el mensaje rojo, sin counter redundante.
- **"¿Olvidaste tu contraseña?":** texto bajo el campo contraseña con link que cambia al tab "Enlace de acceso" (estado local, sin servidor). El tab es controlado por `LoginForm` vía `value`/`onValueChange`.

## Actualización 2026-10-01 — 3 bugs UI

- **Técnico en tabla:** `filterBotTecnicos()` reemplaza `cleanText()` para `tecnico_asignado`. Filtra entradas con "chatbot" (case-insensitive) cuando hay técnicos reales en la celda; solo las muestra si no hay ningún otro valor.
- **Urgencia en "Casos abiertos más antiguos":** badges ahora usan `URGENCIA_CLASS` con las mismas CSS vars (`--urgency-*`) que el resto de la app.
- **Calendario — días externos:** `showOutsideDays` cambiado de `true` a `false` en `calendar.tsx`. Los días del mes anterior/siguiente ya no aparecen ni se resaltan con el rango seleccionado.

## Actualización 2026-10-01 — campo `tipo` (Requerimiento / Incidencia)

Implementado en ambas tablas (Gestión de Casos y Tareas de Proveedor).

**Base de datos:** migración `supabase/migrations/20261001_tipo_columns.sql` — añade `tipo text` a `casos` y `casos_proveedor` (valores `'Requerimiento'`, `'Incidencia'`, null). **Ya aplicada en Supabase.**

**Cambios de código:**
- `src/lib/supabase/types.ts`: `tipo: string | null` en `casos_proveedor.Row`; también añadido `login_attempts` (faltaba y causaba error de build).
- `src/app/casos/actions.ts`: `updateCasosTipo(ids, tipo)` — admin-only, `.in("id", ids)`.
- `src/app/proveedor/import-actions.ts`: `updateTareasTipo(ids, tipo)` — admin-only, `.in("id", ids)`.
- `src/components/casos/casos-table.tsx`: columna checkbox (solo admins), columna "Tipo" con badge, select de tipo en diálogo de detalle, barra flotante de acción masiva.
- `src/components/proveedor/tareas-proveedor-table.tsx`: mismo tratamiento (sin diálogo).
- `src/components/casos/casos-filters.tsx`: filtro "Tipo" con opciones Todos / Requerimiento / Incidencia / Sin clasificar.
- `src/app/casos/page.tsx`: `tipo?` en searchParams + filtro `.eq("tipo", v)` / `.is("tipo", null)` para "sin_clasificar".

**Colores:** Requerimiento = azul `#1a3d96` (mismo azul de la app), Incidencia = naranja `#ea580c`.

Comportamiento: sin clasificar se muestra como "—"; selección masiva con actualización optimista + toast.

## Deploy 2026-10-01

9 commits pusheados a `origin/main` y desplegados a producción (`esatellite.netlify.app`).

**Resumen de todos los cambios de esta sesión:**
- Rate limiting login (tabla `login_attempts`, 5 min, 5 intentos/email)
- Login UX: contador de intentos restantes, link "¿Olvidaste tu contraseña?" → tab magic link
- 3 bugs: técnico bots filtrados, urgencia coloreada en dashboard, calendario sin días externos
- Campo `tipo` (Requerimiento/Incidencia) con selección masiva y filtro en ambas tablas

## Actualización 2026-10-02 — Fix bug upsert sobreescribe `tipo`

**Problema detectado vía graphify:** el upsert de `importCasos` enviaba el campo `tipo` a Supabase en cada reimport, sobreescribiendo clasificaciones ERP asignadas manualmente. El campo `tipo` de la columna 4 del XLSX de GLPI es el tipo de ticket de GLPI (no el campo Requerimiento/Incidencia del ERP).

**Fix:** `src/app/casos/import-actions.ts` — strip de `tipo` en el chunk antes del upsert (`.map(({ tipo: _t, ...rest }) => rest)`). Para proveedor no era necesario: `ParsedTareaProveedor` no incluía `tipo` desde el origen.

**Archivos modificados:**
- `src/app/casos/import-actions.ts` (L36-38)
- `src/app/proveedor/import-actions.ts` (L36 — solo comentario aclaratorio, sin cambio lógico)

## Actualización 2026-10-03 — Limpieza de código obsoleto

Auditoría estática (grep + `tsc` + `next build`) y limpieza:
- **Eliminado:** carpetas `.agents/` y `.claude/` (skill `design-taste-frontend` duplicada; ya está en la cuenta), `skills-lock.json`, `.env.local.example`, `deno.lock` (artefacto del CLI de Netlify, ahora en `.gitignore`), `src/components/ui/skeleton.tsx` y `separator.tsx` (sin uso).
- **Dependencias quitadas:** `@radix-ui/react-separator` (solo la usaba `separator.tsx`) y `next-themes` (no había `ThemeProvider`; `sonner.tsx` ahora fija `theme="system"`).
- **Código:** eliminada `estaEscalado()` (`src/lib/proveedor/cruce.ts`, función muerta); se quitó `export` a símbolos que solo se usan en su propio archivo (`DATE_FORMATS`, `ESTADOS_INTERNOS_VALIDOS`, `MAX_IMPORT_FILE_SIZE_BYTES`, `defaultRangeForVista`, `estadoProveedorReal`, `EstadoProveedor`, `DashboardExportData`).
- **Docs:** `README.md` reemplazado (era la plantilla de create-next-app) e incluye las variables de entorno que antes documentaba `.env.local.example`; secciones duplicadas de `tipo` en este archivo consolidadas.
- **Lint:** corregidos 3 errores de ESLint que ya estaban en `main` (expresión ternaria como sentencia en los checkboxes de `casos-table.tsx` y `tareas-proveedor-table.tsx`, y variable sin usar en el strip de `tipo` de `casos/import-actions.ts`). Queda 1 aviso: `<img>` del logo en `main-nav.tsx` (no bloquea).
- **Se dejaron** los sub-componentes de shadcn sin usar (`DropdownMenuSub*`, `SelectScroll*Button`, `TableFooter`, etc.): es boilerplate estándar y no aporta quitarlos.

## Actualización 2026-10-03 — Rendimiento (app lenta al entrar, cambiar de pestaña y ejecutar acciones)

**Diagnóstico:** medido en producción, el documento `/casos` tardaba **4,22 s**. Los datos son pequeños (267 casos, 24 tareas), así que el costo era la cadena de viajes secuenciales Netlify → Supabase (`us-west-2`): middleware (`getUser` + `profiles`) → layout (`getUser` + perfil) → página (consultas). Eran ~5 viajes en serie por navegación, más payloads grandes y ningún `loading.tsx`.

**Cambios (sin desplegar todavía):**
- `get-current-profile.ts`: `getCurrentUser` usa `getClaims()` (verifica el JWT ES256 localmente con JWKS, sin red). El middleware **sigue** haciendo `getUser()` en cada request (incluidas las server actions), que es lo que aplica el ban de `auth.users`. El rol sigue leyéndose fresco de `profiles` en cada request. Nueva `getVerifiedUser()` (con `getUser()`) para `/login` y `set-password`: con `getClaims` habría bucle de redirecciones si el servidor invalida una sesión cuyo JWT sigue vigente.
- `casos/page.tsx` y `proveedor/page.tsx`: perfil + casos + mapa de estados (+ `casos_proveedor` en proveedor) en un solo `Promise.all`. Las tareas del proveedor solo se envían al cliente si es admin.
- Listas sin textos largos: `COLUMNAS_LISTA` (en `cruce.ts`) excluye `descripcion`, `solucion`, `seguimientos`. El diálogo de detalle los pide bajo demanda con la server action `getCasoDetalle(id)` (cualquier usuario autenticado), con placeholder de carga y caché por id (se conserva el del caso abierto cuando la lista se refresca).
- Dashboard: de 3 `select("*")` a **1 consulta de 10 columnas**; `abiertos` y `cerrados` se derivan en memoria (equivalencia verificada contra la base real en 7 rangos: mismos ids). Tipos de `dashboard-metrics.ts` pasan a `Pick<Caso, ...>`.
- `loading.tsx` con skeletons en `casos`, `dashboard`, `proveedor` y `usuarios` (+ `components/ui/skeleton.tsx`, que se había borrado por no usarse y ahora sí se usa).

**Pendiente de verificar / no hecho:**
- Medir de nuevo el TTFB de `/casos` en producción tras el deploy (antes: 4,22 s).
- Región de las funciones de Netlify (por defecto suele ser `us-east-2`; la base está en `us-west-2`): revisar en Site configuration → Functions. No se pudo cambiar desde código.
- Arranque en frío: mitigable con un ping externo periódico; no se implementó.
- El middleware conserva sus 2 viajes (`getUser` + `profiles.password_set`) a propósito: son la garantía de ban y del primer login.

### Causa raíz encontrada con las mediciones (2026-10-03)

Logs de producción (edge + funciones) mostraron un `POST /auth/v1/token` (refresco del token) en **cada** request, tanto en el middleware (~110-300 ms) como en el Server Component (`rsc.getClaims` ≈ 300-400 ms, así que `getClaims()` nunca era local). Causa: en `src/lib/supabase/middleware.ts`, `setAll` reasignaba la variable `response` al refrescar el token, pero el llamador había guardado la referencia inicial, así que las cookies nuevas **nunca llegaban al navegador ni a los Server Components** (cookie vencida para siempre -> refresco en cada request, dos veces por request). Además rotaba refresh tokens, con riesgo de cierres de sesión inesperados.

**Fix:** `createMiddlewareClient` ahora devuelve `getResponse()` (getter) y `withSessionCookies()` copia las cookies de sesión a las redirecciones; `middleware.ts` usa ambos. Es el patrón recomendado por Supabase. Se espera: tras el primer refresco, `getClaims()` verifica local (JWKS en memoria) y el middleware queda en `getUser` + `profiles`.

**Otros datos medidos:** cada llamada a Supabase desde la función cuesta ~100 ms con conexión reutilizada y ~260-330 ms con conexión nueva; desde el edge ~100 ms. Región de funciones Netlify: IAD (Virginia), no editable en el plan gratuito; Supabase en us-west-2.

**Resultado verificado en producción tras el fix:** el `POST /auth/v1/token` aparece solo en la primera petición post-deploy; `rsc.getClaims` bajó de 208-653 ms a 7-21 ms; middleware ~225-350 ms (antes ~320-530); `casos.page.total` ~395-510 ms (antes 560-900). Documento `/casos` en el navegador: **4,22 s (inicio) → 1,75 s (listas livianas + `loading.tsx`) → 1,22 s (fix de cookies)**; `DOMContentLoaded` 2,29 s → 1,30 s y `Finish` 2,90 s → 1,60 s. Las mediciones temporales (`src/lib/perf.ts` y sus usos) ya se eliminaron.

**`password_set` en `app_metadata` (2026-10-03, código listo, falta desplegar y probar el primer login):** el middleware ya no consulta `profiles` en cada request si el `getUser()` trae `app_metadata.password_set === true` (solo se escribe con service_role; `user_metadata` no se usa porque lo edita el usuario). `profiles.password_set` sigue siendo la fuente de verdad: sin la marca, el middleware cae a la consulta de siempre, así que nadie queda atrapado en un bucle. `establecerPassword` (`set-password/actions.ts`) escribe la marca tras actualizar `profiles`, conservando el `app_metadata` existente; si esa escritura falla solo se registra el error. Migración `supabase/migrations/20261003_password_set_app_metadata.sql` **aplicada en Supabase** (los 2 usuarios actuales quedaron con la marca y conservan `provider/providers`). Ahorro esperado: ~100-150 ms por request.

**Verificado en producción (2026-10-03):** `/casos` ≈ 1,18 s; el flujo de primer login con un usuario nuevo funcionó (fuerza `/set-password`, luego deja entrar como visualizador) y en la base quedó `password_set = true` en `profiles` y en `app_metadata` con `provider/providers` intactos. Detalle pendiente que se corrigió después: un usuario nuevo veía las pestañas del menú en `/set-password`; ahora `MainNav` solo muestra pestañas y "Usuarios" si `profile.passwordSet` es true, y `establecerPassword` hace `revalidatePath("/", "layout")` antes del redirect para que el menú aparezca sin recargar.

**Qué queda de latencia (no hecho):** (1) región: funciones en Virginia (no editable en el plan gratuito) vs. Supabase en Oregón, ~100 ms con conexión reutilizada y ~260-330 ms con conexión nueva por cada llamada; mover el proyecto de Supabase a `us-east-1` sería la mejora grande restante, pero implica crear proyecto nuevo y migrar datos/usuarios; (2) importante: el sitio Netlify **despliega desde GitHub**, así que un `git push` a `main` publica en producción.

## Actualización 2026-10-05 — Fix: no dejaba cambiar roles en /usuarios

`cambiar_rol_usuario_seguro` (función RPC en Supabase) fallaba con `42804: column "role" is of type user_role but expression is of type text`: `profiles.role` es el enum `user_role` y la función le asignaba el parámetro `text` sin cast. En producción la app solo mostraba el error genérico de Server Components. Fix: `nuevo_rol::public.user_role` en el `UPDATE`. Migración `supabase/migrations/20261005_fix_cambiar_rol_cast.sql` **ya aplicada en Supabase** (no requiere deploy de la app). Verificado con una llamada que no cambia ningún rol. `bloquear_usuario_seguro` no tiene el problema (solo compara, no asigna).

**Hallazgo de seguridad (revisión automática, resuelto el mismo día):** `cambiar_rol_usuario_seguro` y `bloquear_usuario_seguro` son `SECURITY DEFINER` y tenían `EXECUTE` para `PUBLIC`/`anon`/`authenticated`, o sea invocables vía RPC con la anon key (pública y en el historial de git): cualquiera podía volverse admin. El error del cast lo tapaba por accidente; el fix lo habría dejado explotable. Se hizo `REVOKE ... FROM PUBLIC, anon, authenticated` y `GRANT ... TO service_role` en ambas (la app las llama con service_role). Verificado con `has_function_privilege`. **Pendiente de revisar:** otras funciones/tablas expuestas a `anon` (correr los advisors de seguridad de Supabase).

## Pendiente para la próxima sesión

1. ~~**Reimportar GLPI** para poblar `seguimientos` en los casos existentes~~ — **COMPLETADO con éxito** (reimport ejecutado en producción, todo funcionó correctamente).
2. **KPIs de tipo** (Requerimiento/Incidencia) una vez haya datos clasificados.
3. **Rediseño PPTX** — diseño actual no convence; agregar distribución de tipo al reporte.
4. Activar "Leaked Password Protection" en Supabase si algún día se sube a un plan de pago.
5. Bloqueo de cuenta por intentos fallidos (Supabase free no lo soporta; requiere lógica custom o plan Pro).
6. Resto de la hoja de ruta original sin tocar: cabeceras de seguridad HTTP, paginación, tests/CI, upgrade de Next.js, reemplazar `xlsx`, auditoría de ediciones (editado_por/editado_en).

## Hallazgos de seguridad (ya resueltos)

- La tabla `casos` en Supabase tenía RLS abierto a `anon`/`authenticated` (CRUD completo) + la anon key filtrada en el historial de git (repo público) → cualquiera podía leer/escribir/borrar todo saltándose el SSO de Netlify. **Cerrado**: política eliminada, servidor usa `service_role key`, verificado con curl directo (lectura → `[]`, escritura → `401`).
- Reporte completo con hoja de ruta (CVEs de Next.js/xlsx, falta de auditoría de ediciones, paginación, tests/CI, purgar el historial de git, etc.): **https://claude.ai/code/artifact/0ba35da8-02a6-4d16-a8b0-c0f9c21cc976**

## Contexto de diseño del dashboard (para no repetir el mismo error)

- Los números "hero" de las 4 KPI cards (`resolution-time-card.tsx`, `sla-kpi-card.tsx`, `backlog-aging-card.tsx`, `provider-escalation-card.tsx`) usan **un tamaño fijo compartido** (`text-3xl sm:text-4xl`), no `clamp()`/container queries — un intento anterior con `cqw` escalado al ancho de cada tarjeta hizo que los números se vieran de tamaños distintos por construcción (la tarjeta de resolución reparte su ancho entre 3 números, las otras usan todo el ancho para 1). Si se toca el tamaño de estos números de nuevo, mantenerlo idéntico en las 4 tarjetas a propósito.
- Grid de "Estado actual" fila 1: `xl:grid-cols-5`, `ResolutionTimeCard` con `xl:col-span-2` (necesita más ancho por sus 3 sub-valores).
- El KPI "Escalados a proveedor" (`provider-escalation-card.tsx`) es nuevo: cuenta `estado_proveedor` en `Pendiente`/`En revisión`, todo el histórico (snapshot, no depende del periodo). Ya está conectado al export PPTX (`export-pptx-button.tsx`).
