import type { CasoDetalle } from "@/app/casos/actions";
import type { CasoListaConEstado } from "@/lib/proveedor/cruce";
import type { TareaDetalle, TareaLista } from "@/lib/proveedor/tareas";

// Un caso GLPI y una tarea del proveedor forman un par cuando
// `casos.caso_escalado_proveedor` (texto) es el `id_tarea` de la tarea. Se
// compara como entero (igual que cruce.ts): "0123 " y "123" son la misma tarea.
export function idTareaDeReferencia(ref: string | null | undefined): number | null {
  const limpio = ref?.trim();
  if (!limpio || !/^\d+$/.test(limpio)) return null;
  const n = Number(limpio);
  return Number.isSafeInteger(n) ? n : null;
}

// Par ligero (sin textos largos) para saber, sin filtros de página de por medio,
// qué caso GLPI corresponde a cada tarea.
export interface ParGlpi {
  id: string;
  id_glpi: number;
  titulo: string | null;
  id_tarea: number;
}

// Si varios casos apuntan a la misma tarea gana el primero (las filas llegan
// ordenadas por id_glpi para que el resultado sea estable).
export function construirParesGlpi(
  casos: { id: string; id_glpi: number; titulo: string | null; caso_escalado_proveedor: string | null }[]
): ParGlpi[] {
  const vistos = new Set<number>();
  const pares: ParGlpi[] = [];
  for (const c of casos) {
    const id_tarea = idTareaDeReferencia(c.caso_escalado_proveedor);
    if (id_tarea === null || vistos.has(id_tarea)) continue;
    vistos.add(id_tarea);
    pares.push({ id: c.id, id_glpi: c.id_glpi, titulo: c.titulo, id_tarea });
  }
  return pares;
}

// Lo que devuelven las acciones que traen "el otro lado" del par.
export interface CasoGlpiPar {
  caso: CasoListaConEstado;
  detalle: CasoDetalle;
}

export interface TareaPar {
  tarea: TareaLista;
  detalle: TareaDetalle;
  // yyyy-MM-dd en Bogotá, para calcular los días en el cliente.
  hoy: string;
}
