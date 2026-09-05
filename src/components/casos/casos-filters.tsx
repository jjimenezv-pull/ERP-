"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { DateRange } from "react-day-picker";
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

  const dateRange: DateRange | undefined =
    desde || hasta
      ? { from: desde ? new Date(desde) : undefined, to: hasta ? new Date(hasta) : undefined }
      : undefined;

  const hasFilters =
    estadoInterno !== "todos" || estadoProveedor !== "todos" || desde || hasta || qParam;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={columna} onValueChange={(v) => setParam("columna", v === "todas" ? undefined : v)}>
          <SelectTrigger className="w-[190px]">
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

        <div className="relative w-[260px]">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar..."
            className="pl-8"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={estadoInterno} onValueChange={(v) => setParam("estado_interno", v === "todos" ? undefined : v)}>
          <SelectTrigger className="w-[220px]">
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
          <SelectTrigger className="w-[220px]">
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
          value={dateRange}
          placeholder="Fecha de apertura"
          onChange={(range) => {
            const params = new URLSearchParams(searchParams.toString());
            if (range?.from) {
              params.set("desde", range.from.toISOString().slice(0, 10));
            } else {
              params.delete("desde");
            }
            if (range?.to) {
              params.set("hasta", range.to.toISOString().slice(0, 10));
            } else {
              params.delete("hasta");
            }
            router.push(`${pathname}?${params.toString()}`);
          }}
        />

        {hasFilters && (
          <Button variant="ghost" onClick={() => router.push(pathname)}>
            Limpiar filtros
          </Button>
        )}
      </div>
    </div>
  );
}
