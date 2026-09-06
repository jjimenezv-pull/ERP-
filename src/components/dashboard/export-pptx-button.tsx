"use client";

import { useState } from "react";
import { FileDown } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

const COLOR_TEXT = "1E1E1E";
const COLOR_MUTED = "6B7280";
const COLOR_PRIMARY = "2A78D6";
const COLOR_ESPERA = "F5B400";
const COLOR_CURSO = "1BAF7A";
const COLOR_CERRADO = "1E3A5F";

export interface DashboardExportData {
  rangoLabel: string;
  slaWindowDays: number;
  slaTargetPct: number;
  estadoInterno: { label: string; value: number }[];
  duration: {
    n: number;
    mean: number | null;
    median: number | null;
    p90: number | null;
    withinWindow: number;
    withinWindowPct: number | null;
  };
  backlog: { count: number; oldestDias: number | null; staleCount: number };
  categoria: { label: string; value: number }[];
  urgencia: { label: string; value: number }[];
  tecnico: { label: string; value: number }[];
  estadoProveedor: { label: string; value: number }[];
  volumeTrend: { x: string; y: number }[];
  resolutionTrend: { x: string; y: number | null }[];
  oldestOpen: {
    id_glpi: number;
    titulo: string | null;
    solicitante: string | null;
    dias: number;
    urgencia: string | null;
  }[];
  topSolicitantes: { label: string; value: number }[];
}

function serie(name: string, data: { label: string; value: number }[]) {
  return [{ name, labels: data.map((d) => d.label), values: data.map((d) => d.value) }];
}

