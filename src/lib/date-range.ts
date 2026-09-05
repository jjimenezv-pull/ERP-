import { format, startOfMonth, startOfWeek } from "date-fns";

export type Vista = "semanal" | "mensual" | "historico";

const DATE_FMT = "yyyy-MM-dd";

export function defaultRangeForVista(vista: Vista): { desde: string | null; hasta: string | null } {
  const today = new Date();
  if (vista === "semanal") {
    return { desde: format(startOfWeek(today, { weekStartsOn: 1 }), DATE_FMT), hasta: format(today, DATE_FMT) };
  }
  if (vista === "mensual") {
    return { desde: format(startOfMonth(today), DATE_FMT), hasta: format(today, DATE_FMT) };
  }
  return { desde: null, hasta: null };
}

export function resolveDateRange(
  vista: string | undefined,
  desde: string | undefined,
  hasta: string | undefined
): { vista: Vista | "custom"; desde: string | null; hasta: string | null } {
  if (vista === "semanal" || vista === "mensual" || vista === "historico") {
    return { vista, ...defaultRangeForVista(vista) };
  }
  if (desde || hasta) {
    return { vista: "custom", desde: desde ?? null, hasta: hasta ?? null };
  }
  return { vista: "semanal", ...defaultRangeForVista("semanal") };
}
