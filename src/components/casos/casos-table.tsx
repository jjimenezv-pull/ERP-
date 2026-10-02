"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { format, parseISO } from "date-fns";
import { ChevronDown, ChevronUp, ChevronsUpDown, Eye } from "lucide-react";
import { updateCasosTipo } from "@/app/casos/actions";
import { toast } from "sonner";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CasoConEstado } from "@/lib/proveedor/cruce";
import { updateCasoProveedor } from "@/app/casos/actions";
import { cn } from "@/lib/utils";

const TIPO_CLASS: Record<string, string> = {
  "Requerimiento": "border-transparent bg-[#1a3d96] text-white",
  "Incidencia":    "border-transparent bg-[#ea580c] text-white",
};

const ESTADO_INTERNO_CLASS: Record<string, string> = {
  "En espera": "border-transparent bg-[var(--status-espera)] text-[var(--status-espera-foreground)]",
  "En curso (asignada)": "border-transparent bg-[var(--status-curso)] text-[var(--status-curso-foreground)]",
  Cerrado: "border-transparent bg-[var(--status-cerrado)] text-[var(--status-cerrado-foreground)]",
};

const URGENCIA_CLASS: Record<string, string> = {
  "Muy alta": "border-transparent bg-[var(--urgency-muy-alta)] text-[var(--urgency-muy-alta-fg)]",
  "Alta":     "border-transparent bg-[var(--urgency-alta)] text-[var(--urgency-alta-fg)]",
  "Media":    "border-transparent bg-[var(--urgency-media)] text-[var(--urgency-media-fg)]",
  "Mediana":  "border-transparent bg-[var(--urgency-media)] text-[var(--urgency-media-fg)]",
  "Baja":     "border-transparent bg-[var(--urgency-baja)] text-[var(--urgency-baja-fg)]",
  "Muy baja": "border-transparent bg-[var(--urgency-muy-baja)] text-[var(--urgency-muy-baja-fg)]",
};

