import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function ProviderEscalationCard({
  pendientes,
  total,
}: {
  pendientes: number;
  total: number;
}) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>Escalados a proveedor</CardTitle>
        <CardDescription>Casos esperando respuesta de un proveedor externo, ahora mismo</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 items-center">
        <span
          className={cn(
            "text-3xl font-bold leading-none tabular-nums sm:text-4xl",
            pendientes > 0 ? "text-destructive" : "text-[var(--status-curso)]"
          )}
        >
          {pendientes}
        </span>
      </CardContent>
      <p className="px-6 pb-4 text-xs text-muted-foreground">
        {pendientes === 0
          ? "Ninguno pendiente"
          : `pendiente${pendientes === 1 ? "" : "s"} de ${total} escalado${total === 1 ? "" : "s"} en total`}
      </p>
    </Card>
  );
}
