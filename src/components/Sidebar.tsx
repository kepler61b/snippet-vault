"use client";

import React from "react";
import {
  Code2,
  Download,
  Edit2,
  FolderGit2,
  Plus,
  SlidersHorizontal,
  Star,
  Tag,
  X,
} from "lucide-react";
import { getLanguageMeta } from "@/lib/languages";
import { CollectionItem } from "@/types/snippet";
import { CollectionIcon } from "@/lib/collection-icons";

interface SidebarProps {
  totalCount: number;
  favoriteCount: number;
  collections: CollectionItem[];
  selectedCollectionId: string | null;
  onSelectCollection: (id: string | null) => void;
  onOpenCreateCollection: () => void;
  onEditCollection: (col: CollectionItem) => void;
  selectedFilter: "ALL" | "FAVORITES";
  onSelectFilter: (filter: "ALL" | "FAVORITES") => void;
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
  collections,
  selectedCollectionId,
  onSelectCollection,
  onOpenCreateCollection,
  onEditCollection,
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
    selectedFilter !== "ALL" ||
    selectedLanguage !== null ||
    selectedTag !== null;

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
          <span>Навигация и фильтры</span>
        </div>
        <button
          onClick={onCloseMobile}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* БЛОК 1: КОЛЛЕКЦИИ (Все сниппеты + кастомные коллекции + кнопка создать) */}
      <div className="space-y-1">
        <div className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center justify-between">
          <span>Коллекции</span>
          {collections.length > 0 && (
            <button
              onClick={onOpenCreateCollection}
              className="flex items-center gap-1 text-[11px] font-medium text-violet-400 hover:text-violet-300 transition-colors"
              title="Создать свою коллекцию"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Новая</span>
            </button>
          )}
        </div>

        {/* Все сниппеты */}
        <button
          onClick={() => {
            onSelectCollection(null);
            onSelectFilter("ALL");
            onCloseMobile?.();
          }}
          className={`flex items-center justify-between w-full px-3 py-2 text-sm rounded-xl transition-all ${
            selectedCollectionId === null && selectedFilter === "ALL"
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

        {/* Список кастомных коллекций */}
        {collections.map((col) => {
          const isSelected = selectedCollectionId === col.id;
          const count = col._count?.snippets || 0;
          return (
            <div
              key={col.id}
              className={`group/col flex items-center justify-between w-full rounded-xl transition-all ${
                isSelected
                  ? "bg-zinc-800 text-white font-medium shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"
              }`}
            >
              <button
                onClick={() => {
                  onSelectCollection(col.id);
                  onCloseMobile?.();
                }}
                className="flex items-center gap-2.5 px-3 py-2 flex-1 min-w-0 text-left text-sm"
              >
                <CollectionIcon
                  iconType={col.iconType}
                  iconValue={col.iconValue}
                  color={col.color}
                  className="w-4 h-4"
                />
                <span className="truncate">{col.name}</span>
              </button>

              <div className="flex items-center gap-1 pr-2">
                <span className="text-xs opacity-60 px-1">{count}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const a = document.createElement("a");
                    a.href = `/api/export?type=collection&id=${col.id}`;
                    a.download = `${col.name}.collection.snippetvault.json`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                  }}
                  className="opacity-0 group-hover/col:opacity-100 p-1 text-zinc-500 hover:text-white rounded transition-opacity"
                  title="Экспортировать коллекцию в JSON"
                >
                  <Download className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditCollection(col);
                  }}
                  className="opacity-0 group-hover/col:opacity-100 p-1 text-zinc-500 hover:text-white rounded transition-opacity"
                  title="Редактировать коллекцию"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}

        {collections.length === 0 && (
          <div className="px-3 py-2">
            <button
              onClick={onOpenCreateCollection}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-dashed border-zinc-800 hover:border-violet-500/50 text-zinc-500 hover:text-violet-300 text-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Создать первую коллекцию</span>
            </button>
          </div>
        )}
      </div>

      {/* БЛОК 2: ФИЛЬТРЫ (Избранное) */}
      <div className="space-y-1">
        <div className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center justify-between">
          <span>Фильтры</span>
          {hasActiveFilters && (
            <button
              onClick={resetAllFilters}
              className="flex items-center gap-1 text-[11px] font-medium text-violet-400 hover:text-violet-300 transition-colors normal-case"
              title="Сбросить активные фильтры"
            >
              <X className="w-3.5 h-3.5" />
              <span>Сбросить</span>
            </button>
          )}
        </div>

        <button
          onClick={() => {
            onSelectCollection(null);
            onSelectFilter("FAVORITES");
            onCloseMobile?.();
          }}
          className={`flex items-center justify-between w-full px-3 py-2 text-sm rounded-xl transition-all ${
            selectedCollectionId === null && selectedFilter === "FAVORITES"
              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Star
              className={`w-4 h-4 ${
                selectedFilter === "FAVORITES" && selectedCollectionId === null
                  ? "fill-amber-400 text-amber-400"
                  : "text-amber-400/80"
              }`}
            />
            <span>Избранное</span>
          </div>
          <span className="text-xs opacity-75">{favoriteCount}</span>
        </button>

      </div>

      {/* БЛОК 3: ЯЗЫКИ */}
      {languages.length > 0 && (
        <div className="space-y-1">
          <div className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center justify-between">
            <span>Языки</span>
            <Code2 className="w-3.5 h-3.5 text-zinc-400" />
          </div>
          <div className="space-y-0.5 max-h-48 overflow-y-auto pr-1">
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
                  className={`flex items-center justify-between w-full px-3 py-1.5 text-xs rounded-lg transition-all ${
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

      {/* БЛОК 4: ТЕГИ */}
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
