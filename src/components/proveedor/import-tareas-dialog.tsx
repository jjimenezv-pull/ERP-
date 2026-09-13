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
import { parseTareasProveedor, type ParseResult } from "@/lib/proveedor/parse-tareas";
import { importTareasProveedor } from "@/app/proveedor/import-actions";

type Summary = { nuevos: number; actualizados: number };

export function ImportTareasDialog() {
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [isPending, startTransition] = useTransition();

  function reset() {
    setFileName(null);
    setParseResult(null);
    setSummary(null);
    setFileInputKey((k) => k + 1);
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
      setParseResult(parseTareasProveedor(buffer));
    } catch {
      toast.error("No se pudo leer el archivo. Verifica que sea un .csv válido.");
      setParseResult(null);
    }
  }

  function handleImport() {
    if (!parseResult || parseResult.valid.length === 0) return;
    startTransition(async () => {
      try {
        const result = await importTareasProveedor(parseResult.valid);
        setSummary(result);
        toast.success(
          `Importación completa: ${result.nuevos} tareas nuevas, ${result.actualizados} actualizadas`
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
          Importar CSV
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Importar tareas del proveedor</DialogTitle>
          <DialogDescription>
            Sube el CSV exportado desde la plataforma del proveedor. Las tareas nuevas se crean y
            las existentes se actualizan por su ID de tarea.
          </DialogDescription>
        </DialogHeader>

        <Input
          key={fileInputKey}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          disabled={isPending}
        />

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
            <span className="font-medium">{summary.nuevos}</span> tareas nuevas,{" "}
            <span className="font-medium">{summary.actualizados}</span> actualizadas.
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {summary ? "Cerrar" : "Cancelar"}
          </Button>
          {summary ? (
            <Button variant="outline" onClick={reset}>
              Importar otro archivo
            </Button>
          ) : (
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
