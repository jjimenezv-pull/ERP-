"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { contarUsoModulo, crearModulo, eliminarModulo, renombrarModulo } from "@/app/modulos/actions";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type ModuloOpcion = { id: string; nombre: string };

// Paleta de etiquetas de módulo: 10 colores sólidos como los de Estado/Urgencia/Tipo, con
// tokens --modulo-N / --modulo-N-fg en globals.css (claro y oscuro). Clases literales
// completas para que Tailwind las genere. El color sale de un hash del id, no del nombre:
// renombrar no lo cambia.
const PALETA_MODULO: { badge: string; punto: string }[] = [
  { badge: "border-transparent bg-[var(--modulo-1)] text-[var(--modulo-1-fg)]", punto: "bg-[var(--modulo-1)]" },
  { badge: "border-transparent bg-[var(--modulo-2)] text-[var(--modulo-2-fg)]", punto: "bg-[var(--modulo-2)]" },
  { badge: "border-transparent bg-[var(--modulo-3)] text-[var(--modulo-3-fg)]", punto: "bg-[var(--modulo-3)]" },
  { badge: "border-transparent bg-[var(--modulo-4)] text-[var(--modulo-4-fg)]", punto: "bg-[var(--modulo-4)]" },
  { badge: "border-transparent bg-[var(--modulo-5)] text-[var(--modulo-5-fg)]", punto: "bg-[var(--modulo-5)]" },
  { badge: "border-transparent bg-[var(--modulo-6)] text-[var(--modulo-6-fg)]", punto: "bg-[var(--modulo-6)]" },
  { badge: "border-transparent bg-[var(--modulo-7)] text-[var(--modulo-7-fg)]", punto: "bg-[var(--modulo-7)]" },
  { badge: "border-transparent bg-[var(--modulo-8)] text-[var(--modulo-8-fg)]", punto: "bg-[var(--modulo-8)]" },
  { badge: "border-transparent bg-[var(--modulo-9)] text-[var(--modulo-9-fg)]", punto: "bg-[var(--modulo-9)]" },
  { badge: "border-transparent bg-[var(--modulo-10)] text-[var(--modulo-10-fg)]", punto: "bg-[var(--modulo-10)]" },
];

function entradaPaleta(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return PALETA_MODULO[h % PALETA_MODULO.length];
}

// Clases de color (borde/fondo/texto; el modo oscuro lo resuelven los tokens) del módulo.
export function claseModulo(id: string): string {
  return entradaPaleta(id).badge;
}

// Etiqueta de módulo con su color.
export function ModuloBadge({ id, nombre, className }: { id: string; nombre: string; className?: string }) {
  return (
    <Badge variant="outline" className={cn("max-w-full", claseModulo(id), className)}>
      <span className="truncate">{nombre}</span>
    </Badge>
  );
}

// Catálogo de módulos del cliente: arranca con lo que cargó el servidor y suma
// los que el admin crea sin esperar a que la página se revalide.
export function useModulos(
  inicial: ModuloOpcion[],
  // Se llama tras eliminar un módulo para que la tabla deje sin módulo sus filas.
  opciones?: { onEliminado?: (id: string) => void }
) {
  const [modulos, setModulos] = useState(inicial);

  useEffect(() => {
    setModulos(inicial);
  }, [inicial]);

  const nombrePorId = useMemo(() => new Map(modulos.map((m) => [m.id, m.nombre])), [modulos]);

  // Crea (o recupera, si ya existe) un módulo. Devuelve su id, o null si falló.
  async function crear(nombre: string): Promise<string | null> {
    const res = await crearModulo(nombre);
    if (res.error !== undefined) {
      toast.error(res.error);
      return null;
    }
    const { modulo } = res;
    setModulos((prev) =>
      prev.some((m) => m.id === modulo.id)
        ? prev
        : [...prev, modulo].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
    );
    return modulo.id;
  }

  // Renombra un módulo. Devuelve true si se guardó.
  async function renombrar(id: string, nombre: string): Promise<boolean> {
    const res = await renombrarModulo(id, nombre);
    if (res.error !== undefined) {
      toast.error(res.error);
      return false;
    }
    const limpio = nombre.trim();
    setModulos((prev) =>
      prev.map((m) => (m.id === id ? { ...m, nombre: limpio } : m)).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
    );
    toast.success("Módulo renombrado");
    return true;
  }

  // Elimina un módulo y deja sin módulo las filas que lo usaban. Devuelve true si se borró.
  async function eliminar(id: string): Promise<boolean> {
    const res = await eliminarModulo(id);
    if (res.error !== undefined) {
      toast.error(res.error);
      return false;
    }
    setModulos((prev) => prev.filter((m) => m.id !== id));
    opciones?.onEliminado?.(id);
    toast.success("Módulo eliminado");
    return true;
  }

  return { modulos, nombrePorId, crear, renombrar, eliminar };
}

