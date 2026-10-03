import { NextResponse, type NextRequest } from "next/server";
import { createMiddlewareClient, withSessionCookies } from "@/lib/supabase/middleware";
import { timed } from "@/lib/perf";

const PUBLIC_PATHS = ["/login", "/auth/callback", "/auth/accept-invite"];

export async function middleware(request: NextRequest) {
  const t0 = performance.now(); // TEMPORAL (perf)
  const { supabase, getResponse } = createMiddlewareClient(request);
  const {
    data: { user },
  } = await timed("mw.getUser", () => supabase.auth.getUser());

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
    const { data: profile } = await timed("mw.profiles", () =>
      supabase.from("profiles").select("password_set").eq("id", user.id).single()
    );
    if (profile && !profile.password_set) {
      return redirectTo("/set-password");
    }
  }

  const total = Math.round(performance.now() - t0);
  console.log(`[perf] mw.total ${pathname} ${total}ms`);
  const response = getResponse();
  response.headers.set("Server-Timing", `mw;dur=${total}`);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
