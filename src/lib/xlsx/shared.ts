import { format, isValid, parse } from "date-fns";
import type { EstadoInterno } from "@/lib/supabase/types";

export const ESTADOS_INTERNOS_VALIDOS: EstadoInterno[] = [
  "En curso (asignada)",
  "Cerrado",
  "En espera",
];

export const DATE_FORMATS = [
  "dd/MM/yyyy HH:mm",
  "dd/MM/yyyy",
  "dd-MM-yyyy HH:mm",
  "dd-MM-yyyy",
  "yyyy-MM-dd HH:mm:ss",
  "yyyy-MM-dd",
];

// Tope defensivo para archivos importados por el usuario (xlsx/csv). El
// contenido de estos archivos es completamente controlado por quien los
// selecciona y se parsea en el navegador con SheetJS antes de cualquier
// validación propia de la app; sin un límite, un archivo desproporcionadamente
// grande puede colgar el hilo principal del navegador. 20 MB es muy superior
// a un export real de GLPI o del proveedor (que pesan unos pocos MB).
export const MAX_IMPORT_FILE_SIZE_BYTES = 20 * 1024 * 1024;

export function assertImportFileSize(byteLength: number): void {
  if (byteLength > MAX_IMPORT_FILE_SIZE_BYTES) {
    const maxMb = Math.floor(MAX_IMPORT_FILE_SIZE_BYTES / (1024 * 1024));
    throw new Error(`El archivo supera el tamaño máximo permitido (${maxMb} MB).`);
  }
}

export function cellToText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  // GLPI a veces exporta "<br>" literal cuando una celda trae varios valores
  // (ej. varios técnicos asignados). Se normaliza a ", " en el origen.
  const text = String(value).replace(/\s*<br\s*\/?>\s*/gi, ", ").trim();
  return text.length > 0 ? text : null;
}

export function parseFechaTexto(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) {
    return isValid(value) ? format(value, "yyyy-MM-dd") : null;
  }
  const text = String(value).trim();
  if (!text) return null;
  for (const fmt of DATE_FORMATS) {
    const parsed = parse(text, fmt, new Date());
    if (isValid(parsed)) return format(parsed, "yyyy-MM-dd");
  }
  return null;
}

export function normalizeEstadoInterno(value: unknown): EstadoInterno | null {
  const text = cellToText(value);
  if (!text) return null;
  const match = ESTADOS_INTERNOS_VALIDOS.find(
    (estado) => estado.localeCompare(text, undefined, { sensitivity: "base" }) === 0
  );
  return match ?? null;
}
