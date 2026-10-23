// Color de los campos de días (antigüedad de un caso/tarea): verde 0-3,
// amarillo 4-7, naranja 8-15, rojo 16-30 y rojo oscuro 31+. Sin dato, sin color.
export function claseDias(dias: number | null): string {
  if (dias === null) return "";
  if (dias <= 3) return "border-transparent bg-[var(--dias-1)] text-[var(--dias-1-fg)]";
  if (dias <= 7) return "border-transparent bg-[var(--dias-2)] text-[var(--dias-2-fg)]";
  if (dias <= 15) return "border-transparent bg-[var(--dias-3)] text-[var(--dias-3-fg)]";
  if (dias <= 30) return "border-transparent bg-[var(--dias-4)] text-[var(--dias-4-fg)]";
  return "border-transparent bg-[var(--dias-5)] text-[var(--dias-5-fg)]";
}
