"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { asignarModulo } from "@/app/modulos/actions";
import { ModuloSelect, type ModulosCtl } from "@/components/modulos/modulo-select";
import {
  getTareaDetalle,
  getTareaPorIdTarea,
  updateTareasTipo,
} from "@/app/proveedor/import-actions";
import { Badge } from "@/components/ui/badge";
import { DiasBadge } from "@/components/dias-badge";
import { TipoSelect } from "@/components/etiquetas/tipo-select";
import { TextoCargando } from "@/components/ui/texto-cargando";
import { formatFecha, formatFechaHora } from "@/lib/formato";
import { nombreAutor } from "@/lib/proveedor/autores";
import { parseComentarios } from "@/lib/proveedor/comentarios";
import type { TareaPar } from "@/lib/proveedor/par";
import { diasDesde, type TareaDetalle as TareaTextos, type TareaLista } from "@/lib/proveedor/tareas";
import type { Tipo } from "@/lib/supabase/types";
import { useDetalleBajoDemanda } from "@/lib/use-detalle-bajo-demanda";
import { cn } from "@/lib/utils";

const ESTADO_TAREA_CLASS: Record<string, string> = {
  "En Desarrollo":     "border-transparent bg-[#1d4ed8] text-white",
  "En Revision":       "border-transparent bg-[#d97706] text-white",
  "Pendiente Cliente": "border-transparent bg-[#c2410c] text-white",
  "Cerrada":           "border-transparent bg-[#475569] text-white",
  "Caducada":          "border-transparent bg-[#94a3b8] text-white",
};

// Fila de la lista con los días calculados una vez (sirven para mostrar y ordenar).
export type TareaFila = TareaLista & {
  dias_creacion: number | null;
  dias_respuesta: number | null;
};

export function conDias(t: TareaLista, hoy: string): TareaFila {
  return {
    ...t,
    dias_creacion: diasDesde(hoy, t.fecha_inicio),
    dias_respuesta: diasDesde(hoy, t.fecha_ultima_respuesta),
  };
}

