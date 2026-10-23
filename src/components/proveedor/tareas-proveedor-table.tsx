"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Eye,
  Maximize2,
  Minimize2,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { updateTareasTipo } from "@/app/proveedor/import-actions";
import { asignarModulo } from "@/app/modulos/actions";
import { ModuloBadge, ModuloSelect, useModulos, type ModuloOpcion } from "@/components/modulos/modulo-select";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EtiquetaBadge } from "@/components/etiquetas/etiqueta-badge";
import { TipoBulkSelect } from "@/components/etiquetas/tipo-select";
import { DiasBadge } from "@/components/dias-badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CasoGlpiDePar } from "@/components/casos/caso-glpi-detalle";
import { ParDetalleTabs } from "@/components/proveedor/par-detalle-tabs";
import {
  conDias,
  EstadoBadge,
  TareaDetalle,
  type TareaFila,
} from "@/components/proveedor/tarea-detalle";
import { formatFecha, formatFechaHora } from "@/lib/formato";
import { cn } from "@/lib/utils";
import type { Tipo } from "@/lib/supabase/types";
import type { CasoGlpiPar, ParGlpi } from "@/lib/proveedor/par";
import type { TareaDetalle as TareaTextos, TareaLista } from "@/lib/proveedor/tareas";
import { limpiarCacheSalvo } from "@/lib/use-detalle-bajo-demanda";

const ESTADOS_TAREA = ["En Desarrollo", "En Revision", "Pendiente Cliente", "Cerrada", "Caducada"] as const;

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

type SortKey =
  | "id_tarea"
  | "proyecto"
  | "autor"
  | "tipo_tarea"
  | "prioridad"
  | "fecha_inicio"
  | "dias_creacion"
  | "fecha_fin"
  | "estado"
  | "asunto"
  | "asignatario"
  | "porcentaje_realizado"
  | "tipo_facturacion"
  | "ultima_actualizacion"
  | "dias_respuesta"
  | "tipo"
  | "modulo"
  | "caso_glpi";

