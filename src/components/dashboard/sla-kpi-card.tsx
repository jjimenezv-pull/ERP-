import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const SLA_TARGET_PCT = 90;

export function SlaKpiCard({
  windowDays,
  withinWindow,
  total,
  pct,
}: {
  windowDays: number;
  withinWindow: number;
  total: number;
  pct: number | null;
}) {
  const meetsTarget = pct !== null && pct >= SLA_TARGET_PCT;

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>SLA de resolución</CardTitle>
        <CardDescription>
          Objetivo: resolver los casos rápido y de forma confiable — Meta: ≥{SLA_TARGET_PCT}% en ≤{windowDays} días
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 items-center">
        {pct === null ? (
          <p className="text-sm text-muted-foreground">Sin casos cerrados en el periodo.</p>
        ) : (
          <div className="flex items-baseline gap-2">
            <span
              className={cn(
                "text-4xl font-semibold tabular-nums",
                meetsTarget ? "text-[var(--status-curso)]" : "text-destructive"
              )}
            >
              {pct}%
            </span>
            <span className="text-sm text-muted-foreground">
              {withinWindow}/{total} casos cerrados en ≤{windowDays} días
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