export function EstadoBadge({ estado }: { estado: string | null }) {
  if (!estado) return <>—</>;
  return (
    <Badge variant="outline" className={cn(ESTADO_TAREA_CLASS[estado] ?? "")}>
      {estado}
    </Badge>
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
            {c.autor && (() => {
              const nombre = nombreAutor(c.autor);
              return (
                <span
                  title={nombre ? c.autor : undefined}
                  className={cn(
                    "rounded bg-muted px-1.5 py-0.5 font-semibold",
                    !nombre && "font-mono",
                    !c.automatico && "text-foreground"
                  )}
                >
                  {nombre ?? c.autor}
                </span>
              );
            })()}
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

interface CuerpoProps {
  tarea: TareaFila;
  // undefined = todavía no llega (o falló).
  detalle: TareaTextos | undefined;
  cargando: boolean;
  canEdit: boolean;
  // Deshabilita el select mientras se guarda un cambio de tipo.
  guardando?: boolean;
  tipos: Tipo[];
  onTipoChange: (tipoId: string | null) => void;
  modulosCtl: ModulosCtl;
  onModuloChange: (moduloId: string | null) => void;
  // Caso GLPI emparejado (para el campo "Caso GLPI relacionado"), si hay.
  casoGlpi: { id_glpi: number; titulo: string | null } | null;
  // Con pestañas el título del diálogo es el par; el de la tarea va dentro de su pestaña.
  conTitulo?: boolean;
}

// Cuerpo del detalle de una tarea del proveedor (sin lógica de carga).
function TareaCuerpo({ tarea, detalle, cargando, canEdit, guardando, tipos, onTipoChange, modulosCtl, onModuloChange, casoGlpi, conTitulo }: CuerpoProps) {
  const [descExpanded, setDescExpanded] = useState(false);

  useEffect(() => {
    setDescExpanded(false);
  }, [tarea.id]);

  return (
    <div className="space-y-4 text-sm">
      {conTitulo && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Caso proveedor <span className="font-mono">#{tarea.id_tarea}</span>
          </p>
          <h3 className="text-base font-semibold leading-snug">{tarea.asunto ?? "Tarea"}</h3>
        </div>
      )}

      {/* Sección: Identificación */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Identificación</p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
          <Campo label="ID tarea"><p className="font-mono font-medium">{tarea.id_tarea}</p></Campo>
          <Campo label="Estatus"><EstadoBadge estado={tarea.estado} /></Campo>
          <Campo label="% realizado"><p className="tabular-nums">{tarea.porcentaje_realizado ?? 0}%</p></Campo>
          <Campo label="Proyecto" className="col-span-2 sm:col-span-3"><p>{tarea.proyecto ?? "—"}</p></Campo>
          <Campo label="Autor"><p>{tarea.autor ?? "—"}</p></Campo>
          <Campo label="Asignatario"><p>{tarea.asignatario ?? "—"}</p></Campo>
          <Campo label="Tipo de tarea"><p>{tarea.tipo_tarea ?? "—"}</p></Campo>
          <Campo label="Prioridad"><p>{tarea.prioridad ?? "—"}</p></Campo>
          <Campo label="Tipo facturación"><p>{tarea.tipo_facturacion ?? "—"}</p></Campo>
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
          <Campo label="F. inicio"><p>{formatFecha(tarea.fecha_inicio)}</p></Campo>
          <Campo label="F. fin"><p>{formatFecha(tarea.fecha_fin)}</p></Campo>
          <Campo label="Última actualización"><p>{formatFechaHora(tarea.ultima_actualizacion)}</p></Campo>
          <Campo label="Días desde creación"><DiasBadge dias={tarea.dias_creacion} /></Campo>
          <Campo label="Última respuesta" className="col-span-2">
            <p>
              {formatFecha(tarea.fecha_ultima_respuesta)}
              {tarea.dias_respuesta !== null && (
                <>
                  {" · "}
                  <DiasBadge dias={tarea.dias_respuesta} />
                </>
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
            <TipoSelect
              tipos={tipos}
              value={tarea.tipo_id}
              disabled={guardando}
              onChange={onTipoChange}
              className="max-w-xs"
            />
          </div>

          {/* Sección: Módulo */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Módulo</p>
            <ModuloSelect
              ctl={modulosCtl}
              value={tarea.modulo_id}
              disabled={guardando}
              onChange={onModuloChange}
              className="max-w-xs"
            />
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
}

// Detalle de una tarea que la tabla ya tiene en su lista: los textos largos se
// piden por id bajo demanda (solo admin). `cache` es de la tabla.
export function TareaDetalle({
  tarea,
  cache,
  canEdit,
  guardando,
  tipos,
  onTipoChange,
  modulosCtl,
  onModuloChange,
  casoGlpi,
  conTitulo,
}: {
  tarea: TareaFila;
  cache: Map<string, TareaTextos>;
  canEdit: boolean;
  guardando?: boolean;
  tipos: Tipo[];
  onTipoChange: (tipoId: string | null) => void;
  modulosCtl: ModulosCtl;
  onModuloChange: (moduloId: string | null) => void;
  casoGlpi: { id_glpi: number; titulo: string | null } | null;
  conTitulo?: boolean;
}) {
  const { detalle, cargando } = useDetalleBajoDemanda(
    tarea.id,
    cache,
    getTareaDetalle,
    "Error al cargar el detalle de la tarea"
  );
  return (
    <TareaCuerpo
      tarea={tarea}
      detalle={detalle}
      cargando={cargando}
      canEdit={canEdit}
      guardando={guardando}
      tipos={tipos}
      onTipoChange={onTipoChange}
      modulosCtl={modulosCtl}
      onModuloChange={onModuloChange}
      casoGlpi={casoGlpi}
      conTitulo={conTitulo}
    />
  );
}

// Detalle de la tarea emparejada con un caso GLPI (se abre desde la tabla de
// casos, que no tiene esa tarea). `cache` va por id_tarea (texto).
export function TareaDePar({
  idTarea,
  cache,
  tipos,
  modulosCtl,
  casoGlpi,
  conTitulo,
}: {
  idTarea: number;
  cache: Map<string, TareaPar | null>;
  tipos: Tipo[];
  modulosCtl: ModulosCtl;
  casoGlpi: { id_glpi: number; titulo: string | null } | null;
  conTitulo?: boolean;
}) {
  const clave = String(idTarea);
  const [guardando, setGuardando] = useState(false);
  const { detalle: par, cargando, conError, actualizar } = useDetalleBajoDemanda(
    clave,
    cache,
    (k) => getTareaPorIdTarea(Number(k)),
    "Error al cargar la tarea del proveedor"
  );
  const fila = useMemo(() => (par ? conDias(par.tarea, par.hoy) : null), [par]);

  function handleTipo(tipoId: string | null) {
    if (!par) return;
    const previo = par.tarea.tipo_id;
    const id = par.tarea.id;
    actualizar(clave, (p) => (p ? { ...p, tarea: { ...p.tarea, tipo_id: tipoId } } : p));
    setGuardando(true);
    updateTareasTipo([id], tipoId)
      .then(() => toast.success("Tipo actualizado"))
      .catch((err) => {
        actualizar(clave, (p) => (p ? { ...p, tarea: { ...p.tarea, tipo_id: previo } } : p));
        toast.error(err instanceof Error ? err.message : "Error al actualizar");
      })
      .finally(() => setGuardando(false));
  }

  function handleModulo(moduloId: string | null) {
    if (!par) return;
    const previo = par.tarea.modulo_id;
    const id = par.tarea.id;
    actualizar(clave, (p) => (p ? { ...p, tarea: { ...p.tarea, modulo_id: moduloId } } : p));
    setGuardando(true);
    asignarModulo("tareas", [id], moduloId)
      .then((res) => {
        if (res.error !== undefined) {
          actualizar(clave, (p) => (p ? { ...p, tarea: { ...p.tarea, modulo_id: previo } } : p));
          toast.error(res.error);
          return;
        }
        toast.success(moduloId ? "Módulo asignado" : "Módulo eliminado");
      })
      .finally(() => setGuardando(false));
  }

  if (cargando) {
    return <TextoCargando />;
  }
  if (!par || !fila) {
    return (
      <p className="text-sm text-muted-foreground">
        {conError ? "No se pudo cargar la tarea del proveedor." : "No se encontró la tarea del proveedor."}
      </p>
    );
  }
  return (
    <TareaCuerpo
      tarea={fila}
      detalle={par.detalle}
      cargando={false}
      canEdit
      guardando={guardando}
      tipos={tipos}
      onTipoChange={handleTipo}
      modulosCtl={modulosCtl}
      onModuloChange={handleModulo}
      casoGlpi={casoGlpi}
      conTitulo={conTitulo}
    />
  );
}
