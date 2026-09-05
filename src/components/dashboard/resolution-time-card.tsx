import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ResolutionTimeCard({
  promedioDias,
  casosConsiderados,
}: {
  promedioDias: number | null;
  casosConsiderados: number;
}) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>Tiempo promedio de resolución</CardTitle>
        <CardDescription>Casos cerrados en el periodo (fecha de cierre − fecha de apertura)</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 items-center">
        {promedioDias === null ? (
          <p className="text-sm text-muted-foreground">Sin casos cerrados en el periodo.</p>
        ) : (
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-semibold tabular-nums">{promedioDias.toFixed(1)}</span>
            <span className="text-sm text-muted-foreground">
              días promedio · sobre {casosConsiderados} caso{casosConsiderados === 1 ? "" : "s"} cerrado
              {casosConsiderados === 1 ? "" : "s"}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
