"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { claseEtiqueta } from "@/lib/etiquetas";
import type { Tipo } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

const SIN_CLASIFICAR = "sin_clasificar";
const QUITAR = "__quitar";

function Punto({ color, id }: { color: string; id: string }) {
  return <span className={cn("mr-2 inline-block h-2 w-2 shrink-0 rounded-full", claseEtiqueta(color, id))} />;
}

// Selector de tipo para el detalle de un caso o tarea. Ofrece solo los tipos
// activos (en orden del catálogo) y «Sin clasificar». Si el valor actual es un tipo
// desactivado, se muestra seleccionado y marcado «(inactivo)» para no perderlo de vista.
export function TipoSelect({
  tipos,
  value,
  onChange,
  disabled,
  className,
}: {
  tipos: Tipo[];
  // id del tipo actual (null = sin clasificar).
  value: string | null;
  onChange: (tipoId: string | null) => void;
  disabled?: boolean;
  className?: string;
}) {
  const actual = value ? tipos.find((t) => t.id === value) : undefined;
  const opciones = tipos.filter((t) => t.activo || t.id === value);

  return (
    <Select
      value={value ?? SIN_CLASIFICAR}
      disabled={disabled}
      onValueChange={(v) => onChange(v === SIN_CLASIFICAR ? null : v)}
    >
      <SelectTrigger className={cn("h-8 text-sm", className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={SIN_CLASIFICAR}>Sin clasificar</SelectItem>
        {opciones.map((t) => (
          <SelectItem key={t.id} value={t.id}>
            <span className="flex items-center">
              <Punto color={t.color} id={t.id} />
              {t.nombre}
              {!t.activo && <span className="ml-1 text-muted-foreground">(inactivo)</span>}
            </span>
          </SelectItem>
        ))}
        {/* Valor que ya no está en el catálogo: evita un select vacío. */}
        {value && !actual && <SelectItem value={value}>Tipo desconocido</SelectItem>}
      </SelectContent>
    </Select>
  );
}

// Selector de la barra de acciones en bloque: «Tipo…» con los tipos activos y
// «Quitar tipo». Siempre vuelve a mostrar el texto fijo tras elegir.
export function TipoBulkSelect({
  tipos,
  onChange,
  disabled,
  className,
}: {
  tipos: Tipo[];
  onChange: (tipoId: string | null) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <Select value="" disabled={disabled} onValueChange={(v) => onChange(v === QUITAR ? null : v)}>
      <SelectTrigger className={cn("h-9 w-auto min-w-[110px]", className)} aria-label="Asignar tipo">
        <SelectValue placeholder="Tipo…" />
      </SelectTrigger>
      <SelectContent>
        {tipos
          .filter((t) => t.activo)
          .map((t) => (
            <SelectItem key={t.id} value={t.id}>
              <span className="flex items-center">
                <Punto color={t.color} id={t.id} />
                {t.nombre}
              </span>
            </SelectItem>
          ))}
        <SelectItem value={QUITAR}>Quitar tipo</SelectItem>
      </SelectContent>
    </Select>
  );
}
