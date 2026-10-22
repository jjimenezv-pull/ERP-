import { differenceInCalendarDays, format, isValid, parseISO } from "date-fns";

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

// Días calendario entre dos fechas yyyy-MM-dd; nunca negativo, null si falta alguna.
export function diasEntre(desde: string | null, hasta: string | null): number | null {
  if (!desde || !hasta) return null;
  const a = parseISO(desde);
  const b = parseISO(hasta);
  if (!isValid(a) || !isValid(b)) return null;
  return Math.max(0, differenceInCalendarDays(b, a));
}

// Días de un caso GLPI: abiertos -> desde la apertura hasta hoy (`hoy` viene del
// servidor en hora de Bogotá); cerrados -> de la apertura al cierre, para que no
// sigan creciendo. Un cerrado sin fecha de cierre no tiene cifra confiable.
export function diasCaso(
  hoy: string,
  caso: { estado_interno: string; fecha_apertura: string | null; fecha_cierre: string | null }
): { dias: number | null; cerrado: boolean } {
  const cerrado = caso.estado_interno === "Cerrado";
  if (cerrado) return { dias: diasEntre(caso.fecha_apertura, caso.fecha_cierre), cerrado };
  return { dias: diasEntre(caso.fecha_apertura, hoy), cerrado };
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
