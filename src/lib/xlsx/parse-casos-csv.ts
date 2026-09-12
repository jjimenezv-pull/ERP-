import * as XLSX from "xlsx";
import { format } from "date-fns";
import { cellToText, normalizeEstadoInterno, parseFechaTexto } from "@/lib/xlsx/shared";
import type { ParsedCasoRow, ParseError, ParseResult } from "@/lib/xlsx/parse-casos";

// Columnas requeridas del CSV exportado por GLPI, buscadas por nombre de encabezado
// (no por posición) para no depender del orden ni de si GLPI agrega/quita columnas.
// "Estado" aparece dos veces en el export: la primera es la real, la segunda
// siempre viene vacía — header.indexOf() toma la primera coincidencia a propósito.
const REQUIRED_COLUMNS = [
  "ID",
  "Título",
  "Estado",
  "Tipo",
  "Localizaciones",
  "Solicitante - Solicitante",
  "Categoría",
  "Fecha de Apertura",
  "Fecha de cierre",
  "Asignado a: - Técnico",
  "Urgencia",
  "Descripción",
  "Soluciones - Soluciones",
] as const;

// Quita el sufijo " (12345)" que GLPI agrega en el CSV a cada nombre de persona.
// Cuando hay varios técnicos separados por coma, CADA nombre trae su propio
// sufijo (ej. "Ana Ruiz (111), Juan Paz (222)") — por eso el reemplazo es
// global (/g), no solo al final del texto.
function sinSufijoId(value: string | null): string | null {
  if (!value) return value;
  return value.replace(/\s*\(\d+\)/g, "").trim() || null;
}

// Las fechas llegan como serial numérico de Excel cuando SheetJS las detecta como
// fecha al leer el CSV. Decodificarlas con XLSX.SSF.parse_date_code es aritmética
// pura sobre el serial (sin construir un objeto Date) — a diferencia de cellDates,
// no depende de la zona horaria del proceso que lee el archivo, que en el servidor
// de producción (UTC) puede correr el día calendario.
function parseFechaCelda(value: unknown): string | null {
  if (typeof value === "number") {
    const { y, m, d } = XLSX.SSF.parse_date_code(value);
    return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  return parseFechaTexto(value);
}

export function parseCasosCsv(buffer: ArrayBuffer): ParseResult {
  const workbook = XLSX.read(buffer, { type: "array", FS: ";" });
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
          motivo: `El archivo no tiene las columnas esperadas de GLPI: ${faltantes.join(", ")}`,
        },
      ],
    };
  }

  const iId = colIndex("ID");
  const iTitulo = colIndex("Título");
  const iEstado = colIndex("Estado");
  const iTipo = colIndex("Tipo");
  const iUbicacion = colIndex("Localizaciones");
  const iSolicitante = colIndex("Solicitante - Solicitante");
  const iCategoria = colIndex("Categoría");
  const iFechaApertura = colIndex("Fecha de Apertura");
  const iFechaCierre = colIndex("Fecha de cierre");
  const iTecnico = colIndex("Asignado a: - Técnico");
  const iUrgencia = colIndex("Urgencia");
  const iDescripcion = colIndex("Descripción");
  const iSolucion = colIndex("Soluciones - Soluciones");

  const dataRows = rows.slice(1);
  const hoy = format(new Date(), "yyyy-MM-dd");

  const valid: ParsedCasoRow[] = [];
  const errores: ParseError[] = [];

  dataRows.forEach((row, index) => {
    const filaHumana = index + 2;
    const isEmpty = row.every((cell) => cell === null || cell === undefined || cell === "");
    if (isEmpty) return;

    const idRaw = row[iId];
    if (typeof idRaw !== "number" || !Number.isInteger(idRaw) || idRaw <= 0) {
      errores.push({ fila: filaHumana, motivo: `ID inválido: "${cellToText(idRaw) ?? ""}"` });
      return;
    }

    const estado_interno = normalizeEstadoInterno(row[iEstado]);
    if (!estado_interno) {
      errores.push({
        fila: filaHumana,
        motivo: `Estado no reconocido: "${cellToText(row[iEstado]) ?? ""}"`,
      });
      return;
    }

    valid.push({
      id_glpi: idRaw,
      titulo: cellToText(row[iTitulo]),
      estado_interno,
      tipo: cellToText(row[iTipo]),
      ubicacion: cellToText(row[iUbicacion]),
      solicitante: sinSufijoId(cellToText(row[iSolicitante])),
      categoria: cellToText(row[iCategoria]),
      fecha_apertura: parseFechaCelda(row[iFechaApertura]),
      fecha_cierre: parseFechaCelda(row[iFechaCierre]),
      tecnico_asignado: sinSufijoId(cellToText(row[iTecnico])),
      urgencia: cellToText(row[iUrgencia]),
      descripcion: cellToText(row[iDescripcion]),
      solucion: cellToText(row[iSolucion]),
      semana_carga: hoy,
    });
  });

  return { valid, errores };
}
