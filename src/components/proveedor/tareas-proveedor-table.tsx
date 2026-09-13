"use client";

import { format, parseISO } from "date-fns";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { CasoProveedor } from "@/lib/supabase/types";

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

export function TareasProveedorTable({ tareas }: { tareas: CasoProveedor[] }) {
  if (tareas.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center text-sm text-muted-foreground">
        No hay tareas importadas todavía.
      </div>
    );
  }

  return (
    <Table containerClassName="max-h-[50vh] rounded-md border">
      <TableHeader className="sticky top-0 z-10 bg-background">
        <TableRow>
          <TableHead>ID tarea</TableHead>
          <TableHead>Asunto</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Asignatario</TableHead>
          <TableHead>Proyecto</TableHead>
          <TableHead>F. inicio</TableHead>
          <TableHead>F. fin</TableHead>
          <TableHead>% Realizado</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tareas.map((tarea) => (
          <TableRow key={tarea.id}>
            <TableCell className="font-mono text-xs">{tarea.id_tarea}</TableCell>
            <TableCell className="max-w-[280px] truncate" title={tarea.asunto ?? ""}>
              {tarea.asunto ?? "—"}
            </TableCell>
            <TableCell>
              {tarea.estado ? <Badge variant="outline">{tarea.estado}</Badge> : "—"}
            </TableCell>
            <TableCell className="max-w-[200px] truncate" title={tarea.asignatario ?? ""}>
              {tarea.asignatario ?? "—"}
            </TableCell>
            <TableCell className="max-w-[220px] truncate" title={tarea.proyecto ?? ""}>
              {tarea.proyecto ?? "—"}
            </TableCell>
            <TableCell>{formatFecha(tarea.fecha_inicio)}</TableCell>
            <TableCell>{formatFecha(tarea.fecha_fin)}</TableCell>
            <TableCell>{tarea.porcentaje_realizado ?? "—"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
