"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { DateRange } from "react-day-picker";
import { format, parseISO } from "date-fns";
import { Search } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateRangePicker } from "@/components/date-range-picker";

const ESTADOS_INTERNOS = ["En curso (asignada)", "Cerrado", "En espera"] as const;
const ESTADOS_PROVEEDOR = ["N/A", "Pendiente", "En revisión", "Resuelto"] as const;

const COLUMNAS_BUSCABLES = [
  { value: "todas", label: "Todas las columnas" },
  { value: "id_glpi", label: "ID GLPI" },
  { value: "titulo", label: "Título" },
  { value: "solicitante", label: "Solicitante" },
  { value: "tecnico_asignado", label: "Técnico asignado" },
  { value: "categoria", label: "Categoría" },
  { value: "ubicacion", label: "Ubicación" },
] as const;

export function CasosFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setParam = useCallback(
    (key: string, value: string | undefined) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams]
  );

  const estadoInterno = searchParams.get("estado_interno") ?? "todos";
  const estadoProveedor = searchParams.get("estado_proveedor") ?? "todos";
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");
  const desdeCierre = searchParams.get("desde_cierre");
  const hastaCierre = searchParams.get("hasta_cierre");
  const columna = searchParams.get("columna") ?? "todas";
  const qParam = searchParams.get("q") ?? "";

  const [q, setQ] = useState(qParam);

  // Mantiene el input sincronizado si la URL cambia por fuera (ej. "Limpiar filtros")
  useEffect(() => {
    setQ(qParam);
  }, [qParam]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (q !== qParam) setParam("q", q || undefined);
    }, 400);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // parseISO (no `new Date(string)`) es obligatorio aquí: un string sin hora
  // ("2026-09-20") se interpreta como medianoche UTC, que en zonas horarias
  // negativas (ej. Colombia, UTC-5) cae en el día anterior en hora local —
  // el calendario mostraría el día seleccionado un día corrido.
  const dateRange: DateRange | undefined =
    desde || hasta
      ? { from: desde ? parseISO(desde) : undefined, to: hasta ? parseISO(hasta) : undefined }
      : undefined;

  const dateRangeCierre: DateRange | undefined =
    desdeCierre || hastaCierre
      ? {
          from: desdeCierre ? parseISO(desdeCierre) : undefined,
          to: hastaCierre ? parseISO(hastaCierre) : undefined,
        }
      : undefined;

  const activeFilterCount = [
    estadoInterno !== "todos",
    estadoProveedor !== "todos",
    Boolean(desde),
    Boolean(hasta),
    Boolean(desdeCierre),
    Boolean(hastaCierre),
    Boolean(qParam),
  ].filter(Boolean).length;

  return (
    // Un solo grupo flex-wrap (en vez de dos grupos independientes, cada uno
    // envolviendo por su cuenta) para que los controles se acomoden juntos
    // según el ancho real disponible, sin el salto de línea a medio camino
    // que se veía en pantallas más angostas. Cada control usa un ancho
    // fluido (min-w + flex-1, tope en max-w) en vez de un ancho fijo, así
    // que se adapta al monitor en vez de forzar el mismo tamaño siempre.
    <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/30 p-3">
      <Select value={columna} onValueChange={(v) => setParam("columna", v === "todas" ? undefined : v)}>
        <SelectTrigger className="w-auto min-w-[160px] flex-1 sm:max-w-[190px]">
          <SelectValue placeholder="Buscar en..." />
        </SelectTrigger>
        <SelectContent>
          {COLUMNAS_BUSCABLES.map((c) => (
            <SelectItem key={c.value} value={c.value}>
              {c.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="relative min-w-[180px] flex-[2] sm:max-w-[260px]">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar..."
          className="pl-8"
        />
      </div>

      <Select value={estadoInterno} onValueChange={(v) => setParam("estado_interno", v === "todos" ? undefined : v)}>
        <SelectTrigger className="w-auto min-w-[170px] flex-1 sm:max-w-[220px]">
          <SelectValue placeholder="Estado interno" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos los estados internos</SelectItem>
          {ESTADOS_INTERNOS.map((estado) => (
            <SelectItem key={estado} value={estado}>
              {estado}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={estadoProveedor}
        onValueChange={(v) => setParam("estado_proveedor", v === "todos" ? undefined : v)}
      >
        <SelectTrigger className="w-auto min-w-[170px] flex-1 sm:max-w-[220px]">
          <SelectValue placeholder="Estado proveedor" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos los estados proveedor</SelectItem>
          {ESTADOS_PROVEEDOR.map((estado) => (
            <SelectItem key={estado} value={estado}>
              {estado}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <DateRangePicker
        className="w-auto min-w-[170px] flex-1 sm:max-w-[220px]"
        value={dateRange}
        placeholder="Fecha de apertura"
        onChange={(range) => {
          const params = new URLSearchParams(searchParams.toString());
          if (range?.from) {
            params.set("desde", format(range.from, "yyyy-MM-dd"));
          } else {
            params.delete("desde");
          }
          if (range?.to) {
            params.set("hasta", format(range.to, "yyyy-MM-dd"));
          } else {
            params.delete("hasta");
          }
          router.push(`${pathname}?${params.toString()}`);
        }}
      />

      <DateRangePicker
        className="w-auto min-w-[170px] flex-1 sm:max-w-[220px]"
        value={dateRangeCierre}
        placeholder="Fecha de cierre"
        onChange={(range) => {
          const params = new URLSearchParams(searchParams.toString());
          if (range?.from) {
            params.set("desde_cierre", format(range.from, "yyyy-MM-dd"));
          } else {
            params.delete("desde_cierre");
          }
          if (range?.to) {
            params.set("hasta_cierre", format(range.to, "yyyy-MM-dd"));
          } else {
            params.delete("hasta_cierre");
          }
          router.push(`${pathname}?${params.toString()}`);
        }}
      />

      {activeFilterCount > 0 && (
        <Button variant="ghost" className="ml-auto" onClick={() => router.push(pathname)}>
          Limpiar filtros ({activeFilterCount})
        </Button>
      )}
    </div>
  );
}
