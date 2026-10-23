import { Badge } from "@/components/ui/badge";
import { claseEtiqueta } from "@/lib/etiquetas";
import { cn } from "@/lib/utils";

// Etiqueta de color (tipo o módulo): Badge outline con relleno sólido de la paleta.
export function EtiquetaBadge({
  nombre,
  clave,
  fallbackId,
  className,
}: {
  nombre: string;
  clave?: string | null;
  fallbackId?: string;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn("max-w-full", claseEtiqueta(clave, fallbackId), className)}>
      <span className="truncate">{nombre}</span>
    </Badge>
  );
}
