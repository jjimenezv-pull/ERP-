"use client";

import { useState, useTransition } from "react";
import { Eye, EyeOff, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { sendMagicLink, signInWithPassword } from "@/app/login/actions";

function mapLoginError(msg: string): string {
  if (msg.includes("Invalid login credentials"))
    return "Correo o contraseña incorrectos. Verifica tus datos e intenta de nuevo.";
  if (msg.includes("Email not confirmed"))
    return "Este correo no ha sido verificado. Usa el enlace de acceso.";
  if (msg.includes("Too many requests"))
    return "Demasiados intentos fallidos. Espera unos minutos antes de volver a intentarlo.";
  if (msg.includes("User not found") || msg.includes("user_not_found"))
    return "Este correo no tiene permiso para acceder al sistema.";
  return "No se pudo iniciar sesión. Intenta de nuevo.";
}

function PasswordTab() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setError(null);
    startTransition(async () => {
      try {
        await signInWithPassword(email.trim(), password);
      } catch (err) {
        setError(mapLoginError(err instanceof Error ? err.message : "Error"));
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="password-email">Correo</Label>
        <Input
          id="password-email"
          type="email"
          required
          autoComplete="email"
          placeholder="nombre@empresa.com"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError(null); }}
          disabled={isPending}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Contraseña</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(null); }}
            disabled={isPending}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Ingresando..." : "Ingresar"}
      </Button>
      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-center text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}

function MagicLinkTab() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        await sendMagicLink(email.trim());
        setSent(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo enviar el enlace. Intenta de nuevo.");
      }
    });
  }

  if (sent) {
    return (
      <p className="text-sm text-muted-foreground">
        Revisa tu correo (<span className="font-medium">{email}</span>) y haz clic en el enlace
        para entrar.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        ¿Primera vez o olvidaste tu contraseña? Te enviamos un enlace de acceso por correo.
      </p>
      <div className="space-y-2">
        <Label htmlFor="magic-email">Correo</Label>
        <Input
          id="magic-email"
          type="email"
          required
          autoComplete="email"
          placeholder="nombre@empresa.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isPending}
        />
      </div>
      <Button type="submit" className="w-full" disabled={isPending}>
        <Mail className="mr-2 h-4 w-4" />
        {isPending ? "Enviando..." : "Enviar enlace de acceso"}
      </Button>
      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-center text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}

export function LoginForm() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Iniciar sesión</CardTitle>
        <CardDescription>Entra con tu contraseña o pide un enlace de acceso.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="password">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="password">Contraseña</TabsTrigger>
            <TabsTrigger value="magic-link">Enlace de acceso</TabsTrigger>
          </TabsList>
          <TabsContent value="password">
            <PasswordTab />
          </TabsContent>
          <TabsContent value="magic-link">
            <MagicLinkTab />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
