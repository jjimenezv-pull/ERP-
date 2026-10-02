import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const URGENCIA_CLASS: Record<string, string> = {
  "Muy alta": "border-transparent bg-[var(--urgency-muy-alta)] text-[var(--urgency-muy-alta-fg)]",
  "Alta":     "border-transparent bg-[var(--urgency-alta)] text-[var(--urgency-alta-fg)]",
  "Media":    "border-transparent bg-[var(--urgency-media)] text-[var(--urgency-media-fg)]",
  "Mediana":  "border-transparent bg-[var(--urgency-media)] text-[var(--urgency-media-fg)]",
  "Baja":     "border-transparent bg-[var(--urgency-baja)] text-[var(--urgency-baja-fg)]",
  "Muy baja": "border-transparent bg-[var(--urgency-muy-baja)] text-[var(--urgency-muy-baja-fg)]",
};

export function OldestOpenCasesList({
  data,
}: {
  data: {
    id_glpi: number;
    titulo: string | null;
    solicitante: string | null;
    dias: number;
    urgencia: string | null;
  }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Casos abiertos más antiguos</CardTitle>
        <CardDescription>Los que más tiempo llevan esperando resolución</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No hay casos abiertos.</p>
        ) : (
          <ul className="divide-y">
            {data.map((c) => (
              <li key={c.id_glpi} className="flex items-center gap-3 py-2 text-sm">
                <span className="font-mono text-xs text-muted-foreground">{c.id_glpi}</span>
                <span className="flex-1 truncate" title={c.titulo ?? ""}>
                  {c.titulo ?? "—"}
                </span>
                <span className="w-32 shrink-0 truncate text-muted-foreground" title={c.solicitante ?? ""}>
                  {c.solicitante ?? "—"}
                </span>
                {c.urgencia && (
                  <Badge variant="outline" className={cn("shrink-0", URGENCIA_CLASS[c.urgencia] ?? "")}>
                    {c.urgencia}
                  </Badge>
                )}
                <span className="w-20 shrink-0 text-right font-medium tabular-nums">
                  {c.dias} día{c.dias === 1 ? "" : "s"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
