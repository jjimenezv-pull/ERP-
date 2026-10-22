"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { format, parseISO } from "date-fns";
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
import { getTareaDetalle, updateTareasTipo } from "@/app/proveedor/import-actions";

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
import { Skeleton } from "@/components/ui/skeleton";
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
import { cn } from "@/lib/utils";
import type { CasoListaConEstado } from "@/lib/proveedor/cruce";
import { diasDesde, type TareaDetalle, type TareaLista } from "@/lib/proveedor/tareas";
import { parseComentarios } from "@/lib/proveedor/comentarios";

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

const ESTADOS_TAREA = ["En Desarrollo", "En Revision", "Pendiente Cliente", "Cerrada", "Caducada"] as const;
const ESTADOS_CERRADOS = new Set<string>(["Cerrada", "Caducada"]);

// Desde cuántos días sin respuesta se resalta la celda (solo en tareas abiertas).
const DIAS_SIN_RESPUESTA_ALERTA = 15;

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

function formatFechaHora(value: string | null) {
  if (!value) return "—";
  try {
    // timestamp sin zona: parseISO lo toma como hora local, sin conversión.
    return format(parseISO(value), "dd/MM/yyyy HH:mm");
  } catch {
    return value;
  }
}

function textoDias(dias: number | null): string {
  if (dias === null) return "—";
  return dias === 1 ? "1 día" : `${dias} días`;
}

// Fila de la lista con los días calculados una vez (sirven para mostrar y ordenar).
type TareaFila = TareaLista & {
  dias_creacion: number | null;
  dias_respuesta: number | null;
};

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
  | "tipo";

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

// Días desde la última respuesta: tenue por defecto, resaltado si ya pasó el
// umbral y la tarea sigue abierta (en una cerrada no es una alerta).
function claseDiasRespuesta(dias: number | null, estado: string | null) {
  if (dias === null) return "text-muted-foreground";
  const abierta = !estado || !ESTADOS_CERRADOS.has(estado);
  return abierta && dias >= DIAS_SIN_RESPUESTA_ALERTA
    ? "font-medium text-amber-700 dark:text-amber-400"
    : "text-muted-foreground";
}

// Placeholder mientras llega el detalle (descripción/comentarios).
function TextoCargando() {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Cargando">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
    </div>
  );
}

// El export trae marcadores attachment:"image_...png" de adjuntos que no se
// pueden mostrar; se reemplazan por una etiqueta discreta en vez de ruido.
function TextoConAdjuntos({ texto }: { texto: string }) {
  const partes: React.ReactNode[] = [];
  let ultimo = 0;
  const adjuntos = Array.from(texto.matchAll(/attachment:"{1,2}([^"\n]+?)"{1,2}/g));
  for (const m of adjuntos) {
    const inicio = m.index ?? 0;
    partes.push(texto.slice(ultimo, inicio));
    partes.push(
      <span key={inicio} className="text-xs text-muted-foreground">
        [adjunto: {m[1]}]
      </span>
    );
    ultimo = inicio + m[0].length;
  }
  partes.push(texto.slice(ultimo));
  return <>{partes}</>;
}

