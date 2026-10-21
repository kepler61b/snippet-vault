import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SnippetVault — Хранилище сниппетов кода & AI Ассистент",
  description:
    "Современный веб-сервис для хранения, поиска, экспорта и анализа фрагментов кода с поддержкой мульти-файлов, синтаксической подсветки и AI.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="ru"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100 selection:bg-violet-500/30 selection:text-white">
        {children}
      </body>
    </html>
  );
}