function SortableHead({
  sortKey,
  current,
  dir,
  onSort,
  title,
  children,
}: {
  sortKey: SortKey;
  current: SortKey | null;
  dir: "asc" | "desc";
  onSort: (k: SortKey) => void;
  title?: string;
  children: React.ReactNode;
}) {
  const active = current === sortKey;
  return (
    <TableHead title={title}>
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
  paresGlpi = [],
  canEdit = false,
  hoy,
  modulos: modulosIniciales,
  tipos,
}: {
  tareas: TareaLista[];
  // Catálogo de módulos (una lectura por página, ver cargarModulos).
  modulos: ModuloOpcion[];
  // Catálogo de tipos (activos e inactivos; ver cargarTipos).
  tipos: Tipo[];
  // Casos GLPI que referencian una tarea, SIN los filtros de la página: así la
  // columna "Caso GLPI" y la pestaña del detalle no dependen de lo filtrado arriba.
  paresGlpi?: ParGlpi[];
  canEdit?: boolean;
  // yyyy-MM-dd en hora de Bogotá, calculado en el servidor (ver proveedor/page.tsx).
  hoy: string;
}) {
  const [compact, setCompact] = useState(false);
  const [filterEstado, setFilterEstado] = useState("todos");
  const [filterQ, setFilterQ] = useState("");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [rows, setRows] = useState(tareas);
  const [selectedIds, setSelectedIds] = useState(new Set<string>());
  const [isPending, startTransition] = useTransition();
  const modulosCtl = useModulos(modulosIniciales, {
    onEliminado: (id) => {
      setRows((prev) => prev.map((r) => (r.modulo_id === id ? { ...r, modulo_id: null } : r)));
    },
  });

  // Detalle (textos largos) bajo demanda, cacheado por id (lo llenan los
  // componentes de detalle). Un segundo cache guarda el caso GLPI emparejado,
  // por id_tarea. Ambos se conservan para el ítem abierto al refrescar la lista.
  const [detalleId, setDetalleId] = useState<string | null>(null);
  const detalleIdRef = useRef<string | null>(null);
  detalleIdRef.current = detalleId;
  const idTareaAbiertaRef = useRef<number | null>(null);
  const detallesRef = useRef(new Map<string, TareaTextos>());
  const glpiParRef = useRef(new Map<string, CasoGlpiPar | null>());

  useEffect(() => {
    setRows(tareas);
    setSelectedIds(new Set());
    limpiarCacheSalvo(detallesRef.current, detalleIdRef.current);
    const idTarea = idTareaAbiertaRef.current;
    limpiarCacheSalvo(glpiParRef.current, idTarea === null ? null : String(idTarea));
  }, [tareas]);

  // Los días se calculan una vez por fila (se muestran y se ordenan por ellos).
  const filas = useMemo<TareaFila[]>(() => rows.map((t) => conDias(t, hoy)), [rows, hoy]);

  // id_tarea -> primer caso GLPI que la referencia.
  const casoPorTarea = useMemo(() => new Map(paresGlpi.map((p) => [p.id_tarea, p])), [paresGlpi]);

  const tipoPorId = useMemo(() => new Map(tipos.map((t) => [t.id, t])), [tipos]);

  const sorted = useMemo(() => {
    const q = filterQ.trim().toLowerCase();
    const filtered = filas
      .filter((t) => filterEstado === "todos" || t.estado === filterEstado)
      .filter((t) => {
        if (!q) return true;
        return (
          t.asunto?.toLowerCase().includes(q) ||
          String(t.id_tarea).includes(q) ||
          t.asignatario?.toLowerCase().includes(q) ||
          t.autor?.toLowerCase().includes(q) ||
          t.proyecto?.toLowerCase().includes(q)
        );
      });
    if (!sortKey) return filtered;
    const signo = sortDir === "asc" ? 1 : -1;
    // "modulo", "tipo" y "caso_glpi" son derivados (catálogo / par), no campos de la fila.
    const valor = (t: TareaFila) =>
      sortKey === "modulo"
        ? (t.modulo_id ? modulosCtl.nombrePorId.get(t.modulo_id) : null)
        : sortKey === "tipo"
          ? (t.tipo_id ? tipoPorId.get(t.tipo_id)?.nombre : null)
          : sortKey === "caso_glpi"
          ? casoPorTarea.get(t.id_tarea)?.id_glpi
          : t[sortKey];
    return [...filtered].sort((a, b) => {
      const va = valor(a);
      const vb = valor(b);
      // Los vacíos van siempre al final, sin importar la dirección.
      if (va === null || va === undefined || va === "") return vb === null || vb === undefined || vb === "" ? 0 : 1;
      if (vb === null || vb === undefined || vb === "") return -1;
      const cmp =
        typeof va === "number" && typeof vb === "number"
          ? va - vb
          : String(va).localeCompare(String(vb), "es", { numeric: true });
      return signo * cmp;
    });
  }, [filas, filterEstado, filterQ, sortKey, sortDir, modulosCtl.nombrePorId, tipoPorId, casoPorTarea]);

  const tareaDetalle = detalleId ? (filas.find((t) => t.id === detalleId) ?? null) : null;
  idTareaAbiertaRef.current = tareaDetalle?.id_tarea ?? null;
  // Par del ítem abierto (la sección es solo para admins; viewers nunca reciben tareas).
  const parAbierto = tareaDetalle ? (casoPorTarea.get(tareaDetalle.id_tarea) ?? null) : null;

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function persistTipo(ids: string[], tipoId: string | null, mensajeOk: string) {
    setRows((prev) => prev.map((r) => (ids.includes(r.id) ? { ...r, tipo_id: tipoId } : r)));
    startTransition(async () => {
      try {
        await updateTareasTipo(ids, tipoId);
        toast.success(mensajeOk);
      } catch (err) {
        // Revierte el cambio optimista volviendo a lo que vino del servidor.
        setRows(tareas);
        toast.error(err instanceof Error ? err.message : "Error al actualizar");
      }
    });
  }

  function handleBulkTipo(tipoId: string | null) {
    const ids = Array.from(selectedIds);
    setSelectedIds(new Set());
    persistTipo(ids, tipoId, tipoId ? `Marcados como ${tipoPorId.get(tipoId)?.nombre ?? "tipo"}` : "Tipo eliminado");
  }

  // Edición optimista; la acción replica el módulo en el caso GLPI emparejado y
  // revalida ambas páginas. Si falla se vuelve a lo que vino del servidor.
  function persistModulo(ids: string[], moduloId: string | null) {
    const sel = new Set(ids);
    setRows((prev) => prev.map((r) => (sel.has(r.id) ? { ...r, modulo_id: moduloId } : r)));
    startTransition(async () => {
      const res = await asignarModulo("tareas", ids, moduloId);
      if (res.error !== undefined) {
        setRows(tareas);
        toast.error(res.error);
        return;
      }
      toast.success(moduloId ? "Módulo asignado" : "Módulo eliminado");
    });
  }

  function handleBulkModulo(moduloId: string | null) {
    const ids = Array.from(selectedIds);
    setSelectedIds(new Set());
    persistModulo(ids, moduloId);
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center text-sm text-muted-foreground">
        No hay tareas importadas todavía.
      </div>
    );
  }

  const todasSeleccionadas = sorted.length > 0 && sorted.every((t) => selectedIds.has(t.id));

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
                checked={todasSeleccionadas}
                onChange={(e) => setSelectedIds(e.target.checked ? new Set(sorted.map((r) => r.id)) : new Set())}
                aria-label="Seleccionar todos"
              />
            </TableHead>
          )}
          <TableHead className="w-8"><span className="sr-only">Detalle</span></TableHead>
          <SortableHead sortKey="caso_glpi" current={sortKey} dir={sortDir} onSort={handleSort}>Caso GLPI</SortableHead>
          <SortableHead sortKey="id_tarea" current={sortKey} dir={sortDir} onSort={handleSort}>ID tarea</SortableHead>
          <SortableHead sortKey="asunto" current={sortKey} dir={sortDir} onSort={handleSort}>Asunto</SortableHead>
          <SortableHead sortKey="autor" current={sortKey} dir={sortDir} onSort={handleSort}>Autor</SortableHead>
          <SortableHead sortKey="asignatario" current={sortKey} dir={sortDir} onSort={handleSort}>Asignatario</SortableHead>
          <SortableHead sortKey="estado" current={sortKey} dir={sortDir} onSort={handleSort}>Estatus</SortableHead>
          <SortableHead sortKey="tipo" current={sortKey} dir={sortDir} onSort={handleSort}>Tipo</SortableHead>
          <SortableHead sortKey="modulo" current={sortKey} dir={sortDir} onSort={handleSort}>Módulo</SortableHead>
          <SortableHead sortKey="fecha_inicio" current={sortKey} dir={sortDir} onSort={handleSort}>F. inicio</SortableHead>
          <SortableHead sortKey="dias_creacion" current={sortKey} dir={sortDir} onSort={handleSort} title="Días desde creación">Días creación</SortableHead>
          <SortableHead sortKey="ultima_actualizacion" current={sortKey} dir={sortDir} onSort={handleSort}>Última actualización</SortableHead>
          <SortableHead sortKey="dias_respuesta" current={sortKey} dir={sortDir} onSort={handleSort} title="Días desde última respuesta">Días últ. respuesta</SortableHead>
          <SortableHead sortKey="fecha_fin" current={sortKey} dir={sortDir} onSort={handleSort}>F. fin</SortableHead>
          <SortableHead sortKey="porcentaje_realizado" current={sortKey} dir={sortDir} onSort={handleSort}>% Realizado</SortableHead>
          <SortableHead sortKey="proyecto" current={sortKey} dir={sortDir} onSort={handleSort}>Proyecto</SortableHead>
          <SortableHead sortKey="tipo_tarea" current={sortKey} dir={sortDir} onSort={handleSort}>Tipo de tarea</SortableHead>
          <SortableHead sortKey="prioridad" current={sortKey} dir={sortDir} onSort={handleSort}>Prioridad</SortableHead>
          <SortableHead sortKey="tipo_facturacion" current={sortKey} dir={sortDir} onSort={handleSort}>Tipo facturación</SortableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((tarea) => {
          const casoGlpi = casoPorTarea.get(tarea.id_tarea);
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
                <button
                  type="button"
                  onClick={() => setDetalleId(tarea.id)}
                  className="text-muted-foreground hover:text-foreground"
                  title="Ver detalle"
                  aria-label={`Ver detalle de la tarea ${tarea.id_tarea}`}
                >
                  <Eye className="h-4 w-4" />
                </button>
              </TableCell>
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
              <TableCell className={cn("truncate", compact ? "max-w-[90px]" : "max-w-[150px]")} title={tarea.autor ?? ""}>
                {tarea.autor ?? "—"}
              </TableCell>
              <TableCell className={cn("truncate", compact ? "max-w-[100px]" : "max-w-[200px]")} title={tarea.asignatario ?? ""}>
                {tarea.asignatario ?? "—"}
              </TableCell>
              <TableCell>
                <EstadoBadge estado={tarea.estado} />
              </TableCell>
              <TableCell>
                {tarea.tipo_id && tipoPorId.get(tarea.tipo_id) ? (
                  <EtiquetaBadge nombre={tipoPorId.get(tarea.tipo_id)!.nombre} clave={tipoPorId.get(tarea.tipo_id)!.color} fallbackId={tarea.tipo_id} />
                ) : (
                  <span className="text-muted-foreground text-xs">—</span>
                )}
              </TableCell>
              <TableCell className={cn(compact ? "min-w-[90px]" : "min-w-[150px]")}>
                {canEdit ? (
                  <ModuloSelect
                    ctl={modulosCtl}
                    value={tarea.modulo_id}
                    disabled={isPending}
                    onChange={(id) => persistModulo([tarea.id], id)}
                  />
                ) : tarea.modulo_id ? (
                  modulosCtl.nombrePorId.get(tarea.modulo_id) ? (
                    <ModuloBadge id={tarea.modulo_id} nombre={modulosCtl.nombrePorId.get(tarea.modulo_id)!} />
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )
                ) : (
                  <span className="text-muted-foreground text-xs">—</span>
                )}
              </TableCell>
              <TableCell className="whitespace-nowrap">{formatFecha(tarea.fecha_inicio)}</TableCell>
              <TableCell className="whitespace-nowrap">
                <DiasBadge dias={tarea.dias_creacion} />
              </TableCell>
              <TableCell className="whitespace-nowrap">{formatFechaHora(tarea.ultima_actualizacion)}</TableCell>
              <TableCell className="whitespace-nowrap">
                <DiasBadge dias={tarea.dias_respuesta} />
              </TableCell>
              <TableCell className="whitespace-nowrap">{formatFecha(tarea.fecha_fin)}</TableCell>
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
              <TableCell className={cn("truncate", compact ? "max-w-[100px]" : "max-w-[180px]")} title={tarea.proyecto ?? ""}>
                {shortProyecto(tarea.proyecto)}
              </TableCell>
              <TableCell className="whitespace-nowrap">{tarea.tipo_tarea ?? "—"}</TableCell>
              <TableCell className="whitespace-nowrap">{tarea.prioridad ?? "—"}</TableCell>
              <TableCell className={cn("truncate", compact ? "max-w-[90px]" : "max-w-[150px]")} title={tarea.tipo_facturacion ?? ""}>
                {tarea.tipo_facturacion ?? "—"}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
    </div>

      <Dialog open={Boolean(tareaDetalle)} onOpenChange={(open) => { if (!open) setDetalleId(null); }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold leading-snug">
              {tareaDetalle && parAbierto
                ? `Tarea ${tareaDetalle.id_tarea} · Caso GLPI ${parAbierto.id_glpi}`
                : (tareaDetalle?.asunto ?? "Tarea")}
            </DialogTitle>
          </DialogHeader>
          {tareaDetalle && (() => {
            const casoGlpi = parAbierto
              ? { id_glpi: parAbierto.id_glpi, titulo: parAbierto.titulo }
              : null;
            const detalle = (conTitulo: boolean) => (
              <TareaDetalle
                tarea={tareaDetalle}
                cache={detallesRef.current}
                canEdit={canEdit}
                guardando={isPending}
                tipos={tipos}
                onTipoChange={(tipoId) => persistTipo([tareaDetalle.id], tipoId, "Tipo actualizado")}
                modulosCtl={modulosCtl}
                onModuloChange={(id) => persistModulo([tareaDetalle.id], id)}
                casoGlpi={casoGlpi}
                conTitulo={conTitulo}
              />
            );
            if (!parAbierto) return detalle(false);
            // Con par: pestañas. key = tarea, para que el estado de pestañas no se arrastre entre tareas.
            return (
              <ParDetalleTabs
                key={tareaDetalle.id}
                inicial="proveedor"
                proveedor={detalle(true)}
                glpi={
                  <CasoGlpiDePar
                    idTarea={tareaDetalle.id_tarea}
                    cache={glpiParRef.current}
                    tipos={tipos}
                    modulosCtl={modulosCtl}
                    conTitulo
                  />
                }
              />
            );
          })()}
        </DialogContent>
      </Dialog>

      {canEdit && selectedIds.size > 0 && (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 flex items-center gap-3 rounded-xl border bg-background px-5 py-3 shadow-lg">
          <span className="text-sm font-medium">
            {selectedIds.size} tarea{selectedIds.size !== 1 ? "s" : ""} seleccionada{selectedIds.size !== 1 ? "s" : ""}
          </span>
          <span className="text-muted-foreground">·</span>
          <TipoBulkSelect tipos={tipos} disabled={isPending} onChange={handleBulkTipo} />
          <ModuloSelect
            ctl={modulosCtl}
            etiqueta="Módulo…"
            disabled={isPending}
            onChange={handleBulkModulo}
            className="h-9 w-auto min-w-[110px]"
          />
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
