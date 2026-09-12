"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { UserRole } from "@/lib/supabase/types";
import { cambiarRolUsuario, bloquearUsuario } from "@/app/usuarios/actions";

export type Usuario = {
  id: string;
  email: string;
  role: UserRole;
  confirmado: boolean;
  bloqueado: boolean;
};

export function UsuariosTable({
  usuarios,
  currentUserId,
}: {
  usuarios: Usuario[];
  currentUserId: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleRolChange(id: string, role: UserRole) {
    startTransition(async () => {
      try {
        await cambiarRolUsuario(id, role);
        toast.success("Rol actualizado");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error al cambiar el rol");
      }
    });
  }

  function handleBloquear(id: string, bloquear: boolean) {
    startTransition(async () => {
      try {
        await bloquearUsuario(id, bloquear);
        toast.success(bloquear ? "Usuario bloqueado" : "Usuario desbloqueado");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error al actualizar el usuario");
      }
    });
  }

  if (usuarios.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center text-sm text-muted-foreground">
        No hay usuarios todavía.
      </div>
    );
  }

  return (
    <Table containerClassName="rounded-md border">
      <TableHeader>
        <TableRow>
          <TableHead>Correo</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead className="min-w-[160px]">Rol</TableHead>
          <TableHead className="min-w-[140px]">Acceso</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {usuarios.map((usuario) => {
          const esUnoMismo = usuario.id === currentUserId;
          return (
            <TableRow key={usuario.id}>
              <TableCell className="max-w-[280px] truncate" title={usuario.email}>
                {usuario.email}
              </TableCell>
              <TableCell>
                {usuario.bloqueado ? (
                  <Badge variant="destructive">Bloqueado</Badge>
                ) : usuario.confirmado ? (
                  <Badge variant="outline">Activo</Badge>
                ) : (
                  <Badge variant="secondary">Pendiente</Badge>
                )}
              </TableCell>
              <TableCell>
                <Select
                  value={usuario.role}
                  onValueChange={(v) => handleRolChange(usuario.id, v as UserRole)}
                  disabled={isPending || esUnoMismo}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="viewer">Visualizador</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <Button
                  variant={usuario.bloqueado ? "outline" : "destructive"}
                  size="sm"
                  disabled={isPending || esUnoMismo}
                  onClick={() => handleBloquear(usuario.id, !usuario.bloqueado)}
                >
                  {usuario.bloqueado ? "Desbloquear" : "Bloquear"}
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
