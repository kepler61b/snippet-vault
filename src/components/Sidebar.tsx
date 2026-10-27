"use client";

import React, { useState, useMemo } from "react";
import {
  ChevronDown,
  ChevronRight,
  Code2,
  Download,
  Edit2,
  FolderGit2,
  FolderPlus,
  FolderTree,
  Plus,
  SlidersHorizontal,
  Sparkles,
  Star,
  Tag,
  X,
} from "lucide-react";
import { getLanguageMeta } from "@/lib/languages";
import { CollectionItem } from "@/types/snippet";
import { CollectionIcon } from "@/lib/collection-icons";
import { useI18n } from "@/lib/i18n";

interface SidebarProps {
  totalCount: number;
  favoriteCount: number;
  collections: CollectionItem[];
  selectedCollectionId: string | null;
  onSelectCollection: (id: string | null) => void;
  onOpenCreateCollection: (parentId?: string | null, isSmart?: boolean) => void;
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
  currentUser?: { role?: string } | null;
  onOpenAdminModal?: () => void;
}

interface CollectionTreeNode extends CollectionItem {
  childrenNodes: CollectionTreeNode[];
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
  const { t } = useI18n();

  // Track expanded folder nodes in folder tree
  const [collapsedFolderIds, setCollapsedFolderIds] = useState<Set<string>>(new Set());

  const toggleFolderCollapse = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedFolderIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const hasActiveFilters =
    selectedFilter !== "ALL" ||
    selectedLanguage !== null ||
    selectedTag !== null;

  const resetAllFilters = () => {
    onSelectFilter("ALL");
    onSelectLanguage(null);
    onSelectTag(null);
  };

  // Separate smart collections and standard folder collections
  const { smartCollections, standardCollectionsTree } = useMemo(() => {
    const smart: CollectionItem[] = [];
    const standard: CollectionItem[] = [];

    collections.forEach((c) => {
      if (c.isSmart) {
        smart.push(c);
      } else {
        standard.push(c);
      }
    });

    // Build tree for standard collections
    const nodeMap = new Map<string, CollectionTreeNode>();
    standard.forEach((c) => {
      nodeMap.set(c.id, { ...c, childrenNodes: [] });
    });

    const roots: CollectionTreeNode[] = [];
    standard.forEach((c) => {
      const node = nodeMap.get(c.id)!;
      if (c.parentId && nodeMap.has(c.parentId)) {
        nodeMap.get(c.parentId)!.childrenNodes.push(node);
      } else {
        roots.push(node);
      }
    });

    return {
      smartCollections: smart,
      standardCollectionsTree: roots,
    };
  }, [collections]);

  // Recursive tree renderer for standard collections
  const renderCollectionTreeNode = (node: CollectionTreeNode, depth = 0) => {
    const isSelected = selectedCollectionId === node.id;
    const hasChildren = node.childrenNodes.length > 0;
    const isCollapsed = collapsedFolderIds.has(node.id);
    const count = node._count?.snippets || 0;

    return (
      <div key={node.id} className="space-y-0.5">
        <div
          className={`group/col flex items-center justify-between w-full rounded-xl transition-all ${
            isSelected
              ? "bg-zinc-800 text-white font-medium shadow-sm ring-1 ring-violet-500/30"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"
          }`}
          style={{ paddingLeft: `${depth * 14 + 6}px` }}
        >
          {/* Left: Expand/Collapse chevron + Collection Info */}
          <div className="flex items-center gap-1.5 flex-1 min-w-0 py-1.5 sm:py-1">
            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => toggleFolderCollapse(node.id, e)}
                className="p-1 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/80 transition-colors shrink-0 min-w-[28px] min-h-[28px] flex items-center justify-center active:scale-90"
                title={isCollapsed ? "Развернуть папку" : "Свернуть папку"}
              >
                {isCollapsed ? (
                  <ChevronRight className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            ) : (
              <div className="w-7 shrink-0" />
            )}

            <button
              onClick={() => {
                onSelectCollection(node.id);
                onCloseMobile?.();
              }}
              className="flex items-center gap-2 flex-1 min-w-0 text-left text-xs sm:text-sm py-1"
            >
              <CollectionIcon
                iconType={node.iconType}
                iconValue={node.iconValue}
                color={node.color}
                className="w-4 h-4 shrink-0"
              />
              <span className="truncate">{node.name}</span>
            </button>
          </div>

          {/* Right Action buttons */}
          <div className="flex items-center gap-0.5 pr-1.5 shrink-0">
            <span className="text-[11px] opacity-60 px-1 font-mono">{count}</span>

            {/* Quick add subcollection */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenCreateCollection(node.id, false);
                onCloseMobile?.();
              }}
              className="opacity-80 lg:opacity-0 lg:group-hover/col:opacity-100 p-1.5 text-zinc-400 hover:text-violet-300 rounded-lg hover:bg-zinc-800 transition-opacity min-w-[28px] min-h-[28px] flex items-center justify-center active:scale-90"
              title={t("sidebar.createSubfolder")}
            >
              <FolderPlus className="w-3.5 h-3.5" />
            </button>

