import { NextResponse, type NextRequest } from "next/server";
import { createMiddlewareClient, withSessionCookies } from "@/lib/supabase/middleware";

const PUBLIC_PATHS = ["/login", "/auth/callback", "/auth/accept-invite"];

export async function middleware(request: NextRequest) {
  const { supabase, getResponse } = createMiddlewareClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((path) => pathname.startsWith(path));

  const redirectTo = (path: string) =>
    withSessionCookies(getResponse(), NextResponse.redirect(new URL(path, request.url)));

  if (!user && !isPublic) {
    return redirectTo("/login");
  }

  if (user && pathname === "/login") {
    return redirectTo("/casos");
  }

  // Puerta obligatoria de "primer login": mientras no haya definido una
  // contraseña, se manda a /set-password sin importar por dónde haya
  // entrado (magic link, invitación, etc.) - reusa el mismo cliente
  // anon-key de arriba, permitido por la política profiles_select_own.
  if (user && !isPublic && pathname !== "/set-password") {
    // app_metadata solo se escribe con service_role (user_metadata sí lo edita el
    // usuario, por eso no se usa). La marca la pone establecerPassword; sin ella
    // se consulta `profiles`, que sigue siendo la fuente de verdad.
    if (user.app_metadata?.password_set !== true) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("password_set")
        .eq("id", user.id)
        .single();
      if (profile && !profile.password_set) {
        return redirectTo("/set-password");
      }
    }
  }

  return getResponse();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
