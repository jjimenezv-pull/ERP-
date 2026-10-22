"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, ChevronUp, ChevronsUpDown, Eye } from "lucide-react";
import { updateCasosTipo, type CasoDetalle } from "@/app/casos/actions";
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
import { CasoGlpiDetalle } from "@/components/casos/caso-glpi-detalle";
import { ParDetalleTabs } from "@/components/proveedor/par-detalle-tabs";
import { TareaDePar } from "@/components/proveedor/tarea-detalle";
import type { CasoListaConEstado } from "@/lib/proveedor/cruce";
import { idTareaDeReferencia, type TareaPar } from "@/lib/proveedor/par";
import { diasCaso, filterBotTecnicos, formatFecha } from "@/lib/formato";
import { limpiarCacheSalvo } from "@/lib/use-detalle-bajo-demanda";
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

export function CasosTable({
  casos,
  canEdit,
  idsTareas,
  hoy,
}: {
  casos: CasoListaConEstado[];
  canEdit: boolean;
  // yyyy-MM-dd en hora de Bogotá, calculado en el servidor (ver hoyEnBogota).
  hoy: string;
  // id_tarea de las tareas del proveedor que existen (sin filtros). Solo se
  // pasa a administradores: sin esto no hay pestaña "Caso proveedor" ni se
  // pide ningún dato de tareas.
  idsTareas?: number[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [rows, setRows] = useState(casos);
  const [isPending, startTransition] = useTransition();
  const [casoDetalle, setCasoDetalle] = useState<CasoListaConEstado | null>(null);
  // Textos largos bajo demanda, cacheados por id (los llenan los componentes de
  // detalle). Un segundo cache guarda la tarea emparejada, por id_tarea.
  const detallesRef = useRef(new Map<string, CasoDetalle>());
  const tareaParRef = useRef(new Map<string, TareaPar | null>());
  const casoDetalleId = casoDetalle?.id ?? null;
  const casoDetalleIdRef = useRef<string | null>(null);
  casoDetalleIdRef.current = casoDetalleId;
  const [selectedIds, setSelectedIds] = useState(new Set<string>());
  const compact = !!searchParams.get("compact");

  // Solo admins reciben ids de tareas: para el resto el set queda vacío.
  const tareasExistentes = useMemo(() => new Set(idsTareas ?? []), [idsTareas]);
  // id_tarea del par de un caso, o null si no tiene (o el usuario no es admin).
  function parDe(caso: CasoListaConEstado): number | null {
    if (!canEdit) return null;
    const idTarea = idTareaDeReferencia(caso.caso_escalado_proveedor);
    return idTarea !== null && tareasExistentes.has(idTarea) ? idTarea : null;
  }
  const idTareaPar = casoDetalle ? parDe(casoDetalle) : null;
  const idTareaParRef = useRef<number | null>(null);
  idTareaParRef.current = idTareaPar;

  useEffect(() => {
    setRows(casos);
    setSelectedIds(new Set());
    limpiarCacheSalvo(detallesRef.current, casoDetalleIdRef.current);
    const par = idTareaParRef.current;
    limpiarCacheSalvo(tareaParRef.current, par === null ? null : String(par));
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

  function handleTipoDetalle(tipo: string | null) {
    if (!casoDetalle) return;
    const id = casoDetalle.id;
    setCasoDetalle((prev) => (prev ? { ...prev, tipo } : prev));
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, tipo } : r)));
    startTransition(async () => {
      try {
        await updateCasosTipo([id], tipo);
        toast.success("Tipo actualizado");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error");
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
            <TableHead
              className="text-white"
              title="Abiertos: días desde la apertura hasta hoy. Cerrados: días de la apertura al cierre."
            >
              Días
            </TableHead>
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
                        if (e.target.checked) next.add(caso.id);
                        else next.delete(caso.id);
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
              <TableCell
                className="tabular-nums"
                title={diasCaso(hoy, caso).cerrado ? "Días hasta el cierre" : "Días abierto"}
              >
                {(() => {
                  const { dias, cerrado } = diasCaso(hoy, caso);
                  if (dias === null) return "—";
                  return <span className={cn(cerrado && "text-muted-foreground")}>{dias}</span>;
                })()}
              </TableCell>
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
        <DialogContent className={cn("max-h-[85vh] overflow-y-auto", idTareaPar !== null ? "max-w-3xl" : "max-w-2xl")}>
          <DialogHeader>
            <DialogTitle className="text-base font-semibold leading-snug">
              {casoDetalle && idTareaPar !== null
                ? `Tarea ${idTareaPar} · Caso GLPI ${casoDetalle.id_glpi}`
                : (casoDetalle?.titulo ?? "Caso")}
            </DialogTitle>
          </DialogHeader>
          {casoDetalle && (
            idTareaPar !== null ? (
              // Con par: pestañas. key = caso, para que el estado de pestañas no se arrastre entre casos.
              <ParDetalleTabs
                key={casoDetalle.id}
                inicial="glpi"
                glpi={
                  <CasoGlpiDetalle
                    caso={casoDetalle}
                    canEdit={canEdit}
                    cache={detallesRef.current}
                    onTipoChange={handleTipoDetalle}
                    conTitulo
                  />
                }
                proveedor={
                  <TareaDePar
                    idTarea={idTareaPar}
                    cache={tareaParRef.current}
                    casoGlpi={{ id_glpi: casoDetalle.id_glpi, titulo: casoDetalle.titulo }}
                    conTitulo
                  />
                }
              />
            ) : (
              <CasoGlpiDetalle
                caso={casoDetalle}
                canEdit={canEdit}
                cache={detallesRef.current}
                onTipoChange={handleTipoDetalle}
              />
            )
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
