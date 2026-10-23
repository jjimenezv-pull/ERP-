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
- Módulo: `--modulo-1..10` (+ `-fg`), elegidos por hash estable del id en `modulo-select.tsx`.

### Añadir un color nuevo
1. Define `--nombre` y `--nombre-fg` en `:root` y en `.dark` de `globals.css` (si reutiliza uno existente, usa `var()` para heredar el modo oscuro).
2. Elige un color que no se confunda con Estado/Urgencia/Tipo y verifica el contraste del `-fg`.
3. Usa la clase literal `border-transparent bg-[var(--nombre)] text-[var(--nombre-fg)]` sobre `<Badge variant="outline">`.
4. Anótalo en esta lista y en `resumen.md`.
