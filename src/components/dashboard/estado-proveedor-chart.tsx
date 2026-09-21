"use client";

import { Cell, Pie, PieChart } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

// Colores por estado real del proveedor. "No escalado" (el grueso de los casos) y
// "Sin match" van en tonos neutros para que no compitan con los estados reales;
// un estado nuevo que aparezca en un import cae en el neutro hasta agregarlo aquí.
const COLOR_BY_ESTADO: Record<string, string> = {
  "No escalado": "var(--chart-axis)",
  "Sin match": "var(--muted-foreground)",
  "En Desarrollo": "var(--chart-1)",
  "Pendiente Cliente": "var(--chart-2)",
  "En Revision": "var(--chart-3)",
  Cerrada: "var(--chart-4)",
  Caducada: "var(--chart-5)",
};
const COLOR_FALLBACK = "var(--muted-foreground)";

export function EstadoProveedorChart({
  data,
}: {
  data: { estado: string; count: number }[];
}) {
  const chartData = data
    .filter((d) => d.count > 0)
    .map((d) => ({ name: d.estado, value: d.count, fill: COLOR_BY_ESTADO[d.estado] ?? COLOR_FALLBACK }));

  const total = chartData.reduce((sum, d) => sum + d.value, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribución por estado proveedor</CardTitle>
        <CardDescription>Casos del periodo seleccionado, por estado de escalado</CardDescription>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Sin casos en el periodo.</p>
        ) : (
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <ChartContainer config={{}} className="h-[220px] w-[220px] shrink-0">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="name" />} />
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={90}
                  // Con una sola porción (100%), Recharts calcula mal el ángulo del arco
                  // si paddingAngle > 0 (queda como una línea en vez de un anillo completo).
                  paddingAngle={chartData.length > 1 ? 2 : 0}
                  strokeWidth={2}
                  stroke="var(--card)"
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <ul className="space-y-1.5 text-sm">
              {chartData.map((entry) => (
                <li key={entry.name} className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                    style={{ backgroundColor: entry.fill }}
                  />
                  <span className="text-muted-foreground">{entry.name}</span>
                  <span className="ml-auto font-mono font-medium tabular-nums">{entry.value}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