            {/* Export JSON */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const a = document.createElement("a");
                a.href = `/api/export?type=collection&id=${node.id}`;
                a.download = `${node.name}.collection.snippetvault.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
              }}
              className="opacity-80 lg:opacity-0 lg:group-hover/col:opacity-100 p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-opacity min-w-[28px] min-h-[28px] flex items-center justify-center active:scale-90"
              title={t("snippets.exportCollectionJson")}
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            {/* Edit */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEditCollection(node);
              }}
              className="opacity-80 lg:opacity-0 lg:group-hover/col:opacity-100 p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-opacity min-w-[28px] min-h-[28px] flex items-center justify-center active:scale-90"
              title={t("view.editSnippet")}
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Render child folders */}
        {hasChildren && !isCollapsed && (
          <div className="space-y-0.5">
            {node.childrenNodes.map((child) => renderCollectionTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const content = (
    <div className="space-y-6">
      {/* Mobile Drawer Header */}
      <div className="flex lg:hidden items-center justify-between pb-3 border-b border-zinc-800">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <SlidersHorizontal className="w-4 h-4 text-violet-400" />
          <span>{t("sidebar.navigationAndFilters")}</span>
        </div>
        <button
          onClick={onCloseMobile}
          className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 active:scale-95 transition-all flex items-center justify-center min-w-[36px] min-h-[36px]"
          aria-label={t("sidebar.closeFilters")}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* БЛОК 1: КОЛЛЕКЦИИ (Все сниппеты + Дерево папок) */}
      <div className="space-y-1">
        <div className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <FolderTree className="w-3.5 h-3.5 text-zinc-400" />
            {t("sidebar.collections")}
          </span>
          <button
            onClick={() => {
              onOpenCreateCollection(null, false);
              onCloseMobile?.();
            }}
            className="flex items-center gap-1 text-[11px] font-medium text-violet-400 hover:text-violet-300 transition-colors py-1 px-1.5 rounded hover:bg-zinc-900"
            title={t("sidebar.createCollectionTitle")}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t("sidebar.newCollection")}</span>
          </button>
        </div>

        {/* Все сниппеты */}
        <button
          onClick={() => {
            onSelectCollection(null);
            onSelectFilter("ALL");
            onCloseMobile?.();
          }}
          className={`flex items-center justify-between w-full px-3 py-2.5 sm:py-2 text-sm rounded-xl transition-all active:scale-[0.99] ${
            selectedCollectionId === null && selectedFilter === "ALL"
              ? "bg-violet-600 text-white font-medium shadow-md shadow-violet-600/20"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <FolderGit2 className="w-4 h-4" />
            <span>{t("sidebar.allSnippets")}</span>
          </div>
          <span className="text-xs opacity-75 font-mono">{totalCount}</span>
        </button>

        {/* Дерево стандартных коллекций */}
        <div className="space-y-0.5 pt-1">
          {standardCollectionsTree.map((rootNode) => renderCollectionTreeNode(rootNode, 0))}
        </div>

        {standardCollectionsTree.length === 0 && smartCollections.length === 0 && (
          <div className="px-3 py-2">
            <button
              onClick={() => {
                onOpenCreateCollection();
                onCloseMobile?.();
              }}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-dashed border-zinc-800 hover:border-violet-500/50 text-zinc-500 hover:text-violet-300 text-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t("sidebar.createCollectionTitle")}</span>
            </button>
          </div>
        )}
      </div>

      {/* БЛОК 2: УМНЫЕ КОЛЛЕКЦИИ (Smart Collections) */}
      {smartCollections.length > 0 && (
        <div className="space-y-1 pt-1">
          <div className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-pink-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-pink-400" />
              {t("sidebar.smartCollections")}
            </span>
            <button
              onClick={() => {
                onOpenCreateCollection(null, true);
                onCloseMobile?.();
              }}
              className="flex items-center gap-1 text-[11px] font-medium text-pink-400 hover:text-pink-300 transition-colors py-0.5 px-1 rounded hover:bg-zinc-900"
              title="Создать умную коллекцию"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-0.5">
            {smartCollections.map((col) => {
              const isSelected = selectedCollectionId === col.id;
              const count = col._count?.snippets || 0;
              return (
                <div
                  key={col.id}
                  className={`group/smart flex items-center justify-between w-full rounded-xl transition-all ${
                    isSelected
                      ? "bg-gradient-to-r from-pink-950/70 to-rose-950/70 text-white font-medium border border-pink-500/40 shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"
                  }`}
                >
                  <button
                    onClick={() => {
                      onSelectCollection(col.id);
                      onCloseMobile?.();
                    }}
                    className="flex items-center gap-2.5 px-3 py-2 flex-1 min-w-0 text-left text-xs sm:text-sm"
                  >
                    <CollectionIcon
                      iconType={col.iconType}
                      iconValue={col.iconValue}
                      color={col.color || "#ec4899"}
                      className="w-4 h-4 shrink-0"
                    />
                    <span className="truncate">{col.name}</span>
                  </button>

                  <div className="flex items-center gap-1 pr-2 shrink-0">
                    <span className="text-[11px] opacity-75 px-1 font-mono text-pink-300 font-semibold">
                      {count}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditCollection(col);
                      }}
                      className="opacity-80 lg:opacity-0 lg:group-hover/smart:opacity-100 p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-opacity min-w-[28px] min-h-[28px] flex items-center justify-center active:scale-90"
                      title={t("view.editSnippet")}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* БЛОК 3: ФИЛЬТРЫ (Избранное) */}
      <div className="space-y-1">
        <div className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center justify-between">
          <span>{t("snippets.filters")}</span>
          {hasActiveFilters && (
            <button
              onClick={resetAllFilters}
              className="flex items-center gap-1 text-[11px] font-medium text-violet-400 hover:text-violet-300 transition-colors normal-case py-1 px-1.5 rounded"
              title={t("snippets.resetFilters")}
            >
              <X className="w-3.5 h-3.5" />
              <span>{t("snippets.resetFilters")}</span>
            </button>
          )}
        </div>

        <button
          onClick={() => {
            onSelectCollection(null);
            onSelectFilter("FAVORITES");
            onCloseMobile?.();
          }}
          className={`flex items-center justify-between w-full px-3 py-2.5 sm:py-2 text-sm rounded-xl transition-all active:scale-[0.99] ${
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
            <span>{t("sidebar.favorites")}</span>
          </div>
          <span className="text-xs opacity-75 font-mono">{favoriteCount}</span>
        </button>
      </div>

      {/* БЛОК 4: ЯЗЫКИ */}
      {languages.length > 0 && (
        <div className="space-y-1">
          <div className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center justify-between">
            <span>{t("sidebar.languages")}</span>
            <Code2 className="w-3.5 h-3.5 text-zinc-400" />
          </div>
          <div className="space-y-0.5 max-h-52 overflow-y-auto pr-1">
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
                  className={`flex items-center justify-between w-full px-3 py-2 text-xs rounded-lg transition-all active:scale-[0.99] ${
                    isSelected
                      ? "bg-zinc-800 text-white font-semibold"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: meta.color }}
                    />
                    <span className="truncate">{meta.name}</span>
                  </div>
                  <span className="text-[11px] text-zinc-400 ml-2 font-mono">{lang.count}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* БЛОК 5: ТЕГИ */}
      {tags.length > 0 && (
        <div className="space-y-2">
          <div className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center justify-between">
            <span>{t("sidebar.tags")}</span>
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
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs transition-all active:scale-95 ${
                    isSelected
                      ? "bg-violet-600 text-white font-medium shadow-sm"
                      : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
                  }`}
                >
                  <span>#{t.name}</span>
                  <span className="text-[10px] opacity-60 font-mono">({t.count})</span>
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
      <aside className="hidden lg:block w-64 shrink-0">
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
            className="w-[85vw] max-w-xs h-full bg-zinc-950 border-r border-zinc-800 p-4 sm:p-5 overflow-y-auto shadow-2xl animate-drawer safe-top safe-bottom"
          >
            {content}
          </div>
        </div>
      )}
    </>
  );
}
