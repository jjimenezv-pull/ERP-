import type { Caso, CasoProveedor } from "@/lib/supabase/types";

// El estado del proveedor no vive en `casos`: se deriva cruzando
// `casos.caso_escalado_proveedor` (texto libre que escribe el admin) con
// `casos_proveedor.id_tarea`. No hay llave foránea a propósito: se escala a
// mano primero y el import del proveedor llega después.

export const ESTADO_NO_ESCALADO = "No escalado";
export const ESTADO_SIN_MATCH = "Sin match";
const ESTADO_SIN_ESTADO = "Sin estado";

// Estados del proveedor que cierran el ciclo: un escalado en cualquiera de
// estos ya no cuenta como pendiente.
const ESTADOS_TERMINALES = new Set(["Cerrada", "Caducada"]);

export type CasoConEstado = Caso & { estado_proveedor_real: string };

export type MapaEstadosProveedor = Map<number, string>;

export function construirMapaEstados(
  tareas: Pick<CasoProveedor, "id_tarea" | "estado">[]
): MapaEstadosProveedor {
  return new Map(tareas.map((t) => [t.id_tarea, t.estado?.trim() || ESTADO_SIN_ESTADO]));
}

export function estaEscalado(ref: string | null): boolean {
  return Boolean(ref?.trim());
}

export function estadoProveedorReal(
  ref: string | null,
  mapa: MapaEstadosProveedor
): string {
  const limpio = ref?.trim();
  if (!limpio) return ESTADO_NO_ESCALADO;
  if (!/^\d+$/.test(limpio)) return ESTADO_SIN_MATCH;
  return mapa.get(Number(limpio)) ?? ESTADO_SIN_MATCH;
}

export function conEstadoProveedor(casos: Caso[], mapa: MapaEstadosProveedor): CasoConEstado[] {
  return casos.map((c) => ({
    ...c,
    estado_proveedor_real: estadoProveedorReal(c.caso_escalado_proveedor, mapa),
  }));
}

// Pendiente = escalado y sin cerrar en el proveedor. "Sin match" cuenta como
// pendiente: hay una referencia escrita pero no sabemos que se haya resuelto.
export function esPendienteProveedor(estado: string): boolean {
  return estado !== ESTADO_NO_ESCALADO && !ESTADOS_TERMINALES.has(estado);
}

// Filtra y ordena en memoria por el estado derivado (no existe como columna,
// así que la base no puede hacerlo). No hay paginación, así que es suficiente.
export function aplicarEstadoProveedor(
  casos: Caso[],
  mapa: MapaEstadosProveedor,
  opciones: {
    filtro?: string;
    soloEscalados?: boolean;
    ordenarPorEstado?: "asc" | "desc" | null;
  }
): CasoConEstado[] {
  let resultado = conEstadoProveedor(casos, mapa);
  if (opciones.soloEscalados) {
    resultado = resultado.filter((c) => c.estado_proveedor_real !== ESTADO_NO_ESCALADO);
  }
  if (opciones.filtro) {
    resultado = resultado.filter((c) => c.estado_proveedor_real === opciones.filtro);
  }
  if (opciones.ordenarPorEstado) {
    const signo = opciones.ordenarPorEstado === "asc" ? 1 : -1;
    resultado = [...resultado].sort(
      (a, b) => signo * a.estado_proveedor_real.localeCompare(b.estado_proveedor_real, "es")
    );
  }
  return resultado;
}
