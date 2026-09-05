import * as XLSX from "xlsx";
import { format, isValid, parse } from "date-fns";
import type { EstadoInterno } from "@/lib/supabase/types";

// Estructura del xlsx exportado por GLPI: siempre estas 13 columnas, en este orden.
// No hay mapeo configurable porque el formato de exportación es fijo.
const COLUMN_COUNT = 13;

const ESTADOS_INTERNOS_VALIDOS: EstadoInterno[] = [
  "En curso (asignada)",
  "Cerrado",
  "En espera",
];

const DATE_FORMATS = [
  "dd/MM/yyyy HH:mm",
  "dd/MM/yyyy",
  "dd-MM-yyyy HH:mm",
  "dd-MM-yyyy",
  "yyyy-MM-dd HH:mm:ss",
  "yyyy-MM-dd",
];

export type ParsedCasoRow = {
  id_glpi: number;
  titulo: string | null;
  estado_interno: EstadoInterno;
  tipo: string | null;
  ubicacion: string | null;
  solicitante: string | null;
  categoria: string | null;
  fecha_apertura: string | null;
  fecha_cierre: string | null;
  tecnico_asignado: string | null;
  urgencia: string | null;
  descripcion: string | null;
  solucion: string | null;
  semana_carga: string;
};

export type ParseError = { fila: number; motivo: string };

export type ParseResult = {
  valid: ParsedCasoRow[];
  errores: ParseError[];
};

function cellToText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  // GLPI a veces exporta "<br>" literal cuando una celda trae varios valores
  // (ej. varios técnicos asignados). Se normaliza a ", " en el origen.
  const text = String(value).replace(/\s*<br\s*\/?>\s*/gi, ", ").trim();
  return text.length > 0 ? text : null;
}

function parseFecha(value: unknown): string | null {
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

// El export de GLPI escribe el ID dividido entre 1000 (ej. la celda trae 93.826
// en vez de 93826), consistente en el 100% de las filas observadas. Se reconstruye
// y se valida contra el ID que GLPI también agrega entre paréntesis al final del
// título: si no coinciden, se descarta la fila en vez de guardar un ID incorrecto.
function parseIdGlpi(idRaw: unknown, tituloRaw: unknown): { id: number | null; motivo?: string } {
  if (typeof idRaw !== "number" || Number.isNaN(idRaw)) {
    const text = cellToText(idRaw);
    const parsed = text ? Number.parseInt(text, 10) : NaN;
    if (!text || !Number.isInteger(parsed) || parsed <= 0) {
      return { id: null, motivo: `ID inválido: "${text ?? ""}"` };
    }
    return { id: parsed };
  }

  const reconstructed = Math.round(idRaw * 1000);
  const titulo = cellToText(tituloRaw) ?? "";
  const suffixMatch = titulo.match(/\((\d+)\)\s*$/);
  if (suffixMatch) {
    const fromTitle = Number.parseInt(suffixMatch[1], 10);
    if (fromTitle !== reconstructed) {
      return {
        id: null,
        motivo: `ID no coincide con el título (columna: ${reconstructed}, título: ${fromTitle})`,
      };
    }
  }
  if (reconstructed <= 0) {
    return { id: null, motivo: `ID inválido: "${idRaw}"` };
  }
  return { id: reconstructed };
}

function normalizeEstadoInterno(value: unknown): EstadoInterno | null {
  const text = cellToText(value);
  if (!text) return null;
  const match = ESTADOS_INTERNOS_VALIDOS.find(
    (estado) => estado.localeCompare(text, undefined, { sensitivity: "base" }) === 0
  );
  return match ?? null;
}

export function parseCasosXlsx(buffer: ArrayBuffer): ParseResult {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: true,
    defval: null,
  });

  const dataRows = rows.slice(1); // la primera fila son encabezados
  const hoy = format(new Date(), "yyyy-MM-dd");

  const valid: ParsedCasoRow[] = [];
  const errores: ParseError[] = [];

  dataRows.forEach((row, index) => {
    const filaHumana = index + 2; // +1 por encabezado, +1 por índice base 1
    const isEmpty = row.every((cell) => cell === null || cell === undefined || cell === "");
    if (isEmpty) return;

    const cells = Array.from({ length: COLUMN_COUNT }, (_, i) => row[i]);
    const [
      idRaw,
      tituloRaw,
      estadoRaw,
      tipoRaw,
      ubicacionRaw,
      solicitanteRaw,
      categoriaRaw,
      fechaAperturaRaw,
      fechaCierreRaw,
      tecnicoRaw,
      urgenciaRaw,
      descripcionRaw,
      solucionRaw,
    ] = cells;

    const { id: id_glpi, motivo: idMotivo } = parseIdGlpi(idRaw, tituloRaw);
    if (id_glpi === null) {
      errores.push({ fila: filaHumana, motivo: idMotivo ?? "ID inválido" });
      return;
    }

    const estado_interno = normalizeEstadoInterno(estadoRaw);
    if (!estado_interno) {
      errores.push({
        fila: filaHumana,
        motivo: `Estado no reconocido: "${cellToText(estadoRaw) ?? ""}"`,
      });
      return;
    }

    valid.push({
      id_glpi,
      titulo: cellToText(tituloRaw),
      estado_interno,
      tipo: cellToText(tipoRaw),
      ubicacion: cellToText(ubicacionRaw),
      solicitante: cellToText(solicitanteRaw),
      categoria: cellToText(categoriaRaw),
      fecha_apertura: parseFecha(fechaAperturaRaw),
      fecha_cierre: parseFecha(fechaCierreRaw),
      tecnico_asignado: cellToText(tecnicoRaw),
      urgencia: cellToText(urgenciaRaw),
      descripcion: cellToText(descripcionRaw),
      solucion: cellToText(solucionRaw),
      semana_carga: hoy,
    });
  });

  return { valid, errores };
}
