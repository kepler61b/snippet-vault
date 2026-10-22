"use client";

import React, { useEffect, useState } from "react";
import {
  Code,
  Download,
  FileCode,
  FolderGit2,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  Upload,
  X,
} from "lucide-react";
import { SnippetItem } from "@/types/snippet";
import { useI18n } from "@/lib/i18n";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  snippets: SnippetItem[];
  onSelectSnippet: (snippet: SnippetItem) => void;
  onOpenCreateModal: () => void;
  onOpenSettingsModal: () => void;
  onShowFavorites: () => void;
  onOpenAdminModal?: () => void;
  currentUser?: { role?: string } | null;
}

export function CommandPalette({
  isOpen,
  onClose,
  snippets,
  onSelectSnippet,
  onOpenCreateModal,
  onOpenSettingsModal,
  onShowFavorites,
  onOpenAdminModal,
  currentUser,
}: CommandPaletteProps) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Close on Escape or open on Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!isOpen) return null;

  const filteredSnippets = snippets.filter((s) => {
    const q = query.toLowerCase();
    if (!q) return true;
    const inTitle = s.title.toLowerCase().includes(q);
    const inDesc = s.description?.toLowerCase().includes(q);
    const inTags = s.tags.toLowerCase().includes(q);
    const inFiles = s.files.some(
      (f) =>
        f.filename.toLowerCase().includes(q) ||
        f.content.toLowerCase().includes(q)
    );
    return inTitle || inDesc || inTags || inFiles;
  });

  const actions = [
    {
      id: "create",
      title: t("commandPalette.newSnippet"),
      icon: Plus,
      run: () => {
        onClose();
        onOpenCreateModal();
      },
    },
    {
      id: "favorites",
      title: t("commandPalette.favorites"),
      icon: Star,
      run: () => {
        onClose();
        onShowFavorites();
      },
    },
    {
      id: "export-all",
      title: `${t("settings.data.exportAllBtn")} (.json)`,
      icon: Download,
      run: () => {
        onClose();
        const a = document.createElement("a");
        a.href = "/api/export?type=all";
        a.download = `snippetvault-backup-${new Date().toISOString().split("T")[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      },
    },
    {
      id: "import-backup",
      title: `${t("settings.data.importTitle")} (.json)...`,
      icon: Upload,
      run: () => {
        onClose();
        onOpenSettingsModal();
      },
    },
    {
      id: "settings",
      title: t("commandPalette.openSettings"),
      icon: Settings,
      run: () => {
        onClose();
        onOpenSettingsModal();
      },
    },
    ...(currentUser?.role === "ADMIN" && onOpenAdminModal
      ? [
          {
            id: "admin-panel",
            title: t("admin.title"),
            icon: ShieldCheck,
            run: () => {
              onClose();
              onOpenAdminModal();
            },
          },
        ]
      : []),
  ];

  const totalItems = actions.length + filteredSnippets.length;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, totalItems));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + totalItems) % Math.max(1, totalItems));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex < actions.length) {
        actions[selectedIndex].run();
      } else {
        const snippetIndex = selectedIndex - actions.length;
        if (filteredSnippets[snippetIndex]) {
          onClose();
          onSelectSnippet(filteredSnippets[snippetIndex]);
        }
      }
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-start justify-center pt-1.5 sm:pt-20 p-1.5 sm:p-4 bg-black/80 backdrop-blur-sm animate-modal-backdrop safe-top"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[96dvh] sm:max-h-[88vh] rounded-xl sm:rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden flex flex-col animate-modal-content"
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-3 sm:px-4 border-b border-zinc-800 bg-zinc-900/60">
          <Search className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-500 mr-2.5 sm:mr-3 shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder={t("commandPalette.placeholder")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full py-3 sm:py-4 bg-transparent text-base sm:text-sm text-zinc-100 placeholder-zinc-500 outline-none"
          />
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono text-zinc-500 bg-zinc-900 rounded border border-zinc-800 shrink-0">
            ESC
          </kbd>
          <button
            type="button"
            onClick={onClose}
            className="sm:hidden p-2 rounded-xl text-zinc-400 hover:text-white shrink-0 ml-1 min-w-[36px] min-h-[36px] flex items-center justify-center"
            aria-label={t("common.close")}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* List of results */}
        <div className="max-h-[75vh] sm:max-h-96 overflow-y-auto p-2 space-y-1">
          {/* Actions section */}
          {!query && (
            <div className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              {t("commandPalette.actionsGroup")}
            </div>
          )}
          {actions.map((act, idx) => {
            const Icon = act.icon;
            const isSelected = selectedIndex === idx;
            return (
              <button
                key={act.id}
                onClick={act.run}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`flex items-center gap-2.5 sm:gap-3 w-full px-3 py-2 sm:py-2.5 rounded-xl text-left text-xs font-medium transition-all ${
                  isSelected
                    ? "bg-violet-600 text-white shadow-sm"
                    : "text-zinc-300 hover:bg-zinc-900"
                }`}
              >
                <div
                  className={`p-1 rounded-lg ${
                    isSelected ? "bg-white/20 text-white" : "bg-zinc-800 text-zinc-400"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span className="truncate">{act.title}</span>
              </button>
            );
          })}

          {/* Snippets section */}
          <div className="px-3 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            {t("commandPalette.snippetsGroup")} ({filteredSnippets.length})
          </div>

          {filteredSnippets.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-500">
              {t("commandPalette.noResults")} {query ? `(«${query}»)` : ""}
            </div>
          ) : (
            filteredSnippets.map((snippet, idx) => {
              const itemIndex = actions.length + idx;
              const isSelected = selectedIndex === itemIndex;
              return (
                <button
                  key={snippet.id}
                  onClick={() => {
                    onClose();
                    onSelectSnippet(snippet);
                  }}
                  onMouseEnter={() => setSelectedIndex(itemIndex)}
                  className={`flex items-center justify-between w-full px-2.5 sm:px-3 py-2 rounded-xl text-left text-xs transition-all ${
                    isSelected
                      ? "bg-violet-600 text-white shadow-sm"
                      : "text-zinc-300 hover:bg-zinc-900"
                  }`}
                >
                  <div className="flex items-center gap-2 sm:gap-2.5 truncate flex-1 min-w-0">
                    <FileCode
                      className={`w-4 h-4 flex-shrink-0 ${
                        isSelected ? "text-white" : "text-zinc-500"
                      }`}
                    />
                    <div className="truncate flex-1 min-w-0">
                      <div className="font-semibold truncate">{snippet.title}</div>
                      {snippet.description && (
                        <div
                          className={`text-[11px] truncate ${
                            isSelected ? "text-violet-200" : "text-zinc-500"
                          }`}
                        >
                          {snippet.description}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                    {snippet.files.slice(0, 1).map((f, i) => (
                      <span
                        key={i}
                        className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                          isSelected
                            ? "bg-white/20 text-white"
                            : "bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        {f.language}
                      </span>
                    ))}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
