"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Tipo } from "@/lib/supabase/types";
import type { Uso } from "./fila-etiqueta";
import { ModulosPanel, type ModuloAjuste } from "./modulos-panel";
import { TiposPanel } from "./tipos-panel";

export function AjustesTabs({
  tipos,
  modulos,
  usoTipos,
  usoModulos,
}: {
  tipos: Tipo[];
  modulos: ModuloAjuste[];
  usoTipos: Record<string, Uso>;
  usoModulos: Record<string, Uso>;
}) {
  return (
    <Tabs defaultValue="tipos">
      <TabsList>
        <TabsTrigger value="tipos">Tipos</TabsTrigger>
        <TabsTrigger value="modulos">Módulos</TabsTrigger>
      </TabsList>
      <TabsContent value="tipos" className="mt-4">
        <TiposPanel tipos={tipos} uso={usoTipos} />
      </TabsContent>
      <TabsContent value="modulos" className="mt-4">
        <ModulosPanel modulos={modulos} uso={usoModulos} />
      </TabsContent>
    </Tabs>
  );
}
