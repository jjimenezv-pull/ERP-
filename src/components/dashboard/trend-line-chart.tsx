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

export function TrendLineChart({
  title,
  description,
  data,
  valueLabel,
  emptyMessage = "Sin datos en el rango.",
}: {
  title: string;
  description: string;
  data: { x: string; y: number | null }[];
  valueLabel: string;
  emptyMessage?: string;
}) {
  const hasData = data.some((d) => d.y !== null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <p className="py-10 text-center text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          <ChartContainer config={{ y: { label: valueLabel } }} className="h-[260px] w-full">
            <LineChart data={data} margin={{ left: 8, right: 8 }}>
              <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
              <XAxis
                dataKey="x"
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
                dataKey="y"
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
