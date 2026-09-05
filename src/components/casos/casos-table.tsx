"use client";

import { useEffect, useState, useTransition } from "react";
import { format } from "date-fns";
import { toast } from "sonner";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Caso, EstadoProveedor } from "@/lib/supabase/types";
import { updateCasoProveedor } from "@/app/casos/actions";

const ESTADOS_PROVEEDOR: EstadoProveedor[] = ["N/A", "Pendiente", "En revisión", "Resuelto"];

const ESTADO_INTERNO_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  "En curso (asignada)": "default",
  "En espera": "secondary",
  Cerrado: "outline",
};

const ESTADO_PROVEEDOR_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  "N/A": "outline",
  Pendiente: "secondary",
  "En revisión": "secondary",
  Resuelto: "default",
};

function formatFecha(value: string | null) {
  if (!value) return "—";
  try {
    return format(new Date(value), "dd/MM/yyyy");
  } catch {
    return value;
  }
}

// El export de GLPI a veces trae "<br>" literal cuando hay varios valores en una celda
// (ej. varios técnicos asignados). Se normaliza a ", " para que se lea como texto plano.
function cleanText(value: string | null) {
  if (!value) return "—";
  return value.replace(/\s*<br\s*\/?>\s*/gi, ", ");
}

export function CasosTable({ casos }: { casos: Caso[] }) {
  const [rows, setRows] = useState(casos);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setRows(casos);
  }, [casos]);

  function persist(id: string, data: Parameters<typeof updateCasoProveedor>[1]) {
    startTransition(async () => {
      try {
        await updateCasoProveedor(id, data);
        toast.success("Caso actualizado");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error al actualizar el caso");
      }
    });
  }

  function handleEscaladoChange(id: string, value: string) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, caso_escalado_proveedor: value } : r)));
  }

  function handleEscaladoBlur(id: string, value: string) {
    persist(id, { caso_escalado_proveedor: value || null });
  }

  function handleEstadoProveedorChange(id: string, value: EstadoProveedor) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, estado_proveedor: value } : r)));
    persist(id, { estado_proveedor: value });
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center text-sm text-muted-foreground">
        No hay casos que coincidan con los filtros. Importa un XLSX o ajusta los filtros.
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID GLPI</TableHead>
            <TableHead>Título</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Categoría</TableHead>
            <TableHead>Solicitante</TableHead>
            <TableHead>Técnico</TableHead>
            <TableHead>F. Apertura</TableHead>
            <TableHead>F. Cierre</TableHead>
            <TableHead>Urgencia</TableHead>
            <TableHead className="min-w-[180px]">Caso escalado proveedor</TableHead>
            <TableHead className="min-w-[160px]">Estado proveedor</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((caso) => (
            <TableRow key={caso.id}>
              <TableCell className="font-mono text-xs">{caso.id_glpi}</TableCell>
              <TableCell className="max-w-[260px] truncate" title={caso.titulo ?? ""}>
                {caso.titulo ?? "—"}
              </TableCell>
              <TableCell>
                <Badge variant={ESTADO_INTERNO_VARIANT[caso.estado_interno] ?? "outline"}>
                  {caso.estado_interno}
                </Badge>
              </TableCell>
              <TableCell className="max-w-[220px] truncate" title={caso.categoria ?? ""}>
                {cleanText(caso.categoria)}
              </TableCell>
              <TableCell className="max-w-[180px] truncate" title={caso.solicitante ?? ""}>
                {cleanText(caso.solicitante)}
              </TableCell>
              <TableCell
                className="max-w-[180px] truncate"
                title={caso.tecnico_asignado?.replace(/\s*<br\s*\/?>\s*/gi, ", ") ?? ""}
              >
                {cleanText(caso.tecnico_asignado)}
              </TableCell>
              <TableCell>{formatFecha(caso.fecha_apertura)}</TableCell>
              <TableCell>{formatFecha(caso.fecha_cierre)}</TableCell>
              <TableCell>{caso.urgencia ?? "—"}</TableCell>
              <TableCell>
                <Input
                  defaultValue={caso.caso_escalado_proveedor ?? ""}
                  placeholder="Ref. ticket proveedor"
                  disabled={isPending}
                  onChange={(e) => handleEscaladoChange(caso.id, e.target.value)}
                  onBlur={(e) => handleEscaladoBlur(caso.id, e.target.value)}
                />
              </TableCell>
              <TableCell>
                <Select
                  value={caso.estado_proveedor ?? "N/A"}
                  onValueChange={(v) => handleEstadoProveedorChange(caso.id, v as EstadoProveedor)}
                  disabled={isPending}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ESTADOS_PROVEEDOR.map((estado) => (
                      <SelectItem key={estado} value={estado}>
                        <Badge variant={ESTADO_PROVEEDOR_VARIANT[estado]}>{estado}</Badge>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
