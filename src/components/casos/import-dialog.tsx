"use client";

import { useState, useTransition } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { parseCasosXlsx, type ParseResult } from "@/lib/xlsx/parse-casos";
import { importCasos } from "@/app/casos/import-actions";

type Summary = { nuevos: number; actualizados: number };

export function ImportDialog() {
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [isPending, startTransition] = useTransition();

  function reset() {
    setFileName(null);
    setParseResult(null);
    setSummary(null);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setSummary(null);
    if (!file) {
      setFileName(null);
      setParseResult(null);
      return;
    }
    setFileName(file.name);
    try {
      const buffer = await file.arrayBuffer();
      setParseResult(parseCasosXlsx(buffer));
    } catch {
      toast.error("No se pudo leer el archivo. Verifica que sea un .xlsx válido.");
      setParseResult(null);
    }
  }

  function handleImport() {
    if (!parseResult || parseResult.valid.length === 0) return;
    startTransition(async () => {
      try {
        const result = await importCasos(parseResult.valid);
        setSummary(result);
        toast.success(
          `Importación completa: ${result.nuevos} casos nuevos, ${result.actualizados} actualizados`
        );
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error al importar el archivo");
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="mr-2 h-4 w-4" />
          Importar XLSX
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Importar casos desde XLSX</DialogTitle>
          <DialogDescription>
            Sube el archivo exportado semanalmente desde GLPI. Los casos nuevos se crean y los
            existentes se actualizan sin tocar el seguimiento manual del proveedor.
          </DialogDescription>
        </DialogHeader>

        <Input type="file" accept=".xlsx" onChange={handleFileChange} disabled={isPending} />

        {fileName && parseResult && !summary && (
          <div className="space-y-2 text-sm">
            <p>
              <span className="font-medium">{parseResult.valid.length}</span> filas listas para
              importar
              {parseResult.errores.length > 0 && (
                <>
                  {" "}
                  · <span className="font-medium text-destructive">
                    {parseResult.errores.length}
                  </span>{" "}
                  con errores (se omitirán)
                </>
              )}
            </p>
            {parseResult.errores.length > 0 && (
              <ul className="max-h-32 space-y-0.5 overflow-y-auto rounded-md border p-2 text-xs text-muted-foreground">
                {parseResult.errores.slice(0, 20).map((e, i) => (
                  <li key={i}>
                    Fila {e.fila}: {e.motivo}
                  </li>
                ))}
                {parseResult.errores.length > 20 && (
                  <li>+ {parseResult.errores.length - 20} errores más</li>
                )}
              </ul>
            )}
          </div>
        )}

        {summary && (
          <div className="rounded-md border bg-muted/50 p-3 text-sm">
            <span className="font-medium">{summary.nuevos}</span> casos nuevos,{" "}
            <span className="font-medium">{summary.actualizados}</span> actualizados.
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {summary ? "Cerrar" : "Cancelar"}
          </Button>
          {!summary && (
            <Button
              onClick={handleImport}
              disabled={!parseResult || parseResult.valid.length === 0 || isPending}
            >
              {isPending ? "Importando..." : "Importar"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
