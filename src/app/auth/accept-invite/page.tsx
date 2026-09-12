"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AcceptInvitePage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash;
    const params = new URLSearchParams(hash);

    const errorDescription = params.get("error_description");
    if (errorDescription) {
      setError(errorDescription);
      return;
    }

    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    if (!access_token || !refresh_token) {
      setError("El enlace no es válido o expiró. Pide una invitación nueva.");
      return;
    }

    const supabase = createBrowserClient();
    supabase.auth.setSession({ access_token, refresh_token }).then(({ error: sessionError }) => {
      if (sessionError) {
        setError(sessionError.message);
        return;
      }
      // Sirve tanto para aceptar una invitación como para un enlace de
      // restablecer contraseña — en ambos casos el destino es definir una
      // contraseña nueva, no ir directo a /casos.
      window.location.href = "/set-password";
    });
  }, []);

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{error ? "No se pudo aceptar la invitación" : "Confirmando invitación..."}</CardTitle>
        </CardHeader>
        {error && (
          <CardContent>
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
