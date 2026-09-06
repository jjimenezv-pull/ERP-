import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function BacklogAgingCard({
  count,
  oldestDias,
  staleCount,
}: {
  count: number;
  oldestDias: number | null;
  staleCount: number;
}) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>Antigüedad del backlog</CardTitle>
        <CardDescription>Casos abiertos ahora mismo, sin importar cuándo se crearon</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 items-center">
        {oldestDias === null ? (
          <p className="text-sm text-muted-foreground">No hay casos abiertos.</p>
        ) : (
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-semibold tabular-nums">{oldestDias}</span>
            <span className="text-sm text-muted-foreground">
              días el caso abierto más antiguo · {count} caso{count === 1 ? "" : "s"} abierto
              {count === 1 ? "" : "s"} en total
              {staleCount > 0 && (
                <>
                  {" "}
                  ·{" "}
                  <span className={cn("font-medium text-destructive")}>
                    {staleCount} con más de 15 días
                  </span>
                </>
              )}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
