"use client";

import { useState, type ReactNode } from "react";
import { Check, Pencil, X } from "lucide-react";
import { EtiquetaBadge } from "@/components/etiquetas/etiqueta-badge";
import { SelectorColor } from "@/components/etiquetas/selector-color";
import { cn } from "@/lib/utils";

export type Uso = { casos: number; tareas: number };

export function textoUso(uso: Uso): string {
  return `${uso.casos} ${uso.casos === 1 ? "caso" : "casos"} · ${uso.tareas} ${uso.tareas === 1 ? "tarea" : "tareas"}`;
}

export const claseBotonPeligro =
  "h-9 rounded-md bg-destructive px-4 text-sm text-destructive-foreground hover:bg-destructive/90 disabled:opacity-60";

// Fila común de tipos y módulos: badge, nombre editable en línea, color, uso y acciones extra.
// El borrador del nombre vive aquí, así un refresco de las props no pisa la edición en curso.
export function FilaEtiqueta({
  id,
  nombre,
  color,
  uso,
  inactivo,
  onRenombrar,
  onColor,
  children,
}: {
  id: string;
  nombre: string;
  color: string | null;
  uso: Uso;
  inactivo?: boolean;
  onRenombrar: (nombre: string) => Promise<boolean>;
  onColor: (color: string) => void;
  children?: ReactNode;
}) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState("");
  const [guardando, setGuardando] = useState(false);

  function empezar() {
    setTexto(nombre);
    setEditando(true);
  }

  async function guardar() {
    if (guardando) return;
    const limpio = texto.trim();
    if (limpio === nombre) {
      setEditando(false);
      return;
    }
    setGuardando(true);
    const ok = await onRenombrar(limpio);
    setGuardando(false);
    if (ok) setEditando(false);
  }

  return (
    <li
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-md border px-3 py-2",
        inactivo && "opacity-60"
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {editando ? (
          <>
            <input
              autoFocus
              value={texto}
              maxLength={80}
              disabled={guardando}
              aria-label="Nombre"
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void guardar();
                } else if (e.key === "Escape") {
                  setEditando(false);
                }
              }}
              className="h-8 w-56 rounded-md border bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <button
              type="button"
              aria-label="Guardar nombre"
              disabled={guardando}
              onClick={() => void guardar()}
              className="flex h-8 w-8 items-center justify-center rounded-md border hover:bg-muted disabled:opacity-60"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Cancelar edición"
              disabled={guardando}
              onClick={() => setEditando(false)}
              className="flex h-8 w-8 items-center justify-center rounded-md border hover:bg-muted disabled:opacity-60"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        ) : (
          <>
            <EtiquetaBadge nombre={nombre} clave={color} fallbackId={id} className="max-w-[260px]" />
            {inactivo && (
              <span className="rounded border px-1.5 py-0.5 text-xs text-muted-foreground">Inactivo</span>
            )}
            <button
              type="button"
              aria-label={`Renombrar ${nombre}`}
              onClick={empezar}
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
            >
              <Pencil className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
      <SelectorColor valor={color} onChange={onColor} />
      <span className="w-36 text-sm tabular-nums text-muted-foreground">{textoUso(uso)}</span>
      {children}
    </li>
  );
}
