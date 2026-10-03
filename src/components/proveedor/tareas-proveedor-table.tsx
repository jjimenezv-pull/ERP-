"use client";

import { useState, useTransition } from "react";
import { format, parseISO } from "date-fns";
import { ChevronDown, ChevronUp, ChevronsUpDown, Maximize2, Minimize2, Search } from "lucide-react";
import { toast } from "sonner";
import { updateTareasTipo } from "@/app/proveedor/import-actions";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { CasoProveedor } from "@/lib/supabase/types";
import type { CasoConEstado } from "@/lib/proveedor/cruce";

const TIPO_CLASS: Record<string, string> = {
  "Requerimiento": "border-transparent bg-[#1a3d96] text-white",
  "Incidencia":    "border-transparent bg-[#ea580c] text-white",
};

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

const ESTADOS_TAREA = ["En Desarrollo", "En Revision", "Pendiente Cliente", "Cerrada", "Caducada"] as const;

type SortKey = "id_tarea" | "asunto" | "estado" | "fecha_inicio" | "fecha_fin" | "porcentaje_realizado";

function SortableHead({
  sortKey,
  current,
  dir,
  onSort,
  className,
  children,
}: {
  sortKey: SortKey;
  current: SortKey | null;
  dir: "asc" | "desc";
  onSort: (k: SortKey) => void;
  className?: string;
  children: React.ReactNode;
}) {
  const active = current === sortKey;
  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="flex items-center gap-1 whitespace-nowrap font-medium text-white/75 hover:text-white"
      >
        {children}
        {active ? (
          dir === "asc" ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />
        ) : (
          <ChevronsUpDown className="h-3.5 w-3.5 text-white/30" />
        )}
      </button>
    </TableHead>
  );
}

