"use client";

import { Bar, BarChart, Cell, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { EstadoInterno } from "@/lib/supabase/types";

// Mismos tokens de color que los badges de estado en la tabla de casos.
const COLOR_BY_ESTADO: Record<EstadoInterno, string> = {
  "En espera": "var(--status-espera)",
  "En curso (asignada)": "var(--status-curso)",
  Cerrado: "var(--status-cerrado)",
};

export function EstadoInternoChart({
  data,
}: {
  data: { estado: EstadoInterno; count: number }[];
}) {
  const chartData = data.map((d) => ({ ...d, fill: COLOR_BY_ESTADO[d.estado] }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Estado actual de los casos</CardTitle>
        <CardDescription>Snapshot de todo el histórico, no depende del periodo seleccionado</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={{}} className="h-[220px] w-full">
          <BarChart data={chartData} barCategoryGap="30%">
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis
              dataKey="estado"
              tickLine={false}
              axisLine={{ stroke: "var(--chart-axis)" }}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            />
            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              width={32}
            />
            <ChartTooltip content={<ChartTooltipContent hideLabel />} cursor={{ fill: "var(--muted)" }} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={80}>
              {chartData.map((entry) => (
                <Cell key={entry.estado} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
