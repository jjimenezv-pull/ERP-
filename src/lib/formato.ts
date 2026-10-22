import { format, parseISO } from "date-fns";

export function formatFecha(value: string | null) {
  if (!value) return "—";
  try {
    // parseISO evita el corrimiento de un día que da `new Date("yyyy-MM-dd")`
    // (lo interpreta como UTC) al formatear en una zona horaria negativa.
    return format(parseISO(value), "dd/MM/yyyy");
  } catch {
    return value;
  }
}

export function formatFechaHora(value: string | null) {
  if (!value) return "—";
  try {
    // timestamp sin zona: parseISO lo toma como hora local, sin conversión.
    return format(parseISO(value), "dd/MM/yyyy HH:mm");
  } catch {
    return value;
  }
}

// El export de GLPI a veces trae "<br>" literal cuando hay varios técnicos en una
// celda; se normaliza a ", " y se oculta el chatbot si hay técnicos humanos.
export function filterBotTecnicos(raw: string | null): string {
  if (!raw) return "—";
  const parts = raw.replace(/\s*<br\s*\/?>\s*/gi, ", ")
    .split(",").map((t) => t.trim()).filter(Boolean);
  const humans = parts.filter((t) => !/chatbot/i.test(t));
  return (humans.length > 0 ? humans : parts).join(", ");
}
