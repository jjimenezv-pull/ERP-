// "Last comments" del export del proveedor es un solo texto con todos los
// comentarios apilados. Cada comentario arranca al inicio de una línea con las
// iniciales del autor (1-3 caracteres, ej. "F(", "DM", "O-"), una fecha
// dd/MM/yyyy y luego el texto, que puede seguir en las líneas siguientes.

export type ComentarioProveedor = {
  autor: string;
  // yyyy-MM-dd. null solo en texto previo al primer encabezado (sin fecha).
  fecha: string | null;
  texto: string;
  // Entrada que la plataforma genera sola; no es una respuesta real de nadie.
  automatico: boolean;
};

// La primera letra evita tomar como encabezado una línea de cuerpo tipo
// "12. 03/05/2026 ...".
const ENCABEZADO = /^([A-Za-zÀ-ɏ]\S{0,2})\s+(\d{2})\/(\d{2})\/(\d{4})(?:\s+(.*))?$/;
const AUTOMATICO = /^This task was automatically updated by Help desk/i;

// Convierte día/mes/año a yyyy-MM-dd validando que la fecha exista. No pasa por
// Date.parse: evita cualquier heurística que invierta día y mes.
export function fechaDMYaISO(dia: string, mes: string, anio: string): string | null {
  const d = Number(dia);
  const m = Number(mes);
  const y = Number(anio);
  const fecha = new Date(Date.UTC(y, m - 1, d));
  if (
    fecha.getUTCFullYear() !== y ||
    fecha.getUTCMonth() !== m - 1 ||
    fecha.getUTCDate() !== d
  ) {
    return null;
  }
  return `${anio.padStart(4, "0")}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
}

export function parseComentarios(raw: string | null | undefined): ComentarioProveedor[] {
  if (!raw) return [];
  const entradas: { autor: string; fecha: string | null; lineas: string[] }[] = [];
  let actual: (typeof entradas)[number] | null = null;

  for (const linea of raw.split(/\r\n|\r|\n/)) {
    const m = ENCABEZADO.exec(linea);
    const fecha = m ? fechaDMYaISO(m[2], m[3], m[4]) : null;
    if (m && fecha) {
      actual = { autor: m[1], fecha, lineas: [m[5] ?? ""] };
      entradas.push(actual);
    } else {
      if (!actual) {
        // Texto antes del primer encabezado: se conserva en lugar de perderlo.
        if (!linea.trim()) continue;
        actual = { autor: "", fecha: null, lineas: [] };
        entradas.push(actual);
      }
      actual.lineas.push(linea);
    }
  }

  return entradas
    .map((e) => {
      const texto = e.lineas.join("\n").trim();
      return { autor: e.autor, fecha: e.fecha, texto, automatico: AUTOMATICO.test(texto) };
    })
    .filter((e) => e.texto.length > 0 || e.fecha !== null);
}

// Fecha (yyyy-MM-dd) del comentario real más reciente. No asume orden
// cronológico y descarta las entradas automáticas del sistema.
export function fechaUltimaRespuesta(comentarios: ComentarioProveedor[]): string | null {
  let max: string | null = null;
  for (const c of comentarios) {
    if (c.automatico || !c.fecha) continue;
    if (max === null || c.fecha > max) max = c.fecha;
  }
  return max;
}