export function TareasProveedorTable({
  tareas,
  casosGlpi = [],
  canEdit = false,
}: {
  tareas: CasoProveedor[];
  casosGlpi?: CasoConEstado[];
  canEdit?: boolean;
}) {
  const [compact, setCompact] = useState(false);
  const [filterEstado, setFilterEstado] = useState("todos");
  const [filterQ, setFilterQ] = useState("");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [rows, setRows] = useState(tareas);
  const [selectedIds, setSelectedIds] = useState(new Set<string>());
  const [isPending, startTransition] = useTransition();

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function handleBulkTipo(tipo: string | null) {
    const ids = Array.from(selectedIds);
    setRows((prev) => prev.map((r) => selectedIds.has(r.id) ? { ...r, tipo } : r));
    setSelectedIds(new Set());
    startTransition(async () => {
      try {
        await updateTareasTipo(ids, tipo);
        toast.success(tipo ? `Marcados como ${tipo}` : "Tipo eliminado");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error al actualizar");
      }
    });
  }

  const filtered = rows
    .filter((t) => filterEstado === "todos" || t.estado === filterEstado)
    .filter((t) => {
      if (!filterQ) return true;
      const q = filterQ.toLowerCase();
      return (
        t.asunto?.toLowerCase().includes(q) ||
        String(t.id_tarea).includes(q) ||
        t.asignatario?.toLowerCase().includes(q)
      );
    });

  const sorted = sortKey
    ? [...filtered].sort((a, b) => {
        const va = a[sortKey] ?? "";
        const vb = b[sortKey] ?? "";
        const cmp = typeof va === "number" && typeof vb === "number"
          ? va - vb
          : String(va).localeCompare(String(vb), "es", { numeric: true });
        return sortDir === "asc" ? cmp : -cmp;
      })
    : filtered;

  if (rows.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center text-sm text-muted-foreground">
        No hay tareas importadas todavía.
      </div>
    );
  }

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 p-2">
        <div className="relative min-w-[180px] flex-[2] sm:max-w-[260px]">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filterQ}
            onChange={(e) => setFilterQ(e.target.value)}
            placeholder="Buscar..."
            className="pl-8 h-9"
          />
        </div>
        <Select value={filterEstado} onValueChange={setFilterEstado}>
          <SelectTrigger className="w-auto min-w-[170px] flex-1 sm:max-w-[220px] h-9">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            {ESTADOS_TAREA.map((e) => (
              <SelectItem key={e} value={e}>{e}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <button
          type="button"
          onClick={() => setCompact((v) => !v)}
          className="shrink-0 rounded-md border p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          title={compact ? "Vista normal" : "Ajustar columnas"}
        >
          {compact ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
        </button>
        {(filterEstado !== "todos" || filterQ) && (
          <button
            type="button"
            onClick={() => { setFilterEstado("todos"); setFilterQ(""); }}
            className="ml-auto text-sm text-muted-foreground hover:text-foreground"
          >
            Limpiar filtros
          </button>
        )}
      </div>
    <div className={cn(compact && "[&_td]:py-[3px] [&_td]:px-1.5 [&_td]:text-[11px] [&_th]:py-[5px] [&_th]:px-1.5")}>
    <Table containerClassName="max-h-[50vh] rounded-md border">
      <TableHeader className="sticky top-0 z-10 bg-[#1a3d96]">
        <TableRow>
          {canEdit && (
            <TableHead className="w-8 px-2">
              <input
                type="checkbox"
                className="rounded border-white/40 bg-transparent"
                checked={rows.length > 0 && selectedIds.size === rows.length}
                onChange={(e) => setSelectedIds(e.target.checked ? new Set(rows.map((r) => r.id)) : new Set())}
                aria-label="Seleccionar todos"
              />
            </TableHead>
          )}
          <TableHead className="text-white">Caso GLPI</TableHead>
          <SortableHead sortKey="id_tarea" current={sortKey} dir={sortDir} onSort={handleSort}>ID tarea</SortableHead>
          <SortableHead sortKey="asunto" current={sortKey} dir={sortDir} onSort={handleSort}>Asunto</SortableHead>
          <SortableHead sortKey="estado" current={sortKey} dir={sortDir} onSort={handleSort}>Estado</SortableHead>
          <TableHead className="text-white">Asignatario</TableHead>
          <TableHead className="text-white">Proyecto</TableHead>
          <SortableHead sortKey="fecha_inicio" current={sortKey} dir={sortDir} onSort={handleSort}>F. inicio</SortableHead>
          <SortableHead sortKey="fecha_fin" current={sortKey} dir={sortDir} onSort={handleSort}>F. fin</SortableHead>
          <SortableHead sortKey="porcentaje_realizado" current={sortKey} dir={sortDir} onSort={handleSort}>% Realizado</SortableHead>
          <TableHead className="text-white">Tipo</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((tarea) => {
          const casoGlpi = casosGlpi.find(
            (c) => c.caso_escalado_proveedor?.trim() === String(tarea.id_tarea)
          );
          return (
            <TableRow key={tarea.id} className={cn(selectedIds.has(tarea.id) && "bg-muted/50")}>
              {canEdit && (
                <TableCell className="px-2">
                  <input
                    type="checkbox"
                    className="rounded"
                    checked={selectedIds.has(tarea.id)}
                    onChange={(e) => {
                      setSelectedIds((prev) => {
                        const next = new Set(prev);
                        if (e.target.checked) next.add(tarea.id);
                        else next.delete(tarea.id);
                        return next;
                      });
                    }}
                    aria-label="Seleccionar"
                  />
                </TableCell>
              )}
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
              <TableCell>
                {tarea.tipo ? (
                  <Badge variant="outline" className={cn(TIPO_CLASS[tarea.tipo] ?? "border-dashed text-muted-foreground")}>
                    {tarea.tipo}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground text-xs">—</span>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
    </div>

      {canEdit && selectedIds.size > 0 && (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 flex items-center gap-3 rounded-xl border bg-background px-5 py-3 shadow-lg">
          <span className="text-sm font-medium">
            {selectedIds.size} tarea{selectedIds.size !== 1 ? "s" : ""} seleccionada{selectedIds.size !== 1 ? "s" : ""}
          </span>
          <span className="text-muted-foreground">·</span>
          <span className="text-sm text-muted-foreground">Marcar como</span>
          <button
            type="button"
            onClick={() => handleBulkTipo("Requerimiento")}
            disabled={isPending}
            className="rounded-md bg-[#1a3d96] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#1a3d96]/90 disabled:opacity-60"
          >
            Requerimiento
          </button>
          <button
            type="button"
            onClick={() => handleBulkTipo("Incidencia")}
            disabled={isPending}
            className="rounded-md bg-[#ea580c] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#ea580c]/90 disabled:opacity-60"
          >
            Incidencia
          </button>
          <button
            type="button"
            onClick={() => handleBulkTipo(null)}
            disabled={isPending}
            className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-60"
          >
            Sin clasificar
          </button>
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="ml-1 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Cancelar selección"
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}
