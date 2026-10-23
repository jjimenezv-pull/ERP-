"use client";

import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { GRUPOS_COLOR, claseEtiqueta, esColorValido } from "@/lib/etiquetas";
import { cn } from "@/lib/utils";

// Selector de color de la paleta cerrada: botón con el color actual y, en popover,
// la cuadrícula de 30 colores agrupada por tono. Cada swatch es un botón (Tab/Enter/Espacio).
export function SelectorColor({
  valor,
  onChange,
  disabled,
}: {
  valor: string | null | undefined;
  onChange: (clave: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const actual = valor && esColorValido(valor) ? valor : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label={actual ? `Color ${actual}, cambiar` : "Elegir color"}
          className="flex h-8 items-center gap-2 rounded-md border bg-background px-2 text-sm hover:bg-muted disabled:opacity-60"
        >
          <span
            aria-hidden
            className={cn("h-4 w-4 shrink-0 rounded-full border", claseEtiqueta(actual))}
          />
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-3">
        <div className="space-y-3">
          {GRUPOS_COLOR.map((grupo) => (
            <div key={grupo.nombre} role="group" aria-label={grupo.nombre}>
              <p className="mb-1 text-xs text-muted-foreground">{grupo.nombre}</p>
              <div className="flex flex-wrap gap-1.5">
                {grupo.claves.map((clave) => (
                  <button
                    key={clave}
                    type="button"
                    aria-label={`Color ${clave}, ${grupo.nombre}`}
                    aria-pressed={clave === actual}
                    onClick={() => {
                      onChange(clave);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full border outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                      claseEtiqueta(clave)
                    )}
                  >
                    {clave === actual && <Check className="h-4 w-4" aria-hidden />}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
