// Iniciales tal como las produce parseComentarios -> nombre completo.
// Es una constante a mantener a mano: cuando entre gente nueva al proveedor,
// agregar aquí sus iniciales. Las desconocidas se muestran tal cual en la UI.
export const AUTORES_PROVEEDOR: Readonly<Record<string, string>> = {
  "G(": "Gamaliel Gutiérrez",
  DM: "Daniel Melo",
  "C(": "Cristina Gámez",
  J: "Jean Carlo Jiménez",
  "D(": "Dora Hidalgo",
  "O-": "Oscar Henao",
  "Y(": "Yesid Oliveros",
  "F(": "Flor Pedraza",
};

// Comparación exacta tras trim (sin normalizar mayúsculas).
export function nombreAutor(iniciales: string): string | null {
  const clave = iniciales.trim();
  return Object.prototype.hasOwnProperty.call(AUTORES_PROVEEDOR, clave)
    ? AUTORES_PROVEEDOR[clave]
    : null;
}
