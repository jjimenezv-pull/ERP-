import { Skeleton } from "@/components/ui/skeleton";

// Placeholder mientras llegan los textos largos de un detalle.
export function TextoCargando() {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Cargando">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
    </div>
  );
}
