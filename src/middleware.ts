import { NextResponse, type NextRequest } from "next/server";
import { createMiddlewareClient } from "@/lib/supabase/middleware";

const PUBLIC_PATHS = ["/login", "/auth/callback", "/auth/accept-invite"];

export async function middleware(request: NextRequest) {
  const { supabase, response } = createMiddlewareClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((path) => pathname.startsWith(path));

  if (!user && !isPublic) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user && pathname === "/login") {
    return NextResponse.redirect(new URL("/casos", request.url));
  }

  // Puerta obligatoria de "primer login": mientras no haya definido una
  // contraseña, se manda a /set-password sin importar por dónde haya
  // entrado (magic link, invitación, etc.) - reusa el mismo cliente
  // anon-key de arriba, permitido por la política profiles_select_own.
  if (user && !isPublic && pathname !== "/set-password") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("password_set")
      .eq("id", user.id)
      .single();
    if (profile && !profile.password_set) {
      return NextResponse.redirect(new URL("/set-password", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
