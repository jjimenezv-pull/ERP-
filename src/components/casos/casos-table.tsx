"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
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
import { cn } from "@/lib/utils";

const ESTADOS_PROVEEDOR: EstadoProveedor[] = ["N/A", "Pendiente", "En revisión", "Resuelto"];

const ESTADO_INTERNO_CLASS: Record<string, string> = {
  "En espera": "border-transparent bg-[var(--status-espera)] text-[var(--status-espera-foreground)]",
  "En curso (asignada)": "border-transparent bg-[var(--status-curso)] text-[var(--status-curso-foreground)]",
  Cerrado: "border-transparent bg-[var(--status-cerrado)] text-[var(--status-cerrado-foreground)]",
};

const ESTADO_PROVEEDOR_CLASS: Record<string, string> = {
  "N/A": "",
  Pendiente: "border-transparent bg-[var(--status-espera)] text-[var(--status-espera-foreground)]",
  "En revisión": "border-transparent bg-[var(--status-revision)] text-[var(--status-revision-foreground)]",
  Resuelto: "border-transparent bg-[var(--status-curso)] text-[var(--status-curso-foreground)]",
};

// Whitelist de columnas ordenables: debe coincidir con la de src/app/casos/page.tsx.
const SORTABLE_COLUMNS = [
  "id_glpi",
  "titulo",
  "estado_interno",
  "categoria",
  "solicitante",
  "tecnico_asignado",
  "fecha_apertura",
  "fecha_cierre",
  "urgencia",
  "estado_proveedor",
] as const;

type SortableColumn = (typeof SORTABLE_COLUMNS)[number];
type OrderDir = "asc" | "desc";

const DEFAULT_ORDER_BY: SortableColumn = "fecha_apertura";
const DEFAULT_ORDER_DIR: OrderDir = "desc";

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

function SortableHead({
  column,
  orderBy,
  orderDir,
  onSort,
  className,
  children,
}: {
  column: SortableColumn;
  orderBy: SortableColumn;
  orderDir: OrderDir;
  onSort: (column: SortableColumn) => void;
  className?: string;
  children: React.ReactNode;
}) {
  const active = orderBy === column;
  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => onSort(column)}
        className="flex items-center gap-1 whitespace-nowrap font-medium text-muted-foreground hover:text-foreground"
      >
        {children}
        {active ? (
          orderDir === "asc" ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )
        ) : (
          <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/40" />
        )}
      </button>
    </TableHead>
  );
}

export function CasosTable({ casos }: { casos: Caso[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [rows, setRows] = useState(casos);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setRows(casos);
  }, [casos]);

  const orderByParam = searchParams.get("orderBy");
  const orderBy: SortableColumn = (SORTABLE_COLUMNS as readonly string[]).includes(orderByParam ?? "")
    ? (orderByParam as SortableColumn)
    : DEFAULT_ORDER_BY;
  const orderDir: OrderDir = searchParams.get("orderDir") === "asc" ? "asc" : DEFAULT_ORDER_DIR;

  function handleSort(column: SortableColumn) {
    const params = new URLSearchParams(searchParams.toString());
    if (orderBy === column) {
      params.set("orderDir", orderDir === "asc" ? "desc" : "asc");
    } else {
      params.set("orderBy", column);
      params.set("orderDir", "desc");
    }
    router.push(`${pathname}?${params.toString()}`);
  }

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
    <Table containerClassName="max-h-[70vh] rounded-md border">
      <TableHeader className="sticky top-0 z-10 bg-background">
          <TableRow>
            <SortableHead column="id_glpi" orderBy={orderBy} orderDir={orderDir} onSort={handleSort}>
              ID GLPI
            </SortableHead>
            <SortableHead column="titulo" orderBy={orderBy} orderDir={orderDir} onSort={handleSort}>
              Título
            </SortableHead>
            <SortableHead column="estado_interno" orderBy={orderBy} orderDir={orderDir} onSort={handleSort}>
              Estado
            </SortableHead>
            <SortableHead column="categoria" orderBy={orderBy} orderDir={orderDir} onSort={handleSort}>
              Categoría
            </SortableHead>
            <SortableHead column="solicitante" orderBy={orderBy} orderDir={orderDir} onSort={handleSort}>
              Solicitante
            </SortableHead>
            <SortableHead column="tecnico_asignado" orderBy={orderBy} orderDir={orderDir} onSort={handleSort}>
              Técnico
            </SortableHead>
            <SortableHead column="fecha_apertura" orderBy={orderBy} orderDir={orderDir} onSort={handleSort}>
              F. Apertura
            </SortableHead>
            <SortableHead column="fecha_cierre" orderBy={orderBy} orderDir={orderDir} onSort={handleSort}>
              F. Cierre
            </SortableHead>
            <SortableHead column="urgencia" orderBy={orderBy} orderDir={orderDir} onSort={handleSort}>
              Urgencia
            </SortableHead>
            <TableHead className="min-w-[180px]">Caso escalado proveedor</TableHead>
            <SortableHead
              column="estado_proveedor"
              orderBy={orderBy}
              orderDir={orderDir}
              onSort={handleSort}
              className="min-w-[160px]"
            >
              Estado proveedor
            </SortableHead>
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
                <Badge
                  variant="outline"
                  className={cn(ESTADO_INTERNO_CLASS[caso.estado_interno])}
                >
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
                        <Badge variant="outline" className={cn(ESTADO_PROVEEDOR_CLASS[estado])}>
                          {estado}
                        </Badge>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
  );
}
