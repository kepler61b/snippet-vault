"use client";

import React from "react";
import {
  Code2,
  FolderGit2,
  Globe,
  Lock,
  Share2,
  SlidersHorizontal,
  Star,
  Tag,
  X,
} from "lucide-react";
import { getLanguageMeta } from "@/lib/languages";

interface SidebarProps {
  totalCount: number;
  favoriteCount: number;
  selectedFilter: "ALL" | "FAVORITES" | "PUBLIC" | "UNLISTED" | "PRIVATE";
  onSelectFilter: (filter: "ALL" | "FAVORITES" | "PUBLIC" | "UNLISTED" | "PRIVATE") => void;
  selectedLanguage: string | null;
  onSelectLanguage: (lang: string | null) => void;
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
  languages: { name: string; count: number }[];
  tags: { name: string; count: number }[];
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({
  totalCount,
  favoriteCount,
  selectedFilter,
  onSelectFilter,
  selectedLanguage,
  onSelectLanguage,
  selectedTag,
  onSelectTag,
  languages,
  tags,
  isMobileOpen = false,
  onCloseMobile,
}: SidebarProps) {
  const hasActiveFilters =
    selectedFilter !== "ALL" || selectedLanguage !== null || selectedTag !== null;

  const resetAllFilters = () => {
    onSelectFilter("ALL");
    onSelectLanguage(null);
    onSelectTag(null);
  };

  const content = (
    <div className="space-y-6">
      {/* Mobile Drawer Header */}
      <div className="flex lg:hidden items-center justify-between pb-3 border-b border-zinc-800">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <SlidersHorizontal className="w-4 h-4 text-violet-400" />
          <span>Фильтры и категории</span>
        </div>
        <button
          onClick={onCloseMobile}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Filter status & clear button */}
      {hasActiveFilters && (
        <div className="flex items-center justify-between px-3 py-2 bg-violet-950/30 border border-violet-800/40 rounded-xl text-xs text-violet-300">
          <span>Фильтры активны</span>
          <button
            onClick={resetAllFilters}
            className="flex items-center gap-1 font-medium hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            <span>Сбросить</span>
          </button>
        </div>
      )}

      {/* Main Views */}
      <div className="space-y-1">
        <div className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Коллекции
        </div>
        <button
          onClick={() => {
            onSelectFilter("ALL");
            onCloseMobile?.();
          }}
          className={`flex items-center justify-between w-full px-3 py-2.5 text-sm rounded-xl transition-all ${
            selectedFilter === "ALL"
              ? "bg-violet-600 text-white font-medium shadow-md shadow-violet-600/20"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <FolderGit2 className="w-4 h-4" />
            <span>Все сниппеты</span>
          </div>
          <span className="text-xs opacity-75">{totalCount}</span>
        </button>

        <button
          onClick={() => {
            onSelectFilter("FAVORITES");
            onCloseMobile?.();
          }}
          className={`flex items-center justify-between w-full px-3 py-2.5 text-sm rounded-xl transition-all ${
            selectedFilter === "FAVORITES"
              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Star
              className={`w-4 h-4 ${
                selectedFilter === "FAVORITES"
                  ? "fill-amber-400 text-amber-400"
                  : "text-amber-400/80"
              }`}
            />
            <span>Избранное</span>
          </div>
          <span className="text-xs opacity-75">{favoriteCount}</span>
        </button>
      </div>

      {/* Privacy Filters */}
      <div className="space-y-1">
        <div className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Доступ
        </div>
        <button
          onClick={() => {
            onSelectFilter("PUBLIC");
            onCloseMobile?.();
          }}
          className={`flex items-center justify-between w-full px-3 py-2 text-xs rounded-lg transition-all ${
            selectedFilter === "PUBLIC"
              ? "bg-zinc-800 text-white font-medium"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"
          }`}
        >
          <div className="flex items-center gap-2">
            <Globe className="w-3.5 h-3.5 text-emerald-400" />
            <span>Публичные</span>
          </div>
        </button>

        <button
          onClick={() => {
            onSelectFilter("UNLISTED");
            onCloseMobile?.();
          }}
          className={`flex items-center justify-between w-full px-3 py-2 text-xs rounded-lg transition-all ${
            selectedFilter === "UNLISTED"
              ? "bg-zinc-800 text-white font-medium"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"
          }`}
        >
          <div className="flex items-center gap-2">
            <Share2 className="w-3.5 h-3.5 text-sky-400" />
            <span>По секретной ссылке</span>
          </div>
        </button>

        <button
          onClick={() => {
            onSelectFilter("PRIVATE");
            onCloseMobile?.();
          }}
          className={`flex items-center justify-between w-full px-3 py-2 text-xs rounded-lg transition-all ${
            selectedFilter === "PRIVATE"
              ? "bg-zinc-800 text-white font-medium"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"
          }`}
        >
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-zinc-400" />
            <span>Приватные</span>
          </div>
        </button>
      </div>

      {/* Languages */}
      {languages.length > 0 && (
        <div className="space-y-1">
          <div className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center justify-between">
            <span>Языки</span>
            <Code2 className="w-3.5 h-3.5 text-zinc-400" />
          </div>
          <div className="space-y-0.5 max-h-56 overflow-y-auto pr-1">
            {languages.map((lang) => {
              const meta = getLanguageMeta(lang.name);
              const isSelected = selectedLanguage === lang.name;
              return (
                <button
                  key={lang.name}
                  onClick={() => {
                    onSelectLanguage(isSelected ? null : lang.name);
                    onCloseMobile?.();
                  }}
                  className={`flex items-center justify-between w-full px-3 py-2 text-xs rounded-lg transition-all ${
                    isSelected
                      ? "bg-zinc-800 text-white font-semibold"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: meta.color }}
                    />
                    <span className="truncate">{meta.name}</span>
                  </div>
                  <span className="text-[11px] text-zinc-400 ml-2">{lang.count}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div className="space-y-2">
          <div className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center justify-between">
            <span>Теги</span>
            <Tag className="w-3.5 h-3.5 text-zinc-400" />
          </div>
          <div className="flex flex-wrap gap-1.5 px-2">
            {tags.map((t) => {
              const isSelected = selectedTag === t.name;
              return (
                <button
                  key={t.name}
                  onClick={() => {
                    onSelectTag(isSelected ? null : t.name);
                    onCloseMobile?.();
                  }}
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                    isSelected
                      ? "bg-violet-600 text-white font-medium shadow-sm"
                      : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
                  }`}
                >
                  <span>#{t.name}</span>
                  <span className="text-[10px] opacity-60">({t.count})</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar: sticky left column */}
      <aside className="hidden lg:block w-64 flex-shrink-0">
        <div className="sticky top-24">{content}</div>
      </aside>

      {/* Mobile Slide-Over Drawer */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm lg:hidden flex justify-start animate-modal-backdrop"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-4/5 max-w-xs h-full bg-zinc-950 border-r border-zinc-800 p-5 overflow-y-auto shadow-2xl animate-drawer"
          >
            {content}
          </div>
        </div>
      )}
    </>
  );
}
