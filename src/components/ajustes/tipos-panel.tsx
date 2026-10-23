"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  activarTipo,
  cambiarColorTipo,
  contarUsoTipo,
  crearTipo,
  eliminarTipo,
  moverTipo,
  renombrarTipo,
} from "@/app/ajustes/actions";
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
import type { Tipo } from "@/lib/supabase/types";
import { FilaEtiqueta, claseBotonPeligro, type Uso } from "./fila-etiqueta";

const SIN_USO: Uso = { casos: 0, tareas: 0 };

const botonIcono =
  "flex h-8 w-8 items-center justify-center rounded-md border hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40";

// Primer color de la paleta que ningún tipo usa todavía.
function colorLibre(colores: string[]): string {
  const usados = new Set(colores);
  return CLAVES_COLOR.find((c) => !usados.has(c)) ?? CLAVES_COLOR[0];
}

export function TiposPanel({ tipos: tiposProp, uso }: { tipos: Tipo[]; uso: Record<string, Uso> }) {
  const [tipos, setTipos] = useState(tiposProp);
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [colorNuevo, setColorNuevo] = useState(() => colorLibre(tiposProp.map((t) => t.color)));
  const [creando, setCreando] = useState(false);
  const [aBorrar, setABorrar] = useState<Tipo | null>(null);
  const [borrando, setBorrando] = useState(false);

  // Tras revalidar, el servidor manda la verdad.
  useEffect(() => setTipos(tiposProp), [tiposProp]);

  async function crear() {
    if (creando) return;
    setCreando(true);
    const res = await crearTipo(nombreNuevo, colorNuevo);
    setCreando(false);
    if (res.error !== undefined) {
      toast.error(res.error);
      return;
    }
    setNombreNuevo("");
    setColorNuevo(colorLibre([...tipos.map((t) => t.color), colorNuevo]));
    toast.success("Tipo creado");
  }

  async function renombrar(t: Tipo, nombre: string): Promise<boolean> {
    const previo = tipos;
    setTipos((l) => l.map((x) => (x.id === t.id ? { ...x, nombre } : x)));
    const res = await renombrarTipo(t.id, nombre);
    if (res.error !== undefined) {
      setTipos(previo);
      toast.error(res.error);
      return false;
    }
    toast.success("Tipo renombrado");
    return true;
  }

  async function cambiarColor(t: Tipo, color: string) {
    if (color === t.color) return;
    const previo = tipos;
    setTipos((l) => l.map((x) => (x.id === t.id ? { ...x, color } : x)));
    const res = await cambiarColorTipo(t.id, color);
    if (res.error !== undefined) {
      setTipos(previo);
      toast.error(res.error);
      return;
    }
    toast.success("Color actualizado");
  }

  async function mover(i: number, direccion: "arriba" | "abajo") {
    const j = direccion === "arriba" ? i - 1 : i + 1;
    if (j < 0 || j >= tipos.length) return;
    const previo = tipos;
    const copia = [...tipos];
    [copia[i], copia[j]] = [copia[j], copia[i]];
    setTipos(copia);
    const res = await moverTipo(tipos[i].id, direccion);
    if (res.error !== undefined) {
      setTipos(previo);
      toast.error(res.error);
    }
  }

  async function alternarActivo(t: Tipo) {
    const previo = tipos;
    setTipos((l) => l.map((x) => (x.id === t.id ? { ...x, activo: !t.activo } : x)));
    const res = await activarTipo(t.id, !t.activo);
    if (res.error !== undefined) {
      setTipos(previo);
      toast.error(res.error);
      return;
    }
    toast.success(t.activo ? "Tipo desactivado" : "Tipo activado");
  }

  // Revalida el uso antes de abrir el diálogo: puede haber cambiado desde que se cargó la página.
  async function pedirBorrado(t: Tipo) {
    const res = await contarUsoTipo(t.id);
    if (res.error !== undefined) {
      toast.error(res.error);
      return;
    }
    if (res.casos > 0 || res.tareas > 0) {
      toast.error("Está en uso; desactívalo en vez de eliminarlo.");
      return;
    }
    setABorrar(t);
  }

  async function confirmarBorrado() {
    if (!aBorrar || borrando) return;
    setBorrando(true);
    const res = await eliminarTipo(aBorrar.id);
    setBorrando(false);
    if (res.error !== undefined) {
      toast.error(res.error);
      return;
    }
    setTipos((l) => l.filter((x) => x.id !== aBorrar.id));
    setABorrar(null);
    toast.success("Tipo eliminado");
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
          placeholder="Nuevo tipo…"
          aria-label="Nombre del nuevo tipo"
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
        {tipos.map((t, i) => {
          const u = uso[t.id] ?? SIN_USO;
          const enUso = u.casos > 0 || u.tareas > 0;
          return (
            <FilaEtiqueta
              key={t.id}
              id={t.id}
              nombre={t.nombre}
              color={t.color}
              uso={u}
              inactivo={!t.activo}
              onRenombrar={(n) => renombrar(t, n)}
              onColor={(c) => void cambiarColor(t, c)}
            >
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label={`Subir ${t.nombre}`}
                  disabled={i === 0}
                  onClick={() => void mover(i, "arriba")}
                  className={botonIcono}
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label={`Bajar ${t.nombre}`}
                  disabled={i === tipos.length - 1}
                  onClick={() => void mover(i, "abajo")}
                  className={botonIcono}
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label={t.activo ? `Desactivar ${t.nombre}` : `Activar ${t.nombre}`}
                  title={t.activo ? "Desactivar" : "Activar"}
                  onClick={() => void alternarActivo(t)}
                  className={botonIcono}
                >
                  {t.activo ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
                {/* Un botón disabled no dispara tooltip; el wrapper lleva el title. */}
                <span title={enUso ? "Desactívalo en vez de eliminarlo" : "Eliminar"}>
                  <button
                    type="button"
                    aria-label={`Eliminar ${t.nombre}`}
                    disabled={enUso}
                    onClick={() => void pedirBorrado(t)}
                    className={botonIcono}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </span>
              </div>
            </FilaEtiqueta>
          );
        })}
        {tipos.length === 0 && <li className="text-sm text-muted-foreground">No hay tipos.</li>}
      </ul>

      <Dialog
        open={Boolean(aBorrar)}
        onOpenChange={(v) => {
          if (!v && !borrando) setABorrar(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar tipo</DialogTitle>
            <DialogDescription>
              {aBorrar && `«${aBorrar.nombre}» no está asignado a ningún caso ni tarea. Esta acción no se puede deshacer.`}
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
