"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

export function ResolutionTrendChart({
  data,
}: {
  data: { semana: string; diasPromedio: number | null }[];
}) {
  const hasData = data.some((d) => d.diasPromedio !== null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tendencia de tiempo de solución</CardTitle>
        <CardDescription>Promedio de días para cerrar un caso, últimas 8 semanas</CardDescription>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Sin casos cerrados en las últimas 8 semanas.
          </p>
        ) : (
          <ChartContainer config={{ diasPromedio: { label: "Días promedio" } }} className="h-[260px] w-full">
            <LineChart data={data} margin={{ left: 8, right: 8 }}>
              <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
              <XAxis
                dataKey="semana"
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
              <ChartTooltip content={<ChartTooltipContent />} cursor={{ stroke: "var(--chart-axis)" }} />
              <Line
                dataKey="diasPromedio"
                type="monotone"
                stroke="var(--chart-1)"
                strokeWidth={2}
                dot={{ r: 3, fill: "var(--chart-1)" }}
                connectNulls
              />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
