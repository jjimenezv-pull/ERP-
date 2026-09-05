"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { DateRange } from "react-day-picker";
import { format } from "date-fns";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DateRangePicker } from "@/components/date-range-picker";
import { resolveDateRange, type Vista } from "@/lib/date-range";

export function DashboardFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { vista, desde, hasta } = resolveDateRange(
    searchParams.get("vista") ?? undefined,
    searchParams.get("desde") ?? undefined,
    searchParams.get("hasta") ?? undefined
  );

  function selectVista(next: Vista) {
    const params = new URLSearchParams();
    params.set("vista", next);
    router.push(`${pathname}?${params.toString()}`);
  }

  function selectCustomRange(range: DateRange | undefined) {
    const params = new URLSearchParams();
    params.set("vista", "custom");
    if (range?.from) params.set("desde", format(range.from, "yyyy-MM-dd"));
    if (range?.to) params.set("hasta", format(range.to, "yyyy-MM-dd"));
    router.push(`${pathname}?${params.toString()}`);
  }

  const dateRange: DateRange | undefined =
    desde || hasta
      ? { from: desde ? new Date(desde) : undefined, to: hasta ? new Date(hasta) : undefined }
      : undefined;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Tabs value={vista} onValueChange={(v) => selectVista(v as Vista)}>
        <TabsList>
          <TabsTrigger value="semanal">Semanal</TabsTrigger>
          <TabsTrigger value="mensual">Mensual</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>
      </Tabs>

      <DateRangePicker value={dateRange} placeholder="Rango personalizado" onChange={selectCustomRange} />
    </div>
  );
}
