"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LifeBuoy } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/casos", label: "Gestión de Casos" },
  { href: "/dashboard", label: "Dashboard" },
];

export function MainNav() {
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
      </div>
    </header>
  );
}
