# ERP- — notas para Claude

## Regla de diseño: badges y colores

Todo badge o etiqueta de color de la app debe verse igual que las columnas Estado, Urgencia y Tipo.

- **Componente:** `Badge` de `src/components/ui/badge.tsx` con `variant="outline"`.
- **Clases:** literales completas `border-transparent bg-[var(--token)] text-[var(--token-fg)]` (relleno sólido saturado, texto de contraste, sin borde de color). No concatenar nombres de token: Tailwind solo genera clases que aparecen completas en el código. `tailwind.config.ts` incluye `src/lib/**`, así que las clases literales también funcionan desde archivos de `src/lib` (p. ej. `claseDias` en `src/lib/dias.ts`).
- **Colores:** variables CSS en `src/app/globals.css`, definidas en `:root` (claro) **y** en `.dark` (oscuro), siempre en par `--token` / `--token-fg` (los de estado usan `-foreground`).
- **Prohibido:** tonos pastel (`bg-green-100 text-green-800`, `dark:bg-*-900/50`), bordes de color y hex sueltos en componentes. Único precedente de hex directo: `TIPO_CLASS` (`bg-[#1a3d96]`, etc.) en las tablas; no se amplía.
- **Contraste:** texto >= 4,5:1 sobre el fondo; fondo claro implica `-fg` oscuro.

### Tokens existentes
- Estado: `--status-espera`, `--status-curso`, `--status-cerrado`, `--status-revision` (+ `-foreground`).
- Urgencia: `--urgency-muy-alta`, `-alta`, `-media`, `-baja`, `-muy-baja` (+ `-fg`).
- Días: `--dias-1..5` (+ `-fg`); 1-4 apuntan por `var()` a curso, espera, urgencia alta y muy alta; 5 es rojo oscuro propio.
- Etiquetas (tipos y módulos): `--etiqueta-1..30` (+ `-fg`), paleta cerrada con claves `"1"`..`"30"`. Las clases literales viven en `src/lib/etiquetas.ts` (`claseEtiqueta(clave, fallbackId)`); se pintan con `EtiquetaBadge` y se eligen con `SelectorColor` (`src/components/etiquetas/`). 1..10 = antiguos colores de módulo (fallback por hash del id si el módulo no tiene color), 11..13 = Requerimiento, Incidencia, Proyecto. Ya no existe `--modulo-N`.

### Añadir un color nuevo
1. Define `--nombre` y `--nombre-fg` en `:root` y en `.dark` de `globals.css` (si reutiliza uno existente, usa `var()` para heredar el modo oscuro).
2. Elige un color que no se confunda con Estado/Urgencia/Tipo y verifica el contraste del `-fg`.
3. Usa la clase literal `border-transparent bg-[var(--nombre)] text-[var(--nombre-fg)]` sobre `<Badge variant="outline">`.
4. Anótalo en esta lista y en `resumen.md`.

### Añadir un color a la paleta de etiquetas
1. Define `--etiqueta-31` y `--etiqueta-31-fg` en `:root` y `.dark` de `globals.css` (fg con contraste >= 4,5:1).
2. En `src/lib/etiquetas.ts`: añade la clase literal completa al mapa `CLASES`, amplía `CLAVES_COLOR` (longitud) y mete la clave en un grupo de `GRUPOS_COLOR`.
3. No cambies el orden de las claves 1..10: el fallback por hash del id depende de él.