export function ExportPptxButton({ data }: { data: DashboardExportData }) {
  const [isExporting, setIsExporting] = useState(false);

  async function handleExport() {
    setIsExporting(true);
    try {
      // Carga diferida: pptxgenjs solo se descarga cuando el usuario exporta.
      const PptxGenJS = (await import("pptxgenjs")).default;
      const pptx = new PptxGenJS();
      pptx.layout = "LAYOUT_16x9";

      const generado = format(new Date(), "dd/MM/yyyy HH:mm");

      const addTitle = (slide: ReturnType<typeof pptx.addSlide>, texto: string) => {
        slide.addText(texto, {
          x: 0.4,
          y: 0.3,
          w: 9.2,
          h: 0.5,
          fontSize: 22,
          bold: true,
          color: COLOR_TEXT,
        });
      };

      // --- Portada ---
      const portada = pptx.addSlide();
      portada.addText("Reporte de Gestión de Casos", {
        x: 0.6,
        y: 1.8,
        w: 8.8,
        h: 0.8,
        fontSize: 36,
        bold: true,
        color: COLOR_PRIMARY,
      });
      portada.addText("Soporte ERP e-Satellite", {
        x: 0.6,
        y: 2.6,
        w: 8.8,
        h: 0.5,
        fontSize: 20,
        color: COLOR_TEXT,
      });
      portada.addText(`Periodo: ${data.rangoLabel}    ·    Generado: ${generado}`, {
        x: 0.6,
        y: 3.2,
        w: 8.8,
        h: 0.4,
        fontSize: 12,
        color: COLOR_MUTED,
      });

      // --- Estado actual ---
      const estado = pptx.addSlide();
      addTitle(estado, "Estado actual");

      const kpis: [string, string][] = [
        [
          "Tiempo de resolución",
          data.duration.mean === null
            ? "Sin casos cerrados"
            : `Promedio ${data.duration.mean.toFixed(1)} d · Mediana ${data.duration.median!.toFixed(
                1
              )} d · P90 ${data.duration.p90!.toFixed(1)} d`,
        ],
        [
          "SLA de resolución",
          data.duration.withinWindowPct === null
            ? "Sin casos cerrados"
            : `${data.duration.withinWindowPct}% (${data.duration.withinWindow}/${data.duration.n}) cerrados en ≤${data.slaWindowDays} días · Meta ≥${data.slaTargetPct}%`,
        ],
        [
          "Antigüedad del backlog",
          data.backlog.oldestDias === null
            ? "No hay casos abiertos"
            : `${data.backlog.oldestDias} días el más antiguo · ${data.backlog.count} abiertos · ${data.backlog.staleCount} con más de 15 días`,
        ],
      ];

      kpis.forEach(([titulo, valor], i) => {
        const y = 1.1 + i * 0.95;
        estado.addText(titulo, { x: 5.3, y, w: 4.3, h: 0.3, fontSize: 12, bold: true, color: COLOR_TEXT });
        estado.addText(valor, { x: 5.3, y: y + 0.32, w: 4.3, h: 0.5, fontSize: 11, color: COLOR_MUTED });
      });

      estado.addChart(pptx.ChartType.bar, serie("Casos", data.estadoInterno), {
        x: 0.4,
        y: 1.0,
        w: 4.6,
        h: 3.9,
        showValue: true,
        chartColors: [COLOR_ESPERA, COLOR_CURSO, COLOR_CERRADO],
        catAxisLabelFontSize: 10,
        valAxisLabelFontSize: 10,
        showLegend: false,
      });

      // --- Distribución ---
      const distribucion = pptx.addSlide();
      addTitle(distribucion, `Distribución — ${data.rangoLabel}`);

      const distCharts: [string, { label: string; value: number }[]][] = [
        ["Por categoría", data.categoria],
        ["Por urgencia", data.urgencia],
        ["Por técnico", data.tecnico],
      ];
      distCharts.forEach(([titulo, serieData], i) => {
        const x = 0.4 + i * 3.15;
        distribucion.addText(titulo, { x, y: 1.0, w: 3, h: 0.3, fontSize: 12, bold: true, color: COLOR_TEXT });
        if (serieData.length === 0) {
          distribucion.addText("Sin datos en el periodo", {
            x,
            y: 1.4,
            w: 3,
            h: 0.3,
            fontSize: 10,
            color: COLOR_MUTED,
          });
          return;
        }
        distribucion.addChart(pptx.ChartType.bar, serie("Casos", serieData), {
          x,
          y: 1.35,
          w: 3,
          h: 3.5,
          barDir: "bar",
          showValue: true,
          chartColors: [COLOR_PRIMARY],
          catAxisLabelFontSize: 8,
          valAxisLabelFontSize: 8,
          showLegend: false,
        });
      });

      // --- Tendencias ---
      const tendencias = pptx.addSlide();
      addTitle(tendencias, "Tendencias (últimas 8 semanas)");

      tendencias.addText("Volumen de casos nuevos", {
        x: 0.4,
        y: 1.0,
        w: 4.4,
        h: 0.3,
        fontSize: 12,
        bold: true,
        color: COLOR_TEXT,
      });
      tendencias.addChart(
        pptx.ChartType.line,
        [
          {
            name: "Casos",
            labels: data.volumeTrend.map((d) => d.x),
            values: data.volumeTrend.map((d) => d.y),
          },
        ],
        {
          x: 0.4,
          y: 1.35,
          w: 4.4,
          h: 3.5,
          chartColors: [COLOR_PRIMARY],
          catAxisLabelFontSize: 9,
          valAxisLabelFontSize: 9,
          showLegend: false,
        }
      );

      tendencias.addText("Tiempo de solución (días promedio)", {
        x: 5.1,
        y: 1.0,
        w: 4.5,
        h: 0.3,
        fontSize: 12,
        bold: true,
        color: COLOR_TEXT,
      });
      tendencias.addChart(
        pptx.ChartType.line,
        [
          {
            name: "Días",
            labels: data.resolutionTrend.map((d) => d.x),
            // PowerPoint deja hueco en los null: no se inventa un 0 falso.
            values: data.resolutionTrend.map((d) => d.y) as number[],
          },
        ],
        {
          x: 5.1,
          y: 1.35,
          w: 4.5,
          h: 3.5,
          chartColors: [COLOR_CURSO],
          catAxisLabelFontSize: 9,
          valAxisLabelFontSize: 9,
          showLegend: false,
        }
      );

      // --- Detalle accionable ---
      const detalle = pptx.addSlide();
      addTitle(detalle, "Detalle accionable");

      detalle.addText("Casos abiertos más antiguos", {
        x: 0.4,
        y: 1.0,
        w: 5.6,
        h: 0.3,
        fontSize: 12,
        bold: true,
        color: COLOR_TEXT,
      });
      detalle.addTable(
        [
          [
            { text: "ID", options: { bold: true } },
            { text: "Título", options: { bold: true } },
            { text: "Días", options: { bold: true } },
          ],
          ...data.oldestOpen.map((c) => [
            { text: String(c.id_glpi) },
            { text: (c.titulo ?? "—").slice(0, 60) },
            { text: String(c.dias) },
          ]),
        ],
        {
          x: 0.4,
          y: 1.35,
          w: 5.6,
          colW: [0.8, 4.0, 0.8],
          fontSize: 9,
          border: { type: "solid", pt: 0.5, color: "DDDDDD" },
        }
      );

      detalle.addText("Top solicitantes", {
        x: 6.3,
        y: 1.0,
        w: 3.3,
        h: 0.3,
        fontSize: 12,
        bold: true,
        color: COLOR_TEXT,
      });
      detalle.addTable(
        [
          [
            { text: "Solicitante", options: { bold: true } },
            { text: "Casos", options: { bold: true } },
          ],
          ...data.topSolicitantes.map((s) => [{ text: s.label.slice(0, 40) }, { text: String(s.value) }]),
        ],
        {
          x: 6.3,
          y: 1.35,
          w: 3.3,
          colW: [2.5, 0.8],
          fontSize: 9,
          border: { type: "solid", pt: 0.5, color: "DDDDDD" },
        }
      );

      await pptx.writeFile({
        fileName: `reporte-casos-${format(new Date(), "yyyy-MM-dd")}.pptx`,
      });
      toast.success("Reporte descargado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo generar el reporte");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <Button variant="outline" onClick={handleExport} disabled={isExporting}>
      <FileDown className="mr-2 h-4 w-4" />
      {isExporting ? "Generando..." : "Descargar PPTX"}
    </Button>
  );
}
