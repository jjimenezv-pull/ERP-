"use client";

import { useState, useTransition } from "react";
import { UserPlus } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { invitarUsuario } from "@/app/usuarios/actions";

export function InviteUserDialog() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleInvite() {
    if (!email.trim()) return;
    startTransition(async () => {
      try {
        await invitarUsuario(email.trim());
        toast.success(`Invitación enviada a ${email.trim()}`);
        setEmail("");
        setOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error al invitar al usuario");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Invitar usuario
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invitar usuario</DialogTitle>
          <DialogDescription>
            Le llega un correo con un enlace para entrar por primera vez y definir su contraseña.
            Empieza con rol Visualizador.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="invite-email">Correo</Label>
          <Input
            id="invite-email"
            type="email"
            placeholder="nombre@empresa.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isPending}
          />
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleInvite} disabled={!email.trim() || isPending}>
            {isPending ? "Invitando..." : "Invitar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
