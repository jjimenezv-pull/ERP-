"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

const MAX_LABEL_LENGTH = 18;

// Nombres largos desbordan el ancho del eje Y y Recharts los parte en varias líneas.
// Se recorta la etiqueta visible y se conserva el nombre completo para el tooltip.
function truncateNombre(nombre: string) {
  return nombre.length > MAX_LABEL_LENGTH
    ? `${nombre.slice(0, MAX_LABEL_LENGTH - 1).trimEnd()}…`
    : nombre;
}

export function TopSolicitantesChart({ data }: { data: { nombre: string; count: number }[] }) {
  const chartData = [...data]
    .sort((a, b) => a.count - b.count) // ascendente: el más alto queda arriba en barras horizontales
    .map((d) => ({ ...d, nombreCorto: truncateNombre(d.nombre) }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top 5 solicitantes</CardTitle>
        <CardDescription>Con más casos abiertos en el periodo seleccionado</CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Sin casos en el periodo.</p>
        ) : (
          <ChartContainer config={{ count: { label: "Casos" } }} className="h-[260px] w-full">
            <BarChart data={chartData} layout="vertical" margin={{ left: 8 }}>
              <CartesianGrid horizontal={false} stroke="var(--chart-grid)" />
              <XAxis
                type="number"
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              />
              <YAxis
                type="category"
                dataKey="nombreCorto"
                tickLine={false}
                axisLine={{ stroke: "var(--chart-axis)" }}
                tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                width={110}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.nombre}
                  />
                }
                cursor={{ fill: "var(--muted)" }}
              />
              <Bar dataKey="count" fill="var(--chart-1)" radius={[0, 4, 4, 0]} maxBarSize={28} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
