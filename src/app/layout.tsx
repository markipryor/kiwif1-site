import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });

export const metadata: Metadata = {
  title: "KiwiF1 — Formula 1 Statistics",
  description: "Historical Formula 1 statistics from 1950 to the present day.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <head>
        <link rel="stylesheet" href="/flag-icons/css/flag-icons.min.css" />
      </head>
      <body className="min-h-full flex flex-col bg-zinc-950 text-white antialiased">
        <Nav />
        <main className="flex-1 pt-16">{children}</main>
        <footer className="border-t border-zinc-800 mt-12">
          <div className="max-w-5xl mx-auto px-6 py-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4 text-zinc-500 text-xs">
              <span>© {new Date().getFullYear()} Mark Pryor</span>
              <a href="mailto:markpryor@gmail.com" className="hover:text-white transition-colors">markpryor@gmail.com</a>
            </div>
            <span className="text-zinc-600 text-xs font-mono">v6.4.0</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