// Estados reales de la plataforma del proveedor. Cualquier estado nuevo que
// aparezca en un import cae sin color (badge neutro) hasta que se agregue aquí.
const ESTADO_PROVEEDOR_CLASS: Record<string, string> = {
  "No escalado": "",
  "Sin match": "border-dashed text-muted-foreground",
  "En Desarrollo": "border-transparent bg-[var(--status-curso)] text-[var(--status-curso-foreground)]",
  "En Revision": "border-transparent bg-[var(--status-revision)] text-[var(--status-revision-foreground)]",
  "Pendiente Cliente": "border-transparent bg-[var(--status-espera)] text-[var(--status-espera-foreground)]",
  Cerrada: "border-transparent bg-[var(--status-cerrado)] text-[var(--status-cerrado-foreground)]",
  Caducada: "",
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
    // parseISO evita el corrimiento de un día que da `new Date("yyyy-MM-dd")`
    // (lo interpreta como UTC) al formatear en una zona horaria negativa.
    return format(parseISO(value), "dd/MM/yyyy");
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

function filterBotTecnicos(raw: string | null): string {
  if (!raw) return "—";
  const parts = raw.replace(/\s*<br\s*\/?>\s*/gi, ", ")
    .split(",").map((t) => t.trim()).filter(Boolean);
  const humans = parts.filter((t) => !/chatbot/i.test(t));
  return (humans.length > 0 ? humans : parts).join(", ");
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
        className="flex items-center gap-1 whitespace-nowrap font-medium text-white/75 hover:text-white"
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

export function CasosTable({ casos, canEdit }: { casos: CasoConEstado[]; canEdit: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [rows, setRows] = useState(casos);
  const [isPending, startTransition] = useTransition();
  const [casoDetalle, setCasoDetalle] = useState<CasoConEstado | null>(null);
  const [selectedIds, setSelectedIds] = useState(new Set<string>());
  const compact = !!searchParams.get("compact");
  const [descExpanded, setDescExpanded] = useState(false);
  const [solExpanded, setSolExpanded] = useState(false);

  useEffect(() => {
    setRows(casos);
    setSelectedIds(new Set());
  }, [casos]);

  useEffect(() => {
    setDescExpanded(false);
    setSolExpanded(false);
  }, [casoDetalle]);

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

  function handleBulkTipo(tipo: string | null) {
    const ids = Array.from(selectedIds);
    setRows((prev) => prev.map((r) => selectedIds.has(r.id) ? { ...r, tipo } : r));
    setSelectedIds(new Set());
    startTransition(async () => {
      try {
        await updateCasosTipo(ids, tipo);
        toast.success(tipo ? `Marcados como ${tipo}` : "Tipo eliminado");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error al actualizar");
      }
    });
  }

  function handleEscaladoChange(id: string, value: string) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, caso_escalado_proveedor: value } : r)));
  }

  function handleEscaladoBlur(id: string, value: string) {
    persist(id, { caso_escalado_proveedor: value || null });
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center text-sm text-muted-foreground">
        No hay casos que coincidan con los filtros. Importa un XLSX o ajusta los filtros.
      </div>
    );
  }

  return (
    <>
    <div className={cn(compact && "[&_td]:py-[3px] [&_td]:px-1.5 [&_td]:text-[11px] [&_th]:py-[5px] [&_th]:px-1.5")}>
    <Table containerClassName="max-h-[70vh] rounded-md border">
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
            <TableHead className="w-8"></TableHead>
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
            <TableHead className="text-white">Ubicación</TableHead>
            <SortableHead column="fecha_apertura" orderBy={orderBy} orderDir={orderDir} onSort={handleSort}>
              F. Apertura
            </SortableHead>
            <SortableHead column="fecha_cierre" orderBy={orderBy} orderDir={orderDir} onSort={handleSort}>
              F. Cierre
            </SortableHead>
            <SortableHead column="urgencia" orderBy={orderBy} orderDir={orderDir} onSort={handleSort}>
              Urgencia
            </SortableHead>
            <TableHead className="text-white">Tipo</TableHead>
            <TableHead className={cn(compact ? "min-w-[100px]" : "min-w-[180px]", "text-white")}>Caso escalado proveedor</TableHead>
            <SortableHead
              column="estado_proveedor"
              orderBy={orderBy}
              orderDir={orderDir}
              onSort={handleSort}
              className={compact ? "min-w-[90px]" : "min-w-[160px]"}
            >
              Estado proveedor
            </SortableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((caso) => (
            <TableRow key={caso.id} data-selected={selectedIds.has(caso.id) || undefined} className={cn(selectedIds.has(caso.id) && "bg-muted/50")}>
              {canEdit && (
                <TableCell className="px-2">
                  <input
                    type="checkbox"
                    className="rounded"
                    checked={selectedIds.has(caso.id)}
                    onChange={(e) => {
                      setSelectedIds((prev) => {
                        const next = new Set(prev);
                        e.target.checked ? next.add(caso.id) : next.delete(caso.id);
                        return next;
                      });
                    }}
                    aria-label="Seleccionar"
                  />
                </TableCell>
              )}
              <TableCell>
                <button
                  type="button"
                  onClick={() => setCasoDetalle(caso)}
                  className="text-muted-foreground hover:text-foreground"
                  title="Ver detalle"
                >
                  <Eye className="h-4 w-4" />
                </button>
              </TableCell>
              <TableCell className="font-mono text-xs">{caso.id_glpi}</TableCell>
              <TableCell className={cn("truncate", compact ? "max-w-[120px]" : "max-w-[260px]")} title={caso.titulo ?? ""}>
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
              <TableCell className={cn("truncate", compact ? "max-w-[80px]" : "max-w-[220px]")} title={caso.categoria ?? ""}>
                {caso.categoria ? (caso.categoria.split(" > ").pop() ?? cleanText(caso.categoria)) : "—"}
              </TableCell>
              <TableCell className={cn("truncate", compact ? "max-w-[80px]" : "max-w-[180px]")} title={caso.solicitante ?? ""}>
                {cleanText(caso.solicitante)}
              </TableCell>
              <TableCell
                className={cn("truncate", compact ? "max-w-[80px]" : "max-w-[180px]")}
                title={filterBotTecnicos(caso.tecnico_asignado) === "—" ? "" : filterBotTecnicos(caso.tecnico_asignado)}
              >
                {filterBotTecnicos(caso.tecnico_asignado)}
              </TableCell>
              <TableCell className={cn("truncate", compact ? "max-w-[60px]" : "max-w-[160px]")} title={caso.ubicacion ?? ""}>
                {caso.ubicacion ?? "—"}
              </TableCell>
              <TableCell>{formatFecha(caso.fecha_apertura)}</TableCell>
              <TableCell>{formatFecha(caso.fecha_cierre)}</TableCell>
              <TableCell>
                {caso.urgencia ? (
                  <Badge variant="outline" className={cn(URGENCIA_CLASS[caso.urgencia] ?? "")}>
                    {caso.urgencia}
                  </Badge>
                ) : "—"}
              </TableCell>
              <TableCell>
                {caso.tipo ? (
                  <Badge variant="outline" className={cn(TIPO_CLASS[caso.tipo] ?? "border-dashed text-muted-foreground")}>
                    {caso.tipo}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground text-xs">—</span>
                )}
              </TableCell>
              <TableCell>
                {canEdit ? (
                  <Input
                    defaultValue={caso.caso_escalado_proveedor ?? ""}
                    placeholder="Ref. ticket proveedor"
                    disabled={isPending}
                    onChange={(e) => handleEscaladoChange(caso.id, e.target.value)}
                    onBlur={(e) => handleEscaladoBlur(caso.id, e.target.value)}
                  />
                ) : (
                  <span className="text-sm text-muted-foreground">
                    {caso.caso_escalado_proveedor || "—"}
                  </span>
                )}
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={cn(ESTADO_PROVEEDOR_CLASS[caso.estado_proveedor_real])}
                >
                  {caso.estado_proveedor_real}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>

      <Dialog open={Boolean(casoDetalle)} onOpenChange={(open) => { if (!open) setCasoDetalle(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold leading-snug">
              {casoDetalle?.titulo ?? "Caso"}
            </DialogTitle>
          </DialogHeader>
          {casoDetalle && (
            <div className="space-y-4 text-sm">
              {/* Sección: Identificación */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Identificación</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                  <div><span className="text-xs text-muted-foreground">ID GLPI</span><p className="font-mono font-medium">{casoDetalle.id_glpi}</p></div>
                  <div><span className="text-xs text-muted-foreground">Estado</span><p>{casoDetalle.estado_interno}</p></div>
                  <div><span className="text-xs text-muted-foreground">Categoría</span><p>{casoDetalle.categoria ?? "—"}</p></div>
                  <div><span className="text-xs text-muted-foreground">Urgencia</span><p>{casoDetalle.urgencia ?? "—"}</p></div>
                  {canEdit && (
                    <div className="col-span-2">
                      <span className="text-xs text-muted-foreground">Tipo</span>
                      <Select
                        value={casoDetalle.tipo ?? "sin_clasificar"}
                        onValueChange={(v) => {
                          const tipo = v === "sin_clasificar" ? null : v;
                          setCasoDetalle((prev) => prev ? { ...prev, tipo } : prev);
                          setRows((prev) => prev.map((r) => r.id === casoDetalle.id ? { ...r, tipo } : r));
                          startTransition(async () => {
                            try {
                              await updateCasosTipo([casoDetalle.id], tipo);
                              toast.success("Tipo actualizado");
                            } catch (err) {
                              toast.error(err instanceof Error ? err.message : "Error");
                            }
                          });
                        }}
                      >
                        <SelectTrigger className="mt-1 h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sin_clasificar">Sin clasificar</SelectItem>
                          <SelectItem value="Requerimiento">Requerimiento</SelectItem>
                          <SelectItem value="Incidencia">Incidencia</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t" />

              {/* Sección: Partes */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Partes</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                  <div><span className="text-xs text-muted-foreground">Solicitante</span><p>{casoDetalle.solicitante ?? "—"}</p></div>
                  <div><span className="text-xs text-muted-foreground">Técnico</span><p>{filterBotTecnicos(casoDetalle.tecnico_asignado)}</p></div>
                  <div><span className="text-xs text-muted-foreground">Ubicación</span><p>{casoDetalle.ubicacion ?? "—"}</p></div>
                </div>
              </div>

              <div className="border-t" />

              {/* Sección: Tiempos y escalamiento */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tiempos y escalamiento</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                  <div><span className="text-xs text-muted-foreground">F. Apertura</span><p>{formatFecha(casoDetalle.fecha_apertura)}</p></div>
                  <div><span className="text-xs text-muted-foreground">F. Cierre</span><p>{formatFecha(casoDetalle.fecha_cierre)}</p></div>
                  <div><span className="text-xs text-muted-foreground">Caso proveedor</span><p className="font-mono">{casoDetalle.caso_escalado_proveedor ?? "—"}</p></div>
                  <div><span className="text-xs text-muted-foreground">Estado proveedor</span><p>{casoDetalle.estado_proveedor_real}</p></div>
                </div>
              </div>

              <div className="border-t" />

              {/* Sección: Descripción */}
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Descripción</p>
                {casoDetalle.descripcion ? (
                  <>
                    <div className={cn("rounded-md bg-muted/40 px-3 py-2 whitespace-pre-wrap leading-relaxed", !descExpanded && "line-clamp-3")}>
                      {casoDetalle.descripcion}
                    </div>
                    {casoDetalle.descripcion.length > 200 && (
                      <button
                        type="button"
                        onClick={() => setDescExpanded(!descExpanded)}
                        className="mt-1 text-xs text-primary hover:underline"
                      >
                        {descExpanded ? "Ver menos ↑" : "Ver más ↓"}
                      </button>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground">—</p>
                )}
              </div>

              <div className="border-t" />

              {/* Sección: Solución */}
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Solución / Respuesta</p>
                {casoDetalle.solucion ? (
                  <>
                    <div className={cn("rounded-md bg-muted/40 px-3 py-2 whitespace-pre-wrap leading-relaxed", !solExpanded && "line-clamp-3")}>
                      {casoDetalle.solucion}
                    </div>
                    {casoDetalle.solucion.length > 200 && (
                      <button
                        type="button"
                        onClick={() => setSolExpanded(!solExpanded)}
                        className="mt-1 text-xs text-primary hover:underline"
                      >
                        {solExpanded ? "Ver menos ↑" : "Ver más ↓"}
                      </button>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground">— Sin solución registrada</p>
                )}
              </div>

              {/* Sección: Avance hasta la fecha — solo en casos no cerrados con seguimientos */}
              {casoDetalle.estado_interno !== "Cerrado" && casoDetalle.seguimientos && (
                <>
                  <div className="border-t" />
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Avance hasta la fecha
                    </p>
                    <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 whitespace-pre-wrap leading-relaxed text-sm dark:bg-amber-950/20 dark:border-amber-800">
                      {casoDetalle.seguimientos}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {canEdit && selectedIds.size > 0 && (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 flex items-center gap-3 rounded-xl border bg-background px-5 py-3 shadow-lg">
          <span className="text-sm font-medium">
            {selectedIds.size} caso{selectedIds.size !== 1 ? "s" : ""} seleccionado{selectedIds.size !== 1 ? "s" : ""}
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
