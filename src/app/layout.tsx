import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { MainNav } from "@/components/main-nav";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Gestión de Casos de Soporte",
  description: "Plataforma interna de gestión de casos de soporte (GLPI + proveedor ERP)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={inter.variable}>
      <body className="font-sans antialiased">
        <div className="min-h-screen bg-background">
          <MainNav />
          <main className="mx-auto w-full max-w-[1800px] px-6 py-6 lg:px-10">
            {children}
          </main>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
