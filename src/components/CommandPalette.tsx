"use client";

import React, { useEffect, useState } from "react";
import {
  Code,
  FileCode,
  FolderGit2,
  Plus,
  Search,
  Settings,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import { SnippetItem } from "@/types/snippet";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  snippets: SnippetItem[];
  onSelectSnippet: (snippet: SnippetItem) => void;
  onOpenCreateModal: () => void;
  onOpenSettingsModal: () => void;
  onShowFavorites: () => void;
}

export function CommandPalette({
  isOpen,
  onClose,
  snippets,
  onSelectSnippet,
  onOpenCreateModal,
  onOpenSettingsModal,
  onShowFavorites,
}: CommandPaletteProps) {
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
      title: "Создать новый сниппет",
      icon: Plus,
      run: () => {
        onClose();
        onOpenCreateModal();
      },
    },
    {
      id: "favorites",
      title: "Показать только Избранное",
      icon: Star,
      run: () => {
        onClose();
        onShowFavorites();
      },
    },
    {
      id: "settings",
      title: "Настройки (Профиль, 2FA, AI)",
      icon: Settings,
      run: () => {
        onClose();
        onOpenSettingsModal();
      },
    },
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
      className="fixed inset-0 z-50 flex items-start justify-center pt-4 sm:pt-20 p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-modal-backdrop"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[88vh] rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden flex flex-col animate-modal-content"
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 border-b border-zinc-800 bg-zinc-900/60">
          <Search className="w-5 h-5 text-zinc-500 mr-3" />
          <input
            type="text"
            autoFocus
            placeholder="Поиск по сниппетам, файлам или командам..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full py-4 bg-transparent text-sm text-zinc-100 placeholder-zinc-500 outline-none"
          />
          <kbd className="px-2 py-0.5 text-[10px] font-mono text-zinc-500 bg-zinc-900 rounded border border-zinc-800">
            ESC
          </kbd>
        </div>

        {/* List of results */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-1">
          {/* Actions section */}
          {!query && (
            <div className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Быстрые действия
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
                className={`flex items-center gap-3 w-full px-3 py-2 rounded-xl text-left text-xs font-medium transition-all ${
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
                <span>{act.title}</span>
              </button>
            );
          })}

          {/* Snippets section */}
          <div className="px-3 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Сниппеты ({filteredSnippets.length})
          </div>

          {filteredSnippets.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-500">
              Ничего не найдено по запросу «{query}»
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
                  className={`flex items-center justify-between w-full px-3 py-2 rounded-xl text-left text-xs transition-all ${
                    isSelected
                      ? "bg-violet-600 text-white shadow-sm"
                      : "text-zinc-300 hover:bg-zinc-900"
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <FileCode
                      className={`w-4 h-4 flex-shrink-0 ${
                        isSelected ? "text-white" : "text-zinc-500"
                      }`}
                    />
                    <div className="truncate">
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

                  <div className="flex items-center gap-1.5 flex-shrink-0 ml-3">
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
