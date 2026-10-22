// Parser CSV mínimo (RFC 4180): campos entre comillas, "" como comilla escapada
// y saltos de línea (CRLF/LF) dentro de comillas. Se usa en lugar de SheetJS
// porque el export del proveedor trae celdas de varios KB con saltos de línea
// y comillas, que las librerías de hojas de cálculo truncan o malinterpretan.
export function parseCsv(text: string): string[][] {
  // BOM: UTF-8 ya decodificado, o sus bytes leídos como Windows-1252.
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  else if (text.startsWith("ï»¿")) text = text.slice(3);

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let fieldStart = true;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"' && fieldStart) {
      inQuotes = true;
      fieldStart = false;
    } else if (c === ",") {
      row.push(field);
      field = "";
      fieldStart = true;
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      fieldStart = true;
    } else {
      field += c;
      fieldStart = false;
    }
  }
  // Última fila sin salto de línea final.
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}
