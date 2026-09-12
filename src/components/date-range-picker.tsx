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
  // react-day-picker en modo "range" no deselecciona un día único al hacer
  // clic de nuevo sobre él — reinicia el rango desde ese mismo día en vez de
  // vaciarlo. Se intercepta ese caso puntual para que sí limpie la selección.
  function handleSelect(range: DateRange | undefined) {
    const eraUnDia = value?.from && value.to && isSameDay(value.from, value.to);
    const clicMismoDia = eraUnDia && range?.from && !range.to && isSameDay(range.from, value.from!);
    onChange(clicMismoDia ? undefined : range);
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-[260px] justify-start text-left font-normal",
            !value?.from && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value?.from ? (
            value.to ? (
              <>
                {format(value.from, "dd/MM/yyyy", { locale: es })} -{" "}
                {format(value.to, "dd/MM/yyyy", { locale: es })}
              </>
            ) : (
              format(value.from, "dd/MM/yyyy", { locale: es })
            )
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          defaultMonth={value?.from}
          selected={value}
          onSelect={handleSelect}
          numberOfMonths={2}
        />
      </PopoverContent>
    </Popover>
  );
}
