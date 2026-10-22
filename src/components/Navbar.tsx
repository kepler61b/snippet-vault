"use client";

import React from "react";
import { Plus, Search, Settings, ShieldCheck, Terminal, User } from "lucide-react";

interface NavbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenCreateModal: () => void;
  onOpenSettingsModal: () => void;
  onOpenCommandPalette: () => void;
  onOpenAdminModal?: () => void;
  currentUser?: {
    id: string;
    email: string;
    name: string | null;
    role?: string;
  } | null;
}

export function Navbar({
  searchQuery,
  onSearchChange,
  onOpenCreateModal,
  onOpenSettingsModal,
  onOpenCommandPalette,
  onOpenAdminModal,
  currentUser,
}: NavbarProps) {
  const initial = (currentUser?.name || currentUser?.email || "U")[0].toUpperCase();
  const isAdmin = currentUser?.role === "ADMIN";

  return (
    <header className="sticky top-0 z-30 w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-sky-500 shadow-lg shadow-indigo-500/20 text-white font-mono font-bold text-lg flex-shrink-0">
            <Terminal className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-bold text-base sm:text-lg tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
                SnippetVault
              </span>
              <span className="text-[9px] sm:text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 hidden xs:inline-block">
                AI Ready
              </span>
            </div>
            <p className="text-xs text-zinc-400 hidden sm:block">
              Хранилище сниппетов кода & AI Ассистент
            </p>
          </div>
        </div>

        {/* Global Search & Command Palette Bar */}
        <div className="flex-1 max-w-md hidden md:block">
          <div
            onClick={onOpenCommandPalette}
            className="flex items-center justify-between w-full px-3.5 py-2 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-900 hover:border-zinc-700 text-zinc-400 text-sm cursor-pointer transition-all duration-150 group"
          >
            <div className="flex items-center gap-2.5">
              <Search className="w-4 h-4 text-zinc-400 group-hover:text-zinc-200 transition-colors" />
              <span>Поиск сниппетов, файлов, кода...</span>
            </div>
            <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium text-zinc-400 bg-zinc-800/80 rounded border border-zinc-700/60">
              <span className="text-xs">⌘</span>K
            </kbd>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          <button
            onClick={onOpenCommandPalette}
            className="md:hidden p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/80 border border-zinc-800 transition-all hover:scale-105 active:scale-95"
            title="Поиск (Ctrl+K)"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Admin Panel button (only for ADMIN) */}
          {isAdmin && onOpenAdminModal && (
            <button
              onClick={onOpenAdminModal}
              className="p-2 sm:p-2.5 rounded-xl text-violet-300 hover:text-white bg-violet-600/15 hover:bg-violet-600/25 border border-violet-500/30 hover:border-violet-500/50 transition-all hover:scale-105 active:scale-95 shadow-sm shadow-violet-500/10 flex items-center justify-center"
              title="Панель администратора"
              aria-label="Панель администратора"
            >
              <ShieldCheck className="w-4 h-4 text-violet-400" />
            </button>
          )}

          {/* User Profile / Settings button */}
          <button
            onClick={onOpenSettingsModal}
            className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-800/80 border border-zinc-800 transition-all hover:scale-105 active:scale-95"
            title="Личный кабинет и настройки"
          >
            <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white text-[10px] font-bold">
              {initial}
            </div>
            <span className="hidden sm:inline max-w-[100px] truncate">
              {currentUser?.name || "Настройки"}
            </span>
          </button>

          <button
            onClick={onOpenCreateModal}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-md shadow-violet-600/25 hover:shadow-violet-600/40 hover:-translate-y-0.5 active:scale-95 transition-all duration-150"
          >
            <Plus className="w-4 h-4" />
            <span>Сниппет</span>
          </button>
        </div>
      </div>
    </header>
  );
}
