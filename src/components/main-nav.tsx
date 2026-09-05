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
    <header className="border-b bg-primary">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8">
        <span className="flex items-center gap-2 font-semibold text-primary-foreground">
          <LifeBuoy className="h-5 w-5" />
          Soporte ERP
        </span>
        <nav className="flex items-center gap-1">
          {links.map((link) => {
            const active = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium text-primary-foreground/70 transition-colors hover:bg-white/10 hover:text-primary-foreground",
                  active && "bg-white/15 text-primary-foreground"
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
