"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type LadoPar = "glpi" | "proveedor";

// Detalle de un caso GLPI emparejado con una tarea del proveedor: dos pestañas
// (proveedor primero). Cada lado se monta recién al visitarlo, así el otro
// lado no se pide hasta que se necesita, y se queda montado al cambiar de
// pestaña (no vuelve a cargar ni pierde "Ver más").
export function ParDetalleTabs({
  inicial,
  glpi,
  proveedor,
}: {
  inicial: LadoPar;
  glpi: React.ReactNode;
  proveedor: React.ReactNode;
}) {
  const [lado, setLado] = useState<LadoPar>(inicial);
  const [visitados, setVisitados] = useState<ReadonlySet<LadoPar>>(() => new Set([inicial]));

  function cambiar(valor: string) {
    const nuevo: LadoPar = valor === "glpi" ? "glpi" : "proveedor";
    setLado(nuevo);
    setVisitados((prev) => (prev.has(nuevo) ? prev : new Set(prev).add(nuevo)));
  }

  return (
    <Tabs value={lado} onValueChange={cambiar}>
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="proveedor">Caso proveedor</TabsTrigger>
        <TabsTrigger value="glpi">Caso GLPI</TabsTrigger>
      </TabsList>
      <TabsContent value="proveedor" forceMount className="mt-4 data-[state=inactive]:hidden">
        {visitados.has("proveedor") && proveedor}
      </TabsContent>
      <TabsContent value="glpi" forceMount className="mt-4 data-[state=inactive]:hidden">
        {visitados.has("glpi") && glpi}
      </TabsContent>
    </Tabs>
  );
}