export type ModulosCtl = ReturnType<typeof useModulos>;

// Lista desplegable con búsqueda. Solo se renderiza para admins: puede asignar
// un módulo existente, limpiarlo, crear uno nuevo con el texto escrito, y
// renombrar o eliminar los existentes.
export function ModuloSelect({
  ctl,
  value,
  onChange,
  disabled,
  etiqueta,
  className,
}: {
  ctl: ModulosCtl;
  // id del módulo actual (null = sin módulo). Con `etiqueta` (modo botón) se ignora.
  value?: string | null;
  onChange: (moduloId: string | null) => void;
  disabled?: boolean;
  // Texto fijo del botón (barra de acciones en bloque); sin él muestra el módulo actual.
  etiqueta?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [texto, setTexto] = useState("");
  const [creando, setCreando] = useState(false);
  // Edición en línea del nombre (lápiz) y confirmación de borrado (papelera).
  const [editando, setEditando] = useState<{ id: string; texto: string } | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [aBorrar, setABorrar] = useState<{ id: string; nombre: string; casos: number; tareas: number } | null>(null);
  const [borrando, setBorrando] = useState(false);

  const q = texto.trim().toLowerCase();
  const filtrados = ctl.modulos.filter((m) => m.nombre.toLowerCase().includes(q));
  const existeExacto = ctl.modulos.some((m) => m.nombre.trim().toLowerCase() === q);
  const actual = value ? ctl.nombrePorId.get(value) : undefined;

  function elegir(id: string | null) {
    setOpen(false);
    setTexto("");
    onChange(id);
  }

  async function handleCrear() {
    if (creando) return;
    setCreando(true);
    const id = await ctl.crear(texto);
    setCreando(false);
    if (id) elegir(id);
  }

  async function handleRenombrar() {
    if (!editando || guardando) return;
    setGuardando(true);
    const ok = await ctl.renombrar(editando.id, editando.texto);
    setGuardando(false);
    if (ok) setEditando(null);
  }

  async function pedirBorrado(m: ModuloOpcion) {
    const res = await contarUsoModulo(m.id);
    if (res.error !== undefined) {
      toast.error(res.error);
      return;
    }
    setOpen(false);
    setTexto("");
    setEditando(null);
    setABorrar({ id: m.id, nombre: m.nombre, casos: res.casos, tareas: res.tareas });
  }

  async function confirmarBorrado() {
    if (!aBorrar || borrando) return;
    setBorrando(true);
    const ok = await ctl.eliminar(aBorrar.id);
    setBorrando(false);
    if (ok) setABorrar(null);
  }

  return (
    <>
      <Popover
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) {
            setTexto("");
            setEditando(null);
          }
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              "flex h-8 w-full min-w-[120px] items-center justify-between gap-1 rounded-md border bg-background px-2 text-left text-sm hover:bg-muted disabled:opacity-60",
              className
            )}
          >
            {!etiqueta && actual && value ? (
              <ModuloBadge id={value} nombre={actual} />
            ) : (
              <span className={cn("truncate", !etiqueta && "text-muted-foreground")}>{etiqueta ?? "Sin módulo"}</span>
            )}
            <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 p-2">
          <input
            autoFocus
            value={texto}
            maxLength={60}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && texto.trim() && !existeExacto) {
                e.preventDefault();
                void handleCrear();
              }
            }}
            placeholder="Buscar o crear módulo..."
            className="mb-2 h-8 w-full rounded-md border bg-background px-2 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <ul className="max-h-56 overflow-y-auto text-sm">
            {!q && (
              <li>
                <button
                  type="button"
                  onClick={() => elegir(null)}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-muted-foreground hover:bg-muted"
                >
                  <Check className={cn("h-3.5 w-3.5", value ? "opacity-0" : "opacity-100")} />
                  Sin módulo
                </button>
              </li>
            )}
            {filtrados.map((m) =>
              editando?.id === m.id ? (
                <li key={m.id} className="flex items-center gap-1 px-1 py-1">
                  <input
                    autoFocus
                    value={editando.texto}
                    maxLength={60}
                    disabled={guardando}
                    onChange={(e) => setEditando({ id: m.id, texto: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void handleRenombrar();
                      } else if (e.key === "Escape") {
                        // Cancela solo la edición, sin cerrar el popover.
                        e.preventDefault();
                        e.stopPropagation();
                        setEditando(null);
                      }
                    }}
                    aria-label={`Nuevo nombre de ${m.nombre}`}
                    className="h-7 min-w-0 flex-1 rounded-md border bg-background px-2 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                  <button
                    type="button"
                    disabled={guardando}
                    onClick={() => void handleRenombrar()}
                    aria-label="Guardar nombre"
                    className="rounded p-1 hover:bg-muted disabled:opacity-60"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                </li>
              ) : (
                <li key={m.id} className="flex items-center rounded hover:bg-muted">
                  <button
                    type="button"
                    onClick={() => elegir(m.id)}
                    className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-left"
                  >
                    <Check className={cn("h-3.5 w-3.5 shrink-0", value === m.id ? "opacity-100" : "opacity-0")} />
                    <span className={cn("h-2 w-2 shrink-0 rounded-full", entradaPaleta(m.id).punto)} />
                    <span className="truncate">{m.nombre}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditando({ id: m.id, texto: m.nombre })}
                    aria-label={`Renombrar ${m.nombre}`}
                    className="rounded p-1 text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void pedirBorrado(m)}
                    aria-label={`Eliminar ${m.nombre}`}
                    className="mr-1 rounded p-1 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              )
            )}
            {q && !existeExacto && (
              <li>
                <button
                  type="button"
                  disabled={creando}
                  onClick={() => void handleCrear()}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left font-medium hover:bg-muted disabled:opacity-60"
                >
                  <Plus className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Crear «{texto.trim()}»</span>
                </button>
              </li>
            )}
          </ul>
        </PopoverContent>
      </Popover>

      <Dialog
        open={Boolean(aBorrar)}
        onOpenChange={(v) => {
          if (!v && !borrando) setABorrar(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar módulo</DialogTitle>
            <DialogDescription>
              {aBorrar &&
                (aBorrar.casos === 0 && aBorrar.tareas === 0
                  ? `«${aBorrar.nombre}» no está asignado a ningún caso ni tarea.`
                  : `«${aBorrar.nombre}» está asignado a ${aBorrar.casos} ${aBorrar.casos === 1 ? "caso" : "casos"} y ${aBorrar.tareas} ${aBorrar.tareas === 1 ? "tarea" : "tareas"}; quedarán sin módulo.`)}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <button
              type="button"
              disabled={borrando}
              onClick={() => setABorrar(null)}
              className="h-9 rounded-md border px-4 text-sm hover:bg-muted disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={borrando}
              onClick={() => void confirmarBorrado()}
              className="h-9 rounded-md bg-destructive px-4 text-sm text-destructive-foreground hover:bg-destructive/90 disabled:opacity-60"
            >
              {borrando ? "Eliminando..." : "Eliminar"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
