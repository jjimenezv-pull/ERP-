import { assertImportFileSize, cellToText, parseFechaTexto } from "@/lib/xlsx/shared";
import { parseCsv } from "@/lib/proveedor/csv";
import {
  fechaDMYaISO,
  fechaUltimaRespuesta,
  parseComentarios,
} from "@/lib/proveedor/comentarios";

// Sin `tipo`/`tipo_id` ni `actualizado_por` a propósito: el upsert nunca debe pisar la
// clasificación hecha en la app (tipo_id) ni el dato legado (actualizado_por).
export type ParsedTareaProveedor = {
  id_tarea: number;
  proyecto: string | null;
  autor: string | null;
  tipo_tarea: string | null;
  prioridad: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  estado: string | null;
  asunto: string | null;
  asignatario: string | null;
  porcentaje_realizado: number | null;
  tipo_facturacion: string | null;
  ultima_actualizacion: string | null;
  descripcion: string | null;
  last_comments: string | null;
  fecha_ultima_respuesta: string | null;
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
  "Proyecto",
  "Autor",
  "Tipo de tarea",
  "Prioridad",
  "Fecha de inicio",
  "Fecha de fin",
  "Estatus",
  "Asunto",
  "Asignatario",
  "% Realizado",
  "Tipo Facturacion",
  "Última tarea actualizada",
  "Descripción",
  "Last comments",
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

// "dd/MM/yyyy HH:mm" (hora local, sin zona) -> "yyyy-MM-dd HH:mm:00" para una
// columna timestamp sin zona horaria. Manual: nada de Date, para no mover la hora.
function parseFechaHora(value: unknown): string | null {
  const text = cellToText(value);
  if (!text) return null;
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::\d{2})?)?$/.exec(text);
  if (!m) return null;
  const fecha = fechaDMYaISO(m[1], m[2], m[3]);
  if (!fecha) return null;
  const hh = Number(m[4] ?? 0);
  const mm = Number(m[5] ?? 0);
  if (hh > 23 || mm > 59) return null;
  return `${fecha} ${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00`;
}

// Textos largos: no se usa cellToText (reemplaza "<br>" y colapsa) sino solo
// normalizar saltos de línea, para no alterar el contenido.
function textoLargo(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).replace(/\r\n|\r/g, "\n").trim();
  return text.length > 0 ? text : null;
}

export function parseTareasProveedor(buffer: ArrayBuffer): ParseResult {
  assertImportFileSize(buffer.byteLength);
  // El export de esta plataforma viene en Windows-1252, no UTF-8 (confirmado
  // contra un archivo real: leerlo como UTF-8 corrompe las tildes, ej.
  // "última" -> "�ltima"). Se decodifica explícitamente.
  const text = new TextDecoder("windows-1252").decode(buffer);
  const rows = parseCsv(text);

  const header = (rows[0] ?? []).map((h) => h.trim());
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
  const iProyecto = colIndex("Proyecto");
  const iAutor = colIndex("Autor");
  const iTipoTarea = colIndex("Tipo de tarea");
  const iPrioridad = colIndex("Prioridad");
  const iFechaInicio = colIndex("Fecha de inicio");
  const iFechaFin = colIndex("Fecha de fin");
  const iEstado = colIndex("Estatus");
  const iAsunto = colIndex("Asunto");
  const iAsignatario = colIndex("Asignatario");
  const iPorcentaje = colIndex("% Realizado");
  const iTipoFacturacion = colIndex("Tipo Facturacion");
  const iUltimaActualizacion = colIndex("Última tarea actualizada");
  const iDescripcion = colIndex("Descripción");
  const iLastComments = colIndex("Last comments");

  const dataRows = rows.slice(1);
  const valid: ParsedTareaProveedor[] = [];
  const errores: ParseError[] = [];

  dataRows.forEach((row, index) => {
    const filaHumana = index + 2;
    const isEmpty = row.every((cell) => cell === undefined || cell.trim() === "");
    if (isEmpty) return;

    const id_tarea = parseIdTarea(row[iId]);
    if (id_tarea === null) {
      errores.push({ fila: filaHumana, motivo: `ID de tarea inválido: "${cellToText(row[iId]) ?? ""}"` });
      return;
    }

    const last_comments = textoLargo(row[iLastComments]);

    valid.push({
      id_tarea,
      proyecto: cellToText(row[iProyecto]),
      autor: cellToText(row[iAutor]),
      tipo_tarea: cellToText(row[iTipoTarea]),
      prioridad: cellToText(row[iPrioridad]),
      fecha_inicio: parseFechaTexto(row[iFechaInicio]),
      fecha_fin: parseFechaTexto(row[iFechaFin]),
      estado: cellToText(row[iEstado]),
      asunto: cellToText(row[iAsunto]),
      asignatario: cellToText(row[iAsignatario]),
      porcentaje_realizado: parsePorcentaje(row[iPorcentaje]),
      tipo_facturacion: cellToText(row[iTipoFacturacion]),
      ultima_actualizacion: parseFechaHora(row[iUltimaActualizacion]),
      descripcion: textoLargo(row[iDescripcion]),
      last_comments,
      fecha_ultima_respuesta: fechaUltimaRespuesta(parseComentarios(last_comments)),
    });
  });

  return { valid, errores };
}
