// Paleta cerrada de etiquetas (tipos y módulos): 30 colores sólidos con tokens
// --etiqueta-N / --etiqueta-N-fg en globals.css (claro y oscuro). Las clases son literales
// completas para que Tailwind las genere (tailwind.config.ts incluye src/lib).

export const CLAVES_COLOR: readonly string[] = Array.from({ length: 30 }, (_, i) => String(i + 1));

const CLASES: Record<string, string> = {
  "1": "border-transparent bg-[var(--etiqueta-1)] text-[var(--etiqueta-1-fg)]",
  "2": "border-transparent bg-[var(--etiqueta-2)] text-[var(--etiqueta-2-fg)]",
  "3": "border-transparent bg-[var(--etiqueta-3)] text-[var(--etiqueta-3-fg)]",
  "4": "border-transparent bg-[var(--etiqueta-4)] text-[var(--etiqueta-4-fg)]",
  "5": "border-transparent bg-[var(--etiqueta-5)] text-[var(--etiqueta-5-fg)]",
  "6": "border-transparent bg-[var(--etiqueta-6)] text-[var(--etiqueta-6-fg)]",
  "7": "border-transparent bg-[var(--etiqueta-7)] text-[var(--etiqueta-7-fg)]",
  "8": "border-transparent bg-[var(--etiqueta-8)] text-[var(--etiqueta-8-fg)]",
  "9": "border-transparent bg-[var(--etiqueta-9)] text-[var(--etiqueta-9-fg)]",
  "10": "border-transparent bg-[var(--etiqueta-10)] text-[var(--etiqueta-10-fg)]",
  "11": "border-transparent bg-[var(--etiqueta-11)] text-[var(--etiqueta-11-fg)]",
  "12": "border-transparent bg-[var(--etiqueta-12)] text-[var(--etiqueta-12-fg)]",
  "13": "border-transparent bg-[var(--etiqueta-13)] text-[var(--etiqueta-13-fg)]",
  "14": "border-transparent bg-[var(--etiqueta-14)] text-[var(--etiqueta-14-fg)]",
  "15": "border-transparent bg-[var(--etiqueta-15)] text-[var(--etiqueta-15-fg)]",
  "16": "border-transparent bg-[var(--etiqueta-16)] text-[var(--etiqueta-16-fg)]",
  "17": "border-transparent bg-[var(--etiqueta-17)] text-[var(--etiqueta-17-fg)]",
  "18": "border-transparent bg-[var(--etiqueta-18)] text-[var(--etiqueta-18-fg)]",
  "19": "border-transparent bg-[var(--etiqueta-19)] text-[var(--etiqueta-19-fg)]",
  "20": "border-transparent bg-[var(--etiqueta-20)] text-[var(--etiqueta-20-fg)]",
  "21": "border-transparent bg-[var(--etiqueta-21)] text-[var(--etiqueta-21-fg)]",
  "22": "border-transparent bg-[var(--etiqueta-22)] text-[var(--etiqueta-22-fg)]",
  "23": "border-transparent bg-[var(--etiqueta-23)] text-[var(--etiqueta-23-fg)]",
  "24": "border-transparent bg-[var(--etiqueta-24)] text-[var(--etiqueta-24-fg)]",
  "25": "border-transparent bg-[var(--etiqueta-25)] text-[var(--etiqueta-25-fg)]",
  "26": "border-transparent bg-[var(--etiqueta-26)] text-[var(--etiqueta-26-fg)]",
  "27": "border-transparent bg-[var(--etiqueta-27)] text-[var(--etiqueta-27-fg)]",
  "28": "border-transparent bg-[var(--etiqueta-28)] text-[var(--etiqueta-28-fg)]",
  "29": "border-transparent bg-[var(--etiqueta-29)] text-[var(--etiqueta-29-fg)]",
  "30": "border-transparent bg-[var(--etiqueta-30)] text-[var(--etiqueta-30-fg)]",
};

const CLASE_NEUTRA = "border-dashed text-muted-foreground";

export function esColorValido(clave: string): boolean {
  return Object.prototype.hasOwnProperty.call(CLASES, clave);
}

// Hash estable del id sobre las claves 1..10 (el mismo que usaba modulo-select), para que los
// módulos sin color asignado conserven el que ya tenían.
function claveDesdeId(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return CLAVES_COLOR[h % 10];
}

export function claseEtiqueta(clave: string | null | undefined, fallbackId?: string): string {
  if (clave && esColorValido(clave)) return CLASES[clave];
  if (fallbackId) return CLASES[claveDesdeId(fallbackId)];
  return CLASE_NEUTRA;
}

// Agrupación por tono para el selector.
export const GRUPOS_COLOR: { nombre: string; claves: string[] }[] = [
  { nombre: "Rojos y rosas", claves: ["14", "15", "2", "10", "27", "28"] },
  { nombre: "Naranjas y ámbar", claves: ["12", "16", "7"] },
  { nombre: "Amarillos y limas", claves: ["17", "4", "9"] },
  { nombre: "Verdes", claves: ["18", "19"] },
  { nombre: "Turquesas", claves: ["5", "13", "20"] },
  { nombre: "Azules", claves: ["3", "8", "22", "21", "11"] },
  { nombre: "Índigos y púrpuras", claves: ["23", "24", "1", "25", "26", "6"] },
  { nombre: "Grises", claves: ["29", "30"] },
];
