"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ArrowDown, ArrowUp } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { cn } from "@/lib/utils";

function DeltaStat({
  label,
  value,
  delta,
}: {
  label: string;
  value: number;
  delta: number | null;
}) {
  return (
    <div className="rounded-md border p-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="flex items-baseline gap-1.5">
        <span className="text-lg font-semibold tabular-nums">{value}</span>
        {delta !== null && (
          <span
            className={cn(
              "flex items-center gap-0.5 text-xs font-medium text-muted-foreground",
              delta === 0 && "text-muted-foreground"
            )}
          >
            {delta > 0 && <ArrowUp className="h-3 w-3" />}
            {delta < 0 && <ArrowDown className="h-3 w-3" />}
            {delta === 0 ? "sin cambio" : `${Math.abs(delta)}% vs periodo anterior`}
          </span>
        )}
      </div>
    </div>
  );
}

export function OpenVsClosedChart({
  abiertos,
  cerrados,
  abiertosDelta,
  cerradosDelta,
}: {
  abiertos: number;
  cerrados: number;
  abiertosDelta: number | null;
  cerradosDelta: number | null;
}) {
  const data = [
    { name: "Casos nuevos", value: abiertos, fill: "var(--chart-1)" },
    { name: "Casos cerrados", value: cerrados, fill: "var(--chart-3)" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Casos nuevos vs cerrados</CardTitle>
        <CardDescription>
          Por fecha de apertura / cierre en el periodo — conteos independientes: un caso
          cuenta en ambos si se abrió y cerró en el mismo periodo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={{}} className="h-[220px] w-full">
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
        <div className="mt-3 grid grid-cols-2 gap-3">
          <DeltaStat label="Casos nuevos" value={abiertos} delta={abiertosDelta} />
          <DeltaStat label="Casos cerrados" value={cerrados} delta={cerradosDelta} />
        </div>
      </CardContent>
    </Card>
  );
}
