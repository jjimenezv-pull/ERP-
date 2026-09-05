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

// Etiquetas largas desbordan el ancho del eje Y y Recharts las parte en varias líneas.
// Se recorta la etiqueta visible y se conserva el texto completo para el tooltip.
function truncateLabel(label: string) {
  return label.length > MAX_LABEL_LENGTH
    ? `${label.slice(0, MAX_LABEL_LENGTH - 1).trimEnd()}…`
    : label;
}

export function RankedBarChart({
  title,
  description,
  data,
  emptyMessage = "Sin casos en el periodo.",
  valueLabel = "Casos",
}: {
  title: string;
  description: string;
  data: { label: string; value: number }[];
  emptyMessage?: string;
  valueLabel?: string;
}) {
  const chartData = [...data]
    .sort((a, b) => a.value - b.value) // ascendente: el más alto queda arriba en barras horizontales
    .map((d) => ({ ...d, labelCorto: truncateLabel(d.label) }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          <ChartContainer config={{ value: { label: valueLabel } }} className="h-[260px] w-full">
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
                dataKey="labelCorto"
                tickLine={false}
                axisLine={{ stroke: "var(--chart-axis)" }}
                tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                width={110}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.label}
                  />
                }
                cursor={{ fill: "var(--muted)" }}
              />
              <Bar dataKey="value" fill="var(--chart-1)" radius={[0, 4, 4, 0]} maxBarSize={28} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
