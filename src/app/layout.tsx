import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import Header from "@/components/Header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cancionero Parroquial",
  description: "Cancionero digital para el coro de la iglesia. Letras y acordes organizados por partes de la misa.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        <Suspense fallback={<header className="h-14 border-b border-slate-200 bg-white" />}>
          <Header />
        </Suspense>
        <main className="flex-1">{children}</main>
        <footer className="py-6 text-center text-sm text-slate-400 border-t border-slate-200">
          Cancionero Parroquial · Hecho con ❤️ para la iglesia
        </footer>
      </body>
    </html>
  );
}
