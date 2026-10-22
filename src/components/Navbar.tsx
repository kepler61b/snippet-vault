"use client";

import React from "react";
import { Plus, Search, ShieldCheck, Terminal } from "lucide-react";
import { APP_CONFIG } from "@/lib/version";
import { useI18n } from "@/lib/i18n";

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
  const { t } = useI18n();
  const initial = (currentUser?.name || currentUser?.email || "U")[0].toUpperCase();
  const isAdmin = currentUser?.role === "ADMIN";

  return (
    <header className="sticky top-0 z-30 w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md safe-top">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-sky-500 shadow-md sm:shadow-lg shadow-indigo-500/20 text-white font-mono font-bold text-sm sm:text-lg shrink-0">
            <Terminal className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1 sm:gap-2">
              <span className="font-bold text-sm sm:text-lg tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent truncate">
                SnippetVault
              </span>
              {APP_CONFIG.env === "prod" ? (
                <span className="inline-flex items-center gap-1 text-[9px] sm:text-[11px] font-bold px-1.5 sm:px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Prod {APP_CONFIG.version}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[9px] sm:text-[11px] font-bold px-1.5 sm:px-2 py-0.5 rounded-md bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                  <span>Dev {APP_CONFIG.version}</span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-400 hidden sm:block truncate">
              {t("sidebar.footerDesc")}
            </p>
          </div>
        </div>

        {/* Global Search & Command Palette Bar (Desktop) */}
        <div className="flex-1 max-w-md hidden md:block">
          <div
            onClick={onOpenCommandPalette}
            className="flex items-center justify-between w-full px-3.5 py-2 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-900 hover:border-zinc-700 text-zinc-400 text-sm cursor-pointer transition-all duration-150 group"
          >
            <div className="flex items-center gap-2.5">
              <Search className="w-4 h-4 text-zinc-400 group-hover:text-zinc-200 transition-colors" />
              <span>{t("nav.searchPrompt")}</span>
            </div>
            <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium text-zinc-400 bg-zinc-800/80 rounded border border-zinc-700/60">
              <span className="text-xs">⌘</span>K
            </kbd>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Quick search on mobile */}
          <button
            onClick={onOpenCommandPalette}
            className="md:hidden p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/80 border border-zinc-800 transition-all active:scale-95 flex items-center justify-center min-w-[34px] min-h-[34px]"
            title={t("nav.searchMobile")}
            aria-label={t("common.search")}
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Admin Panel button (only for ADMIN) */}
          {isAdmin && onOpenAdminModal && (
            <button
              onClick={onOpenAdminModal}
              className="p-2 sm:p-2.5 rounded-xl text-violet-300 hover:text-white bg-violet-600/15 hover:bg-violet-600/25 border border-violet-500/30 hover:border-violet-500/50 transition-all active:scale-95 shadow-sm shadow-violet-500/10 flex items-center justify-center min-w-[34px] min-h-[34px]"
              title={t("nav.adminPanel")}
              aria-label={t("nav.adminPanel")}
            >
              <ShieldCheck className="w-4 h-4 text-violet-400" />
            </button>
          )}

          {/* User Profile / Settings button */}
          <button
            onClick={onOpenSettingsModal}
            className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-2 rounded-xl text-xs sm:text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-800/80 border border-zinc-800 transition-all active:scale-95 min-w-[34px] min-h-[34px] justify-center"
            title={t("nav.profileAndSettings")}
            aria-label={t("nav.profileAndSettings")}
          >
            <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
              {initial}
            </div>
            <span className="hidden sm:inline max-w-[100px] truncate">
              {currentUser?.name || t("nav.settings")}
            </span>
          </button>

          {/* Create Snippet Button */}
          <button
            onClick={onOpenCreateModal}
            className="flex items-center justify-center gap-1.5 p-2 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-md shadow-violet-600/25 hover:shadow-violet-600/40 active:scale-95 transition-all duration-150 min-w-[34px] min-h-[34px]"
            title={t("nav.createSnippet")}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">{t("nav.newSnippet")}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
