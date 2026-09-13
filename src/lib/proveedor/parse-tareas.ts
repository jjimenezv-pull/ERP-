import * as XLSX from "xlsx";
import { cellToText, parseFechaTexto } from "@/lib/xlsx/shared";

export type ParsedTareaProveedor = {
  id_tarea: number;
  autor: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  asunto: string | null;
  asignatario: string | null;
  tipo_facturacion: string | null;
  prioridad: string | null;
  proyecto: string | null;
  porcentaje_realizado: number | null;
  actualizado_por: string | null;
  estado: string | null;
};

export type ParseError = { fila: number; motivo: string };

export type ParseResult = {
  valid: ParsedTareaProveedor[];
  errores: ParseError[];
};

// Nombres de columna del export "Tareas" de la plataforma del proveedor
// (Freematica). Se buscan por nombre, no por posición.
const REQUIRED_COLUMNS = [
  "ID de tarea",
  "Autor",
  "Fecha de inicio",
  "Fecha de fin",
  "Asunto",
  "Asignatario",
  "Tipo Facturacion",
  "Prioridad",
  "Proyecto",
  "% Realizado",
  "Actualizado última vez por",
  "Estatus",
] as const;

function parseIdTarea(value: unknown): number | null {
  const text = cellToText(value);
  if (!text) return null;
  const parsed = Number.parseInt(text, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parsePorcentaje(value: unknown): number | null {
  const text = cellToText(value);
  if (!text) return null;
  const parsed = Number.parseInt(text, 10);
  return Number.isInteger(parsed) ? parsed : null;
}

export function parseTareasProveedor(buffer: ArrayBuffer): ParseResult {
  // El export de esta plataforma viene en Windows-1252, no UTF-8 (confirmado
  // contra un archivo real: leerlo como UTF-8 corrompe las tildes, ej.
  // "última" -> "�ltima"). Se decodifica explícitamente antes de pasarlo a
  // XLSX.read.
  const text = new TextDecoder("windows-1252").decode(buffer);
  // `raw: true` en el READ (no solo en sheet_to_json) es igual de crítico
  // que en parse-casos-csv.ts: sin esto, SheetJS detecta las fechas
  // "dd/MM/yyyy" como fecha y las convierte a un serial con una heurística
  // en inglés (mes primero), invirtiendo día y mes en silencio.
  const workbook = XLSX.read(text, { type: "string", raw: true, FS: "," });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: true,
    defval: null,
  });

  const header = (rows[0] ?? []) as unknown[];
  const colIndex = (name: string) => header.indexOf(name);

  const faltantes = REQUIRED_COLUMNS.filter((name) => colIndex(name) === -1);
  if (faltantes.length > 0) {
    return {
      valid: [],
      errores: [
        {
          fila: 1,
          motivo: `El archivo no tiene las columnas esperadas del proveedor: ${faltantes.join(", ")}`,
        },
      ],
    };
  }

  const iId = colIndex("ID de tarea");
  const iAutor = colIndex("Autor");
  const iFechaInicio = colIndex("Fecha de inicio");
  const iFechaFin = colIndex("Fecha de fin");
  const iAsunto = colIndex("Asunto");
  const iAsignatario = colIndex("Asignatario");
  const iTipoFacturacion = colIndex("Tipo Facturacion");
  const iPrioridad = colIndex("Prioridad");
  const iProyecto = colIndex("Proyecto");
  const iPorcentaje = colIndex("% Realizado");
  const iActualizadoPor = colIndex("Actualizado última vez por");
  const iEstado = colIndex("Estatus");

  const dataRows = rows.slice(1);
  const valid: ParsedTareaProveedor[] = [];
  const errores: ParseError[] = [];

  dataRows.forEach((row, index) => {
    const filaHumana = index + 2;
    const isEmpty = row.every((cell) => cell === null || cell === undefined || cell === "");
    if (isEmpty) return;

    const id_tarea = parseIdTarea(row[iId]);
    if (id_tarea === null) {
      errores.push({ fila: filaHumana, motivo: `ID de tarea inválido: "${cellToText(row[iId]) ?? ""}"` });
      return;
    }

    valid.push({
      id_tarea,
      autor: cellToText(row[iAutor]),
      fecha_inicio: parseFechaTexto(row[iFechaInicio]),
      fecha_fin: parseFechaTexto(row[iFechaFin]),
      asunto: cellToText(row[iAsunto]),
      asignatario: cellToText(row[iAsignatario]),
      tipo_facturacion: cellToText(row[iTipoFacturacion]),
      prioridad: cellToText(row[iPrioridad]),
      proyecto: cellToText(row[iProyecto]),
      porcentaje_realizado: parsePorcentaje(row[iPorcentaje]),
      actualizado_por: cellToText(row[iActualizadoPor]),
      estado: cellToText(row[iEstado]),
    });
  });

  return { valid, errores };
}
