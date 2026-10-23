"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { asignarModulo } from "@/app/modulos/actions";
import { ModuloBadge, ModuloSelect, type ModulosCtl } from "@/components/modulos/modulo-select";
import {
  getCasoDetalle,
  getCasoGlpiPorTarea,
  updateCasosTipo,
  type CasoDetalle,
} from "@/app/casos/actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TextoCargando } from "@/components/ui/texto-cargando";
import { filterBotTecnicos, formatFecha } from "@/lib/formato";
import type { CasoListaConEstado } from "@/lib/proveedor/cruce";
import type { CasoGlpiPar } from "@/lib/proveedor/par";
import { useDetalleBajoDemanda } from "@/lib/use-detalle-bajo-demanda";
import { cn } from "@/lib/utils";

interface CuerpoProps {
  caso: CasoListaConEstado;
  // undefined = todavía no llega (o falló).
  detalle: CasoDetalle | undefined;
  cargando: boolean;
  canEdit: boolean;
  onTipoChange: (tipo: string | null) => void;
  modulosCtl: ModulosCtl;
  onModuloChange: (moduloId: string | null) => void;
  // Con pestañas el título del diálogo es el par; el del caso va dentro de su pestaña.
  conTitulo?: boolean;
}

// Cuerpo del detalle de un caso GLPI (sin lógica de carga).
function CasoGlpiCuerpo({ caso, detalle, cargando, canEdit, onTipoChange, modulosCtl, onModuloChange, conTitulo }: CuerpoProps) {
  const [descExpanded, setDescExpanded] = useState(false);
  const [solExpanded, setSolExpanded] = useState(false);

  useEffect(() => {
    setDescExpanded(false);
    setSolExpanded(false);
  }, [caso.id]);

  return (
    <div className="space-y-4 text-sm">
      {conTitulo && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Caso GLPI <span className="font-mono">#{caso.id_glpi}</span>
          </p>
          <h3 className="text-base font-semibold leading-snug">{caso.titulo ?? "Caso"}</h3>
        </div>
      )}

      {/* Sección: Identificación */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Identificación</p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
          <div><span className="text-xs text-muted-foreground">ID GLPI</span><p className="font-mono font-medium">{caso.id_glpi}</p></div>
          <div><span className="text-xs text-muted-foreground">Estado</span><p>{caso.estado_interno}</p></div>
          <div><span className="text-xs text-muted-foreground">Categoría</span><p>{caso.categoria ?? "—"}</p></div>
          <div><span className="text-xs text-muted-foreground">Urgencia</span><p>{caso.urgencia ?? "—"}</p></div>
          {canEdit && (
            <div className="col-span-2">
              <span className="text-xs text-muted-foreground">Tipo</span>
              <Select
                value={caso.tipo ?? "sin_clasificar"}
                onValueChange={(v) => onTipoChange(v === "sin_clasificar" ? null : v)}
              >
                <SelectTrigger className="mt-1 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sin_clasificar">Sin clasificar</SelectItem>
                  <SelectItem value="Requerimiento">Requerimiento</SelectItem>
                  <SelectItem value="Incidencia">Incidencia</SelectItem>
                  <SelectItem value="Proyecto">Proyecto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="col-span-2">
            <span className="text-xs text-muted-foreground">Módulo</span>
            {canEdit ? (
              <ModuloSelect ctl={modulosCtl} value={caso.modulo_id} onChange={onModuloChange} className="mt-1" />
            ) : (
              caso.modulo_id && modulosCtl.nombrePorId.get(caso.modulo_id) ? (
                <ModuloBadge id={caso.modulo_id} nombre={modulosCtl.nombrePorId.get(caso.modulo_id)!} />
              ) : (
                <p>—</p>
              )
            )}
          </div>
        </div>
      </div>

      <div className="border-t" />

      {/* Sección: Partes */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Partes</p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
          <div><span className="text-xs text-muted-foreground">Solicitante</span><p>{caso.solicitante ?? "—"}</p></div>
          <div><span className="text-xs text-muted-foreground">Técnico</span><p>{filterBotTecnicos(caso.tecnico_asignado)}</p></div>
          <div><span className="text-xs text-muted-foreground">Ubicación</span><p>{caso.ubicacion ?? "—"}</p></div>
        </div>
      </div>

      <div className="border-t" />

      {/* Sección: Tiempos y escalamiento */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tiempos y escalamiento</p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
          <div><span className="text-xs text-muted-foreground">F. Apertura</span><p>{formatFecha(caso.fecha_apertura)}</p></div>
          <div><span className="text-xs text-muted-foreground">F. Cierre</span><p>{formatFecha(caso.fecha_cierre)}</p></div>
          <div><span className="text-xs text-muted-foreground">Caso proveedor</span><p className="font-mono">{caso.caso_escalado_proveedor ?? "—"}</p></div>
          <div><span className="text-xs text-muted-foreground">Estado proveedor</span><p>{caso.estado_proveedor_real}</p></div>
        </div>
      </div>

      <div className="border-t" />

      {/* Sección: Descripción */}
      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Descripción</p>
        {cargando ? (
          <TextoCargando />
        ) : detalle?.descripcion ? (
          <>
            <div className={cn("rounded-md bg-muted/40 px-3 py-2 whitespace-pre-wrap leading-relaxed", !descExpanded && "line-clamp-3")}>
              {detalle.descripcion}
            </div>
            {detalle.descripcion.length > 200 && (
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
        {cargando ? (
          <TextoCargando />
        ) : detalle?.solucion ? (
          <>
            <div className={cn("rounded-md bg-muted/40 px-3 py-2 whitespace-pre-wrap leading-relaxed", !solExpanded && "line-clamp-3")}>
              {detalle.solucion}
            </div>
            {detalle.solucion.length > 200 && (
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
      {caso.estado_interno !== "Cerrado" && (cargando || detalle?.seguimientos) && (
        <>
          <div className="border-t" />
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Avance hasta la fecha
            </p>
            {cargando ? (
              <TextoCargando />
            ) : (
              <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 whitespace-pre-wrap leading-relaxed text-sm dark:bg-amber-950/20 dark:border-amber-800">
                {detalle?.seguimientos}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// Detalle de un caso GLPI que la tabla ya tiene en su lista: los textos largos
// se piden por id bajo demanda. `cache` es de la tabla (sobrevive a reabrir).
export function CasoGlpiDetalle({
  caso,
  canEdit,
  cache,
  onTipoChange,
  modulosCtl,
  onModuloChange,
  conTitulo,
}: {
  caso: CasoListaConEstado;
  canEdit: boolean;
  cache: Map<string, CasoDetalle>;
  onTipoChange: (tipo: string | null) => void;
  modulosCtl: ModulosCtl;
  onModuloChange: (moduloId: string | null) => void;
  conTitulo?: boolean;
}) {
  const { detalle, cargando } = useDetalleBajoDemanda(
    caso.id,
    cache,
    getCasoDetalle,
    "Error al cargar el detalle del caso"
  );
  return (
    <CasoGlpiCuerpo
      caso={caso}
      detalle={detalle}
      cargando={cargando}
      canEdit={canEdit}
      onTipoChange={onTipoChange}
      modulosCtl={modulosCtl}
      onModuloChange={onModuloChange}
      conTitulo={conTitulo}
    />
  );
}

// Detalle del caso GLPI emparejado con una tarea (se abre desde la tabla de
// tareas, que no tiene ese caso en su lista). Solo admin: getCasoGlpiPorTarea
// exige rol admin. `cache` va por id_tarea (texto).
export function CasoGlpiDePar({
  idTarea,
  cache,
  modulosCtl,
  conTitulo,
}: {
  idTarea: number;
  cache: Map<string, CasoGlpiPar | null>;
  modulosCtl: ModulosCtl;
  conTitulo?: boolean;
}) {
  const clave = String(idTarea);
  const { detalle: par, cargando, conError, actualizar } = useDetalleBajoDemanda(
    clave,
    cache,
    (k) => getCasoGlpiPorTarea(Number(k)),
    "Error al cargar el caso GLPI"
  );

  function handleTipo(tipo: string | null) {
    if (!par) return;
    const previo = par.caso.tipo;
    const id = par.caso.id;
    actualizar(clave, (p) => (p ? { ...p, caso: { ...p.caso, tipo } } : p));
    updateCasosTipo([id], tipo)
      .then(() => toast.success("Tipo actualizado"))
      .catch((err) => {
        actualizar(clave, (p) => (p ? { ...p, caso: { ...p.caso, tipo: previo } } : p));
        toast.error(err instanceof Error ? err.message : "Error al actualizar");
      });
  }

  function handleModulo(moduloId: string | null) {
    if (!par) return;
    const previo = par.caso.modulo_id;
    const id = par.caso.id;
    actualizar(clave, (p) => (p ? { ...p, caso: { ...p.caso, modulo_id: moduloId } } : p));
    asignarModulo("casos", [id], moduloId).then((res) => {
      if (res.error !== undefined) {
        actualizar(clave, (p) => (p ? { ...p, caso: { ...p.caso, modulo_id: previo } } : p));
        toast.error(res.error);
        return;
      }
      toast.success(moduloId ? "Módulo asignado" : "Módulo eliminado");
    });
  }

  if (cargando) {
    return <TextoCargando />;
  }
  if (!par) {
    return (
      <p className="text-sm text-muted-foreground">
        {conError ? "No se pudo cargar el caso GLPI." : "No se encontró el caso GLPI relacionado."}
      </p>
    );
  }
  return (
    <CasoGlpiCuerpo
      caso={par.caso}
      detalle={par.detalle}
      cargando={false}
      canEdit
      onTipoChange={handleTipo}
      modulosCtl={modulosCtl}
      onModuloChange={handleModulo}
      conTitulo={conTitulo}
    />
  );
}
