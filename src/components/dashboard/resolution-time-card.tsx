import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0 flex-1 px-2 text-center first:pl-0 last:pr-0">
      <p className="text-3xl font-bold leading-none tabular-nums sm:text-4xl">{value.toFixed(1)}</p>
      <p className="mt-2 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export function ResolutionTimeCard({
  mean,
  median,
  p90,
  casosConsiderados,
}: {
  mean: number | null;
  median: number | null;
  p90: number | null;
  casosConsiderados: number;
}) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>Tiempo de resolución (días)</CardTitle>
        <CardDescription>Casos cerrados en el periodo (fecha de cierre − fecha de apertura)</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 items-center">
        {mean === null || median === null || p90 === null ? (
          <p className="text-sm text-muted-foreground">Sin casos cerrados en el periodo.</p>
        ) : (
          <div className="flex w-full divide-x divide-border">
            <Stat label="Promedio" value={mean} />
            <Stat label="Mediana" value={median} />
            <Stat label="P90" value={p90} />
          </div>
        )}
      </CardContent>
      {casosConsiderados > 0 && (
        <p className="px-6 pb-4 text-xs text-muted-foreground">
          Sobre {casosConsiderados} caso{casosConsiderados === 1 ? "" : "s"} cerrado
          {casosConsiderados === 1 ? "" : "s"}
        </p>
      )}
    </Card>
  );
}
