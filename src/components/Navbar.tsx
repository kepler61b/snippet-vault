"use client";

import React from "react";
import { Plus, Search, Settings, Sparkles, Terminal } from "lucide-react";

interface NavbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenCreateModal: () => void;
  onOpenSettingsModal: () => void;
  onOpenCommandPalette: () => void;
}

export function Navbar({
  searchQuery,
  onSearchChange,
  onOpenCreateModal,
  onOpenSettingsModal,
  onOpenCommandPalette,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-sky-500 shadow-lg shadow-indigo-500/20 text-white font-mono font-bold text-lg">
            <Terminal className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
                SnippetVault
              </span>
              <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">
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
        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenCommandPalette}
            className="md:hidden p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/60 border border-zinc-800 transition-colors"
            title="Поиск (Ctrl+K)"
          >
            <Search className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenSettingsModal}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800/80 border border-zinc-800 transition-colors"
            title="Настройки AI"
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Настройки</span>
          </button>

          <button
            onClick={onOpenCreateModal}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-md shadow-violet-600/25 active:scale-[0.98] transition-all duration-150"
          >
            <Plus className="w-4 h-4" />
            <span>Сниппет</span>
          </button>
        </div>
      </div>
    </header>
  );
}