function ComentariosLista({ texto }: { texto: string }) {
  const comentarios = useMemo(() => parseComentarios(texto), [texto]);

  if (comentarios.length === 0) {
    // Formato inesperado: se muestra el texto crudo antes que ocultarlo.
    return (
      <div className="rounded-md bg-muted/40 px-3 py-2 whitespace-pre-wrap leading-relaxed">
        <TextoConAdjuntos texto={texto} />
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {comentarios.map((c, i) => (
        <li
          key={i}
          className={cn(
            "rounded-md border px-3 py-2",
            c.automatico ? "bg-muted/20 text-muted-foreground" : "bg-muted/40"
          )}
        >
          <div className="mb-1 flex flex-wrap items-center gap-2 text-xs">
            {c.autor && (
              <span className={cn("rounded bg-muted px-1.5 py-0.5 font-mono font-semibold", !c.automatico && "text-foreground")}>
                {c.autor}
              </span>
            )}
            {c.fecha && <span className="text-muted-foreground">{formatFecha(c.fecha)}</span>}
            {c.automatico && (
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Automático</span>
            )}
          </div>
          <div className="whitespace-pre-wrap leading-relaxed">
            <TextoConAdjuntos texto={c.texto} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Campo({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <div>{children}</div>
    </div>
  );
}

function EstadoBadge({ estado }: { estado: string | null }) {
  if (!estado) return <>—</>;
  return (
    <Badge variant="outline" className={cn(ESTADO_TAREA_CLASS[estado] ?? "")}>
      {estado}
    </Badge>
  );
}

export function TareasProveedorTable({
  tareas,
  casosGlpi = [],
  canEdit = false,
  hoy,
}: {
  tareas: TareaLista[];
  casosGlpi?: CasoListaConEstado[];
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

  // Detalle (textos largos) bajo demanda, cacheado por id. El ref guarda el
  // cache y setDetalleListo fuerza el render cuando llega una respuesta.
  const [detalleId, setDetalleId] = useState<string | null>(null);
  const detalleIdRef = useRef<string | null>(null);
  detalleIdRef.current = detalleId;
  const detallesRef = useRef(new Map<string, TareaDetalle>());
  const [, setDetalleListo] = useState(0);
  const [detalleErrorId, setDetalleErrorId] = useState<string | null>(null);
  const [descExpanded, setDescExpanded] = useState(false);

  useEffect(() => {
    setRows(tareas);
    setSelectedIds(new Set());
    // Tras un refresh (p. ej. reimport) los textos cacheados pueden estar viejos;
    // el de la tarea abierta se conserva: cambiar el tipo desde el diálogo
    // dispara este refresh y, sin esto, quedaría el placeholder de carga para siempre.
    const abierto = detalleIdRef.current;
    const vigente = abierto ? detallesRef.current.get(abierto) : undefined;
    detallesRef.current.clear();
    if (abierto && vigente) detallesRef.current.set(abierto, vigente);
  }, [tareas]);

  useEffect(() => {
    setDescExpanded(false);
    if (!detalleId) return;
    setDetalleErrorId(null);
    if (detallesRef.current.has(detalleId)) return;

    // Si el usuario abre otra tarea antes de que responda, se descarta el estado
    // de esta respuesta (el cache sí se llena, así reabrir es instantáneo).
    let cancelado = false;
    getTareaDetalle(detalleId)
      .then((detalle) => {
        detallesRef.current.set(detalleId, detalle);
        if (!cancelado) setDetalleListo((n) => n + 1);
      })
      .catch((err) => {
        if (cancelado) return;
        setDetalleErrorId(detalleId);
        toast.error(err instanceof Error ? err.message : "Error al cargar el detalle de la tarea");
      });
    return () => {
      cancelado = true;
    };
  }, [detalleId]);

  // Los días se calculan una vez por fila (se muestran y se ordenan por ellos).
  const filas = useMemo<TareaFila[]>(
    () =>
      rows.map((t) => ({
        ...t,
        dias_creacion: diasDesde(hoy, t.fecha_inicio),
        dias_respuesta: diasDesde(hoy, t.fecha_ultima_respuesta),
      })),
    [rows, hoy]
  );

  // id_tarea (texto) -> primer caso GLPI que lo referencia.
  const casoPorTarea = useMemo(() => {
    const mapa = new Map<string, CasoListaConEstado>();
    for (const c of casosGlpi) {
      const ref = c.caso_escalado_proveedor?.trim();
      if (ref && !mapa.has(ref)) mapa.set(ref, c);
    }
    return mapa;
  }, [casosGlpi]);

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
    return [...filtered].sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      // Los vacíos van siempre al final, sin importar la dirección.
      if (va === null || va === undefined || va === "") return vb === null || vb === undefined || vb === "" ? 0 : 1;
      if (vb === null || vb === undefined || vb === "") return -1;
      const cmp =
        typeof va === "number" && typeof vb === "number"
          ? va - vb
          : String(va).localeCompare(String(vb), "es", { numeric: true });
      return signo * cmp;
    });
  }, [filas, filterEstado, filterQ, sortKey, sortDir]);

  const tareaDetalle = detalleId ? (filas.find((t) => t.id === detalleId) ?? null) : null;

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function persistTipo(ids: string[], tipo: string | null, mensajeOk: string) {
    setRows((prev) => prev.map((r) => (ids.includes(r.id) ? { ...r, tipo } : r)));
    startTransition(async () => {
      try {
        await updateTareasTipo(ids, tipo);
        toast.success(mensajeOk);
      } catch (err) {
        // Revierte el cambio optimista volviendo a lo que vino del servidor.
        setRows(tareas);
        toast.error(err instanceof Error ? err.message : "Error al actualizar");
      }
    });
  }

  function handleBulkTipo(tipo: string | null) {
    const ids = Array.from(selectedIds);
    setSelectedIds(new Set());
    persistTipo(ids, tipo, tipo ? `Marcados como ${tipo}` : "Tipo eliminado");
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
          <TableHead className="text-white">Caso GLPI</TableHead>
          <SortableHead sortKey="id_tarea" current={sortKey} dir={sortDir} onSort={handleSort}>ID tarea</SortableHead>
          <SortableHead sortKey="proyecto" current={sortKey} dir={sortDir} onSort={handleSort}>Proyecto</SortableHead>
          <SortableHead sortKey="autor" current={sortKey} dir={sortDir} onSort={handleSort}>Autor</SortableHead>
          <SortableHead sortKey="tipo_tarea" current={sortKey} dir={sortDir} onSort={handleSort}>Tipo de tarea</SortableHead>
          <SortableHead sortKey="prioridad" current={sortKey} dir={sortDir} onSort={handleSort}>Prioridad</SortableHead>
          <SortableHead sortKey="fecha_inicio" current={sortKey} dir={sortDir} onSort={handleSort}>F. inicio</SortableHead>
          <SortableHead sortKey="dias_creacion" current={sortKey} dir={sortDir} onSort={handleSort} title="Días desde creación">Días creación</SortableHead>
          <SortableHead sortKey="fecha_fin" current={sortKey} dir={sortDir} onSort={handleSort}>F. fin</SortableHead>
          <SortableHead sortKey="estado" current={sortKey} dir={sortDir} onSort={handleSort}>Estatus</SortableHead>
          <SortableHead sortKey="asunto" current={sortKey} dir={sortDir} onSort={handleSort}>Asunto</SortableHead>
          <SortableHead sortKey="asignatario" current={sortKey} dir={sortDir} onSort={handleSort}>Asignatario</SortableHead>
          <SortableHead sortKey="porcentaje_realizado" current={sortKey} dir={sortDir} onSort={handleSort}>% Realizado</SortableHead>
          <SortableHead sortKey="tipo_facturacion" current={sortKey} dir={sortDir} onSort={handleSort}>Tipo facturación</SortableHead>
          <SortableHead sortKey="ultima_actualizacion" current={sortKey} dir={sortDir} onSort={handleSort}>Última actualización</SortableHead>
          <SortableHead sortKey="dias_respuesta" current={sortKey} dir={sortDir} onSort={handleSort} title="Días desde última respuesta">Días últ. respuesta</SortableHead>
          <SortableHead sortKey="tipo" current={sortKey} dir={sortDir} onSort={handleSort}>Tipo</SortableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((tarea) => {
          const casoGlpi = casoPorTarea.get(String(tarea.id_tarea));
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
              <TableCell className={cn("truncate", compact ? "max-w-[100px]" : "max-w-[180px]")} title={tarea.proyecto ?? ""}>
                {shortProyecto(tarea.proyecto)}
              </TableCell>
              <TableCell className={cn("truncate", compact ? "max-w-[90px]" : "max-w-[150px]")} title={tarea.autor ?? ""}>
                {tarea.autor ?? "—"}
              </TableCell>
              <TableCell className="whitespace-nowrap">{tarea.tipo_tarea ?? "—"}</TableCell>
              <TableCell className="whitespace-nowrap">{tarea.prioridad ?? "—"}</TableCell>
              <TableCell className="whitespace-nowrap">{formatFecha(tarea.fecha_inicio)}</TableCell>
              <TableCell className="whitespace-nowrap tabular-nums text-muted-foreground">
                {tarea.dias_creacion ?? "—"}
              </TableCell>
              <TableCell className="whitespace-nowrap">{formatFecha(tarea.fecha_fin)}</TableCell>
              <TableCell>
                <EstadoBadge estado={tarea.estado} />
              </TableCell>
              <TableCell className={cn("truncate", compact ? "max-w-[140px]" : "max-w-[280px]")} title={tarea.asunto ?? ""}>
                {tarea.asunto ?? "—"}
              </TableCell>
              <TableCell className={cn("truncate", compact ? "max-w-[100px]" : "max-w-[200px]")} title={tarea.asignatario ?? ""}>
                {tarea.asignatario ?? "—"}
              </TableCell>
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
              <TableCell className={cn("truncate", compact ? "max-w-[90px]" : "max-w-[150px]")} title={tarea.tipo_facturacion ?? ""}>
                {tarea.tipo_facturacion ?? "—"}
              </TableCell>
              <TableCell className="whitespace-nowrap">{formatFechaHora(tarea.ultima_actualizacion)}</TableCell>
              <TableCell
                className={cn(
                  "whitespace-nowrap tabular-nums",
                  claseDiasRespuesta(tarea.dias_respuesta, tarea.estado)
                )}
              >
                {tarea.dias_respuesta ?? "—"}
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

      <Dialog open={Boolean(tareaDetalle)} onOpenChange={(open) => { if (!open) setDetalleId(null); }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold leading-snug">
              {tareaDetalle?.asunto ?? "Tarea"}
            </DialogTitle>
          </DialogHeader>
          {tareaDetalle && (() => {
            const detalle = detallesRef.current.get(tareaDetalle.id);
            const cargando = !detalle && detalleErrorId !== tareaDetalle.id;
            const casoGlpi = casoPorTarea.get(String(tareaDetalle.id_tarea));
            return (
            <div className="space-y-4 text-sm">
              {/* Sección: Identificación */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Identificación</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
                  <Campo label="ID tarea"><p className="font-mono font-medium">{tareaDetalle.id_tarea}</p></Campo>
                  <Campo label="Estatus"><EstadoBadge estado={tareaDetalle.estado} /></Campo>
                  <Campo label="% realizado"><p className="tabular-nums">{tareaDetalle.porcentaje_realizado ?? 0}%</p></Campo>
                  <Campo label="Proyecto" className="col-span-2 sm:col-span-3"><p>{tareaDetalle.proyecto ?? "—"}</p></Campo>
                  <Campo label="Autor"><p>{tareaDetalle.autor ?? "—"}</p></Campo>
                  <Campo label="Asignatario"><p>{tareaDetalle.asignatario ?? "—"}</p></Campo>
                  <Campo label="Tipo de tarea"><p>{tareaDetalle.tipo_tarea ?? "—"}</p></Campo>
                  <Campo label="Prioridad"><p>{tareaDetalle.prioridad ?? "—"}</p></Campo>
                  <Campo label="Tipo facturación"><p>{tareaDetalle.tipo_facturacion ?? "—"}</p></Campo>
                  <Campo label="Caso GLPI relacionado">
                    {casoGlpi ? (
                      <p>
                        <span className="font-mono font-medium">{casoGlpi.id_glpi}</span>
                        {casoGlpi.titulo ? <span className="text-muted-foreground"> · {casoGlpi.titulo}</span> : null}
                      </p>
                    ) : (
                      <p className="text-muted-foreground">—</p>
                    )}
                  </Campo>
                </div>
              </div>

              <div className="border-t" />

              {/* Sección: Fechas */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fechas</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
                  <Campo label="F. inicio"><p>{formatFecha(tareaDetalle.fecha_inicio)}</p></Campo>
                  <Campo label="F. fin"><p>{formatFecha(tareaDetalle.fecha_fin)}</p></Campo>
                  <Campo label="Última actualización"><p>{formatFechaHora(tareaDetalle.ultima_actualizacion)}</p></Campo>
                  <Campo label="Días desde creación"><p className="tabular-nums">{textoDias(tareaDetalle.dias_creacion)}</p></Campo>
                  <Campo label="Última respuesta" className="col-span-2">
                    <p>
                      {formatFecha(tareaDetalle.fecha_ultima_respuesta)}
                      {tareaDetalle.dias_respuesta !== null && (
                        <span className={cn("tabular-nums", claseDiasRespuesta(tareaDetalle.dias_respuesta, tareaDetalle.estado))}>
                          {" · "}
                          {tareaDetalle.dias_respuesta === 0 ? "hoy" : `hace ${textoDias(tareaDetalle.dias_respuesta)}`}
                        </span>
                      )}
                    </p>
                  </Campo>
                </div>
              </div>

              {canEdit && (
                <>
                  <div className="border-t" />

                  {/* Sección: Tipo */}
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tipo</p>
                    <Select
                      value={tareaDetalle.tipo ?? "sin_clasificar"}
                      disabled={isPending}
                      onValueChange={(v) => {
                        const tipo = v === "sin_clasificar" ? null : v;
                        persistTipo([tareaDetalle.id], tipo, "Tipo actualizado");
                      }}
                    >
                      <SelectTrigger className="h-8 max-w-xs text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sin_clasificar">Sin clasificar</SelectItem>
                        <SelectItem value="Requerimiento">Requerimiento</SelectItem>
                        <SelectItem value="Incidencia">Incidencia</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <div className="border-t" />

              {/* Sección: Descripción */}
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Descripción</p>
                {cargando ? (
                  <TextoCargando />
                ) : detalle?.descripcion ? (
                  <>
                    <div
                      className={cn(
                        "overflow-y-auto rounded-md bg-muted/40 px-3 py-2 whitespace-pre-wrap leading-relaxed",
                        descExpanded ? "max-h-[50vh]" : "max-h-40"
                      )}
                    >
                      <TextoConAdjuntos texto={detalle.descripcion} />
                    </div>
                    {detalle.descripcion.length > 400 && (
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
                  <p className="text-muted-foreground">{detalle ? "— Sin descripción" : "— No se pudo cargar"}</p>
                )}
              </div>

              <div className="border-t" />

              {/* Sección: Last comments */}
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Last comments</p>
                {cargando ? (
                  <TextoCargando />
                ) : detalle?.last_comments ? (
                  <ComentariosLista texto={detalle.last_comments} />
                ) : (
                  <p className="text-muted-foreground">{detalle ? "— Sin comentarios" : "— No se pudo cargar"}</p>
                )}
              </div>
            </div>
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
