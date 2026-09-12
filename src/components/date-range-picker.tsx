"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { format, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import type { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface DateRangePickerProps {
  value: DateRange | undefined;
  onChange: (range: DateRange | undefined) => void;
  className?: string;
  placeholder?: string;
}

export function DateRangePicker({
  value,
  onChange,
  className,
  placeholder = "Rango de fechas",
}: DateRangePickerProps) {
  // `value` viene de la URL (searchParams) y solo se actualiza después de un
  // round-trip al servidor tras cada onChange. Si se compara contra `value`
  // directamente, un segundo clic rápido (antes de que ese round-trip
  // termine) compara contra un estado desactualizado y el "clic de nuevo
  // para deseleccionar" deja de funcionar. Se mantiene una copia local que
  // se actualiza al instante en cada selección, y se resincroniza con
  // `value` solo cuando cambia por fuera (ej. "Limpiar filtros").
  const [local, setLocal] = React.useState(value);
  React.useEffect(() => setLocal(value), [value]);

  // react-day-picker en modo "range" no deselecciona un día único al hacer
  // clic de nuevo sobre él — reinicia el rango desde ese mismo día en vez de
  // vaciarlo. Se intercepta ese caso puntual para que sí limpie la selección.
  function handleSelect(range: DateRange | undefined) {
    const eraUnDia = local?.from && local.to && isSameDay(local.from, local.to);
    const clicMismoDia = eraUnDia && range?.from && !range.to && isSameDay(range.from, local.from!);
    const next = clicMismoDia ? undefined : range;
    setLocal(next);
    onChange(next);
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-[260px] justify-start text-left font-normal",
            !local?.from && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {local?.from ? (
            local.to ? (
              <>
                {format(local.from, "dd/MM/yyyy", { locale: es })} -{" "}
                {format(local.to, "dd/MM/yyyy", { locale: es })}
              </>
            ) : (
              format(local.from, "dd/MM/yyyy", { locale: es })
            )
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          defaultMonth={local?.from}
          selected={local}
          onSelect={handleSelect}
          numberOfMonths={2}
        />
      </PopoverContent>
    </Popover>
  );
}
