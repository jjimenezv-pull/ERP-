"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  cambiarColorModulo,
  contarUsoModulo,
  crearModulo,
  eliminarModulo,
  renombrarModulo,
} from "@/app/modulos/actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SelectorColor } from "@/components/etiquetas/selector-color";
import { CLAVES_COLOR } from "@/lib/etiquetas";
import { FilaEtiqueta, claseBotonPeligro, type Uso } from "./fila-etiqueta";

export type ModuloAjuste = { id: string; nombre: string; color: string | null };

const SIN_USO: Uso = { casos: 0, tareas: 0 };

// Primer color de la paleta que ningún módulo usa todavía.
function colorLibre(colores: (string | null)[]): string {
  const usados = new Set(colores);
  return CLAVES_COLOR.find((c) => !usados.has(c)) ?? CLAVES_COLOR[0];
}

export function ModulosPanel({
  modulos: modulosProp,
  uso,
}: {
  modulos: ModuloAjuste[];
  uso: Record<string, Uso>;
}) {
  const [modulos, setModulos] = useState(modulosProp);
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [colorNuevo, setColorNuevo] = useState(() => colorLibre(modulosProp.map((m) => m.color)));
  const [creando, setCreando] = useState(false);
  const [aBorrar, setABorrar] = useState<(ModuloAjuste & Uso) | null>(null);
  const [borrando, setBorrando] = useState(false);

  // Tras revalidar, el servidor manda la verdad.
  useEffect(() => setModulos(modulosProp), [modulosProp]);

  async function crear() {
    if (creando) return;
    setCreando(true);
    const res = await crearModulo(nombreNuevo);
    if (res.error !== undefined) {
      setCreando(false);
      toast.error(res.error);
      return;
    }
    // crearModulo no recibe color: se asigna el elegido sobre el módulo recién creado.
    const resColor = await cambiarColorModulo(res.modulo.id, colorNuevo);
    setCreando(false);
    if (resColor.error !== undefined) toast.error(resColor.error);
    else toast.success("Módulo creado");
    setNombreNuevo("");
    setColorNuevo(colorLibre([...modulos.map((m) => m.color), colorNuevo]));
  }

  async function renombrar(m: ModuloAjuste, nombre: string): Promise<boolean> {
    const previo = modulos;
    setModulos((l) => l.map((x) => (x.id === m.id ? { ...x, nombre } : x)));
    const res = await renombrarModulo(m.id, nombre);
    if (res.error !== undefined) {
      setModulos(previo);
      toast.error(res.error);
      return false;
    }
    toast.success("Módulo renombrado");
    return true;
  }

  async function cambiarColor(m: ModuloAjuste, color: string) {
    if (color === m.color) return;
    const previo = modulos;
    setModulos((l) => l.map((x) => (x.id === m.id ? { ...x, color } : x)));
    const res = await cambiarColorModulo(m.id, color);
    if (res.error !== undefined) {
      setModulos(previo);
      toast.error(res.error);
      return;
    }
    toast.success("Color actualizado");
  }

  async function pedirBorrado(m: ModuloAjuste) {
    const res = await contarUsoModulo(m.id);
    if (res.error !== undefined) {
      toast.error(res.error);
      return;
    }
    setABorrar({ ...m, casos: res.casos, tareas: res.tareas });
  }

  async function confirmarBorrado() {
    if (!aBorrar || borrando) return;
    setBorrando(true);
    const res = await eliminarModulo(aBorrar.id);
    setBorrando(false);
    if (res.error !== undefined) {
      toast.error(res.error);
      return;
    }
    setModulos((l) => l.filter((x) => x.id !== aBorrar.id));
    setABorrar(null);
    toast.success("Módulo eliminado");
  }

  return (
    <div className="space-y-3">
      <form
        className="flex flex-wrap items-center gap-3 rounded-md border bg-muted/30 px-3 py-2"
        onSubmit={(e) => {
          e.preventDefault();
          void crear();
        }}
      >
        <input
          value={nombreNuevo}
          maxLength={80}
          disabled={creando}
          placeholder="Nuevo módulo…"
          aria-label="Nombre del nuevo módulo"
          onChange={(e) => setNombreNuevo(e.target.value)}
          className="h-8 w-56 rounded-md border bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <SelectorColor valor={colorNuevo} onChange={setColorNuevo} disabled={creando} />
        <button
          type="submit"
          disabled={creando || !nombreNuevo.trim()}
          className="h-8 rounded-md bg-primary px-3 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {creando ? "Creando..." : "Crear"}
        </button>
      </form>

      <ul className="space-y-2">
        {modulos.map((m) => (
          <FilaEtiqueta
            key={m.id}
            id={m.id}
            nombre={m.nombre}
            color={m.color}
            uso={uso[m.id] ?? SIN_USO}
            onRenombrar={(n) => renombrar(m, n)}
            onColor={(c) => void cambiarColor(m, c)}
          >
            <button
              type="button"
              aria-label={`Eliminar ${m.nombre}`}
              title="Eliminar"
              onClick={() => void pedirBorrado(m)}
              className="flex h-8 w-8 items-center justify-center rounded-md border hover:bg-muted"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </FilaEtiqueta>
        ))}
        {modulos.length === 0 && <li className="text-sm text-muted-foreground">No hay módulos.</li>}
      </ul>

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
              className={claseBotonPeligro}
            >
              {borrando ? "Eliminando..." : "Eliminar"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
