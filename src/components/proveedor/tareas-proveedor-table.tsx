"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { Minimize2, Maximize2 } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CasoProveedor } from "@/lib/supabase/types";
import type { CasoConEstado } from "@/lib/proveedor/cruce";

const ESTADO_TAREA_CLASS: Record<string, string> = {
  "En Desarrollo":     "border-transparent bg-[#1d4ed8] text-white",
  "En Revision":       "border-transparent bg-[#d97706] text-white",
  "Pendiente Cliente": "border-transparent bg-[#c2410c] text-white",
  "Cerrada":           "border-transparent bg-[#475569] text-white",
  "Caducada":          "border-transparent bg-[#94a3b8] text-white",
};

function shortProyecto(proyecto: string | null): string {
  if (!proyecto) return "—";
  // "Category > Subcategory" → last segment
  if (proyecto.includes(" > ")) return proyecto.split(" > ").pop() ?? proyecto;
  // "?? NNNNN Client - Provider ServiceType" → strip to "ServiceType"
  const dashIdx = proyecto.indexOf(" - ");
  if (dashIdx !== -1) {
    const afterDash = proyecto.slice(dashIdx + 3);
    const spaceIdx = afterDash.indexOf(" ");
    if (spaceIdx !== -1 && spaceIdx < 30) {
      const service = afterDash.slice(spaceIdx + 1).trim();
      if (service) return service;
    }
    return afterDash.trim();
  }
  return proyecto.replace(/^\?+\s*\d*\s*/, "").trim() || proyecto;
}

function formatFecha(value: string | null) {
  if (!value) return "—";
  try {
    // parseISO evita el corrimiento de un día que da `new Date("yyyy-MM-dd")`
    // (lo interpreta como UTC) al formatear en una zona horaria negativa.
    return format(parseISO(value), "dd/MM/yyyy");
  } catch {
    return value;
  }
}

export function TareasProveedorTable({
  tareas,
  casosGlpi = [],
}: {
  tareas: CasoProveedor[];
  casosGlpi?: CasoConEstado[];
}) {
  const [compact, setCompact] = useState(false);

  if (tareas.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center text-sm text-muted-foreground">
        No hay tareas importadas todavía.
      </div>
    );
  }

  return (
    <>
      <div className="mb-1 flex justify-end">
        <button
          type="button"
          onClick={() => setCompact(!compact)}
          className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
          title={compact ? "Vista normal" : "Ajustar columnas"}
        >
          {compact ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
          {compact ? "Vista normal" : "Ajustar columnas"}
        </button>
      </div>
    <div className={cn(compact && "[&_td]:py-[3px] [&_td]:px-1.5 [&_td]:text-[11px] [&_th]:py-[5px] [&_th]:px-1.5")}>
    <Table containerClassName="max-h-[50vh] rounded-md border">
      <TableHeader className="sticky top-0 z-10 bg-[#1a3d96]">
        <TableRow>
          <TableHead className="text-white">Caso GLPI</TableHead>
          <TableHead className="text-white">ID tarea</TableHead>
          <TableHead className="text-white">Asunto</TableHead>
          <TableHead className="text-white">Estado</TableHead>
          <TableHead className="text-white">Asignatario</TableHead>
          <TableHead className="text-white">Proyecto</TableHead>
          <TableHead className="text-white">F. inicio</TableHead>
          <TableHead className="text-white">F. fin</TableHead>
          <TableHead className="text-white">% Realizado</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tareas.map((tarea) => {
          const casoGlpi = casosGlpi.find(
            (c) => c.caso_escalado_proveedor?.trim() === String(tarea.id_tarea)
          );
          return (
            <TableRow key={tarea.id}>
              <TableCell>
                {casoGlpi ? (
                  <span className="font-mono text-xs" title={casoGlpi.titulo ?? ""}>
                    {casoGlpi.id_glpi}
                  </span>
                ) : (
                  <span className="text-muted-foreground text-xs">—</span>
                )}
              </TableCell>
              <TableCell className="font-mono text-xs">{tarea.id_tarea}</TableCell>
              <TableCell className={cn("truncate", compact ? "max-w-[140px]" : "max-w-[280px]")} title={tarea.asunto ?? ""}>
                {tarea.asunto ?? "—"}
              </TableCell>
              <TableCell>
                {tarea.estado ? (
                  <Badge variant="outline" className={cn(ESTADO_TAREA_CLASS[tarea.estado] ?? "")}>
                    {tarea.estado}
                  </Badge>
                ) : "—"}
              </TableCell>
              <TableCell className={cn("truncate", compact ? "max-w-[100px]" : "max-w-[200px]")} title={tarea.asignatario ?? ""}>
                {tarea.asignatario ?? "—"}
              </TableCell>
              <TableCell className={cn("truncate", compact ? "max-w-[100px]" : "max-w-[200px]")} title={tarea.proyecto ?? ""}>
                {shortProyecto(tarea.proyecto)}
              </TableCell>
              <TableCell>{formatFecha(tarea.fecha_inicio)}</TableCell>
              <TableCell>{formatFecha(tarea.fecha_fin)}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2 min-w-[80px]">
                  <div className="h-2 w-16 flex-shrink-0 overflow-hidden rounded-full border border-border bg-muted">
                    <div
                      className="h-full rounded-full bg-[#1a3d96]"
                      style={{ width: `${tarea.porcentaje_realizado ?? 0}%` }}
                    />
                  </div>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {tarea.porcentaje_realizado ?? 0}%
                  </span>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
    </div>
    </>
  );
}
