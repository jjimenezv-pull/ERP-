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
import type { EstadoProveedor } from "@/lib/supabase/types";

// Orden fijo validado (adyacente en el anillo de la dona): ver scripts/validate_palette.js
// de la skill dataviz. La paleta de "status" (good/warning/serious) no pasa el validador
// para 4 categorías comparadas entre sí, por eso se usa la paleta categórica.
const COLOR_BY_ESTADO: Record<EstadoProveedor, string> = {
  "N/A": "var(--chart-1)",
  Pendiente: "var(--chart-2)",
  "En revisión": "var(--chart-3)",
  Resuelto: "var(--chart-4)",
};

export function EstadoProveedorChart({
  data,
}: {
  data: { estado: EstadoProveedor; count: number }[];
}) {
  const chartData = data
    .filter((d) => d.count > 0)
    .map((d) => ({ name: d.estado, value: d.count, fill: COLOR_BY_ESTADO[d.estado] }));

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
            <ChartContainer config={{}} className="h-[220px] w-[220px]">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="name" />} />
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={2}
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
