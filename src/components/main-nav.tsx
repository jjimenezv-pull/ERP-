"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LifeBuoy, LogOut, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/lib/auth/actions";
import type { CurrentProfile } from "@/lib/auth/get-current-profile";

const links = [
  { href: "/casos", label: "Gestión de Casos" },
  { href: "/dashboard", label: "Dashboard" },
];

const ROLE_LABEL: Record<CurrentProfile["role"], string> = {
  admin: "Admin",
  viewer: "Visualizador",
};

export function MainNav({ profile }: { profile: CurrentProfile | null }) {
  const pathname = usePathname();

  return (
    <header className="bg-primary shadow-sm">
      <div className="mx-auto flex h-16 w-full max-w-[1800px] items-center gap-4 px-6 lg:px-10">
        <span className="flex items-center gap-2.5 text-base font-semibold tracking-tight text-primary-foreground">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15">
            <LifeBuoy className="h-5 w-5" />
          </span>
          Soporte ERP
        </span>
        <div className="h-6 w-px bg-white/20" aria-hidden />
        <nav className="flex items-center gap-1">
          {links.map((link) => {
            const active = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium text-primary-foreground/60 transition-colors hover:bg-white/10 hover:text-primary-foreground",
                  active && "bg-white/20 text-primary-foreground shadow-sm"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        {profile && (
          <DropdownMenu>
            <DropdownMenuTrigger className="ml-auto flex items-center gap-2 rounded-full p-0.5 outline-none transition-colors hover:bg-white/10">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-sm font-semibold uppercase text-primary-foreground">
                {profile.email.charAt(0)}
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="flex items-center justify-between gap-2">
                <span className="max-w-[180px] truncate">{profile.email}</span>
                <Badge variant="outline">{ROLE_LABEL[profile.role]}</Badge>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {profile.role === "admin" && (
                <DropdownMenuItem asChild>
                  <Link href="/usuarios">
                    <Users className="mr-2 h-4 w-4" />
                    Usuarios
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onSelect={() => signOut()}>
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
