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

export function OpenVsClosedChart({ abiertos, cerrados }: { abiertos: number; cerrados: number }) {
  const data = [
    { name: "Abiertos", value: abiertos, fill: "var(--chart-1)" },
    { name: "Cerrados", value: cerrados, fill: "var(--chart-3)" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Casos abiertos vs cerrados</CardTitle>
        <CardDescription>Por fecha de apertura / cierre en el periodo seleccionado</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={{}} className="h-[260px] w-full">
          <BarChart data={data} barCategoryGap="35%">
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis
              dataKey="name"
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
            <ChartTooltip content={<ChartTooltipContent />} cursor={{ fill: "var(--muted)" }} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={80} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
