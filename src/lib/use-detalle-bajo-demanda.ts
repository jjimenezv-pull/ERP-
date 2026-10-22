import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

// Tras un refresh de la lista (p. ej. reimport) los textos cacheados pueden
// estar viejos, pero el del ítem abierto se conserva: editar el tipo desde el
// diálogo dispara ese refresh y, sin esto, quedaría el placeholder de carga.
export function limpiarCacheSalvo<T>(cache: Map<string, T>, abierto: string | null) {
  const hay = abierto !== null && cache.has(abierto);
  const vigente = hay ? cache.get(abierto) : undefined;
  cache.clear();
  if (abierto !== null && hay) cache.set(abierto, vigente as T);
}

// Carga un detalle bajo demanda y lo guarda en `cache` (que pertenece a la
// tabla, así sobrevive a cerrar/reabrir el diálogo). `T` puede incluir null
// ("no existe"). Una respuesta tardía de otro id nunca se muestra: el valor se
// lee del cache por el id actual, y el estado de carga/error se descarta si el
// id cambió; el cache sí se llena, así reabrir es instantáneo.
export function useDetalleBajoDemanda<T>(
  id: string | null,
  cache: Map<string, T>,
  cargar: (id: string) => Promise<T>,
  mensajeError: string
) {
  const [, setVersion] = useState(0);
  const [errorId, setErrorId] = useState<string | null>(null);
  const cargarRef = useRef(cargar);
  cargarRef.current = cargar;
  const mensajeRef = useRef(mensajeError);
  mensajeRef.current = mensajeError;

  useEffect(() => {
    if (id === null) return;
    setErrorId(null);
    if (cache.has(id)) return;

    let cancelado = false;
    cargarRef
      .current(id)
      .then((detalle) => {
        cache.set(id, detalle);
        if (!cancelado) setVersion((n) => n + 1);
      })
      .catch((err) => {
        if (cancelado) return;
        setErrorId(id);
        toast.error(err instanceof Error ? err.message : mensajeRef.current);
      });
    return () => {
      cancelado = true;
    };
  }, [id, cache]);

  // Edición local del valor ya cargado (cambio optimista de tipo, etc.).
  const actualizar = useCallback(
    (clave: string, fn: (previo: T) => T) => {
      if (!cache.has(clave)) return;
      cache.set(clave, fn(cache.get(clave) as T));
      setVersion((n) => n + 1);
    },
    [cache]
  );

  const detalle = id !== null && cache.has(id) ? (cache.get(id) as T) : undefined;
  const cargando = id !== null && detalle === undefined && errorId !== id;
  const conError = id !== null && detalle === undefined && errorId === id;
  return { detalle, cargando, conError, actualizar };
}
