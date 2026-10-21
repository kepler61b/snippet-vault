"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Code2,
  FileCode,
  FolderGit2,
  Loader2,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  Terminal,
  X,
} from "lucide-react";
import { SnippetItem, SnippetFileItem } from "@/types/snippet";
import { Navbar } from "@/components/Navbar";
import { Sidebar } from "@/components/Sidebar";
import { SnippetCard } from "@/components/SnippetCard";
import { SnippetEditorModal } from "@/components/SnippetEditorModal";
import { SnippetViewModal } from "@/components/SnippetViewModal";
import { AIModal } from "@/components/AIModal";
import { SettingsModal } from "@/components/SettingsModal";
import { CommandPalette } from "@/components/CommandPalette";

export default function HomePage() {
  const [snippets, setSnippets] = useState<SnippetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<
    "ALL" | "FAVORITES" | "PUBLIC" | "UNLISTED" | "PRIVATE"
  >("ALL");
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingSnippet, setEditingSnippet] = useState<SnippetItem | null>(null);
  const [viewingSnippet, setViewingSnippet] = useState<SnippetItem | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // AI Modal
  const [aiModal, setAiModal] = useState<{
    isOpen: boolean;
    title: string;
    type: "explain" | "refactor" | "document" | "general";
    content: string;
    language?: string;
  }>({
    isOpen: false,
    title: "",
    type: "general",
    content: "",
    language: "plaintext",
  });

  const fetchSnippets = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/snippets");
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Ошибка загрузки сниппетов");
      }
      setSnippets(data.snippets || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Не удалось загрузить сниппеты");
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (data.success && data.user) {
        setCurrentUser(data.user);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
    fetchSnippets();
  }, []);

  // Compute languages & tags with counts
  const { languages, tags, favoriteCount } = useMemo(() => {
    const langMap: Record<string, number> = {};
    const tagMap: Record<string, number> = {};
    let favCount = 0;

    snippets.forEach((s) => {
      if (s.isFavorite) favCount++;

      if (s.tags) {
        s.tags.split(",").forEach((t) => {
          const clean = t.trim().toLowerCase();
          if (clean) tagMap[clean] = (tagMap[clean] || 0) + 1;
        });
      }

      const snippetLangs = new Set<string>();
      s.files.forEach((f) => {
        if (f.language) snippetLangs.add(f.language.toLowerCase());
      });
      snippetLangs.forEach((l) => {
        langMap[l] = (langMap[l] || 0) + 1;
      });
    });

    const lList = Object.entries(langMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const tList = Object.entries(tagMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    return { languages: lList, tags: tList, favoriteCount: favCount };
  }, [snippets]);

  // Filtered snippets
  const filteredSnippets = useMemo(() => {
    return snippets.filter((s) => {
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const inTitle = s.title.toLowerCase().includes(q);
        const inDesc = s.description?.toLowerCase().includes(q);
        const inTags = s.tags.toLowerCase().includes(q);
        const inFiles = s.files.some(
          (f) =>
            f.filename.toLowerCase().includes(q) ||
            f.content.toLowerCase().includes(q)
        );
        if (!inTitle && !inDesc && !inTags && !inFiles) return false;
      }

      // Filter category
      if (selectedFilter === "FAVORITES" && !s.isFavorite) return false;
      if (selectedFilter === "PUBLIC" && s.visibility !== "PUBLIC") return false;
      if (selectedFilter === "UNLISTED" && s.visibility !== "UNLISTED") return false;
      if (selectedFilter === "PRIVATE" && s.visibility !== "PRIVATE") return false;

      // Language filter
      if (selectedLanguage) {
        const hasLang = s.files.some(
          (f) => f.language.toLowerCase() === selectedLanguage.toLowerCase()
        );
        if (!hasLang) return false;
      }

      // Tag filter
      if (selectedTag) {
        const tagList = s.tags
          .split(",")
          .map((t) => t.trim().toLowerCase());
        if (!tagList.includes(selectedTag.toLowerCase())) return false;
      }

      return true;
    });
  }, [snippets, searchQuery, selectedFilter, selectedLanguage, selectedTag]);

  // Toggle favorite
  const handleToggleFavorite = async (id: string) => {
    // Optimistic update
    setSnippets((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isFavorite: !s.isFavorite } : s))
    );
    if (viewingSnippet && viewingSnippet.id === id) {
      setViewingSnippet((prev) =>
        prev ? { ...prev, isFavorite: !prev.isFavorite } : null
      );
    }

    try {
      const res = await fetch(`/api/snippets/${id}/favorite`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        // Revert
        fetchSnippets();
      }
    } catch {
      fetchSnippets();
    }
  };

  // Delete snippet
  const handleDeleteSnippet = async (id: string) => {
    // Optimistic update
    setSnippets((prev) => prev.filter((s) => s.id !== id));
    if (viewingSnippet && viewingSnippet.id === id) {
      setViewingSnippet(null);
    }

    try {
      await fetch(`/api/snippets/${id}`, { method: "DELETE" });
    } catch (e) {
      console.error("Delete failed", e);
      fetchSnippets();
    }
  };

  // Save (Create or Update)
  const handleSaveSnippet = async (data: any) => {
    if (editingSnippet) {
      const res = await fetch(`/api/snippets/${editingSnippet.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || "Ошибка обновления");
      }
      setSnippets((prev) =>
        prev.map((s) => (s.id === editingSnippet.id ? result.snippet : s))
      );
      if (viewingSnippet && viewingSnippet.id === editingSnippet.id) {
        setViewingSnippet(result.snippet);
      }
      setEditingSnippet(null);
    } else {
      const res = await fetch("/api/snippets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || "Ошибка создания");
      }
      setSnippets((prev) => [result.snippet, ...prev]);
      setIsCreateOpen(false);
    }
  };

  // AI Trigger
  const handleTriggerAI = async (
    action: "meta" | "explain" | "refactor" | "document",
    filesOrCode: SnippetFileItem[] | string,
    activeFileOrLang?: SnippetFileItem | string
  ) => {
    if (action === "meta") {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "meta",
          files: filesOrCode,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "AI error");
      }
      return data.meta;
    }

    // explain, refactor, document
    const code = typeof filesOrCode === "string" ? filesOrCode : "";
    const language =
      typeof activeFileOrLang === "string" ? activeFileOrLang : "plaintext";

    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        code,
        language,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "AI error");
    }

    const titleMap = {
      explain: "Объяснение кода",
      refactor: "Рефакторинг и оптимизация",
      document: "Документация и комментарии",
    };

    setAiModal({
      isOpen: true,
      title: titleMap[action] || "AI Результат",
      type: action,
      content: data.result,
      language,
    });

    return data.result;
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <Navbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenCreateModal={() => setIsCreateOpen(true)}
        onOpenSettingsModal={() => setIsSettingsOpen(true)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        currentUser={currentUser}
      />

      {/* Main Content Area */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 flex flex-col lg:flex-row gap-8">
        {/* Left Sidebar */}
        <Sidebar
          totalCount={snippets.length}
          favoriteCount={favoriteCount}
          selectedFilter={selectedFilter}
          onSelectFilter={setSelectedFilter}
          selectedLanguage={selectedLanguage}
          onSelectLanguage={setSelectedLanguage}
          selectedTag={selectedTag}
          onSelectTag={setSelectedTag}
          languages={languages}
          tags={tags}
          isMobileOpen={isMobileFilterOpen}
          onCloseMobile={() => setIsMobileFilterOpen(false)}
        />

        {/* Right Main Grid */}
        <main className="flex-1 min-w-0 space-y-6">
          {/* Mobile Filter & Search Bar */}
          <div className="flex items-center gap-2 lg:hidden w-full">
            <div className="flex-1 flex items-center px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-900/80 text-xs text-zinc-300">
              <Search className="w-3.5 h-3.5 text-zinc-400 mr-2 flex-shrink-0" />
              <input
                type="text"
                placeholder="Поиск по коду, тегам..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent outline-none w-full text-xs"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="text-zinc-500 hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <button
              onClick={() => setIsMobileFilterOpen(true)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-colors flex-shrink-0 ${
                selectedFilter !== "ALL" || selectedLanguage !== null || selectedTag !== null
                  ? "bg-violet-600/20 border-violet-500/50 text-violet-300"
                  : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white"
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Фильтры</span>
              {(selectedFilter !== "ALL" || selectedLanguage !== null || selectedTag !== null) && (
                <span className="w-4 h-4 rounded-full bg-violet-600 text-white text-[10px] flex items-center justify-center font-bold">
                  {(selectedFilter !== "ALL" ? 1 : 0) +
                    (selectedLanguage ? 1 : 0) +
                    (selectedTag ? 1 : 0)}
                </span>
              )}
            </button>
          </div>

          {/* Top Bar inside content: Quick Count and active criteria */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-800/80">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <span>Сниппеты</span>
                <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
                  {filteredSnippets.length}
                </span>
              </h1>
              <p className="text-xs text-zinc-500">
                {selectedFilter === "FAVORITES"
                  ? "Только избранные сниппеты"
                  : selectedTag
                  ? `Фильтр по тегу #${selectedTag}`
                  : selectedLanguage
                  ? `Фильтр по языку: ${selectedLanguage}`
                  : "Все сохраненные фрагменты кода"}
              </p>
            </div>
          </div>

          {/* Error notice */}
          {error && (
            <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs">
              {error}
            </div>
          )}

          {/* Loading state */}
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center text-zinc-500 space-y-3">
              <Loader2 className="w-7 h-7 animate-spin text-violet-500" />
              <p className="text-xs font-medium">Загрузка базы сниппетов...</p>
            </div>
          ) : filteredSnippets.length === 0 ? (
            /* Empty state */
            <div className="py-20 flex flex-col items-center justify-center text-center p-6 rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/50">
              <div className="w-12 h-12 rounded-2xl bg-zinc-900 flex items-center justify-center text-zinc-500 mb-4 border border-zinc-800">
                <FileCode className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-200 mb-1">
                Сниппеты не найдены
              </h3>
              <p className="text-xs text-zinc-500 max-w-sm mb-5 leading-relaxed">
                {searchQuery || selectedLanguage || selectedTag || selectedFilter !== "ALL"
                  ? "По выбранным критериям фильтрации ничего не найдено. Попробуйте сбросить фильтры."
                  : "Ваша библиотека пуста. Создайте свой первый сниппет с поддержкой нескольких файлов и подсветки синтаксиса!"}
              </p>
              <button
                onClick={() => setIsCreateOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 transition-all shadow-md shadow-violet-600/20"
              >
                <Plus className="w-4 h-4" />
                <span>Создать первый сниппет</span>
              </button>
            </div>
          ) : (
            /* Snippets Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredSnippets.map((snippet) => (
                <SnippetCard
                  key={snippet.id}
                  snippet={snippet}
                  onView={(s) => setViewingSnippet(s)}
                  onEdit={(s) => setEditingSnippet(s)}
                  onDelete={handleDeleteSnippet}
                  onToggleFavorite={handleToggleFavorite}
                  onSelectTag={(t) => setSelectedTag(t)}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950 py-6 text-center text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-violet-500" />
            <span className="font-semibold text-zinc-400">SnippetVault</span>
            <span>— Dockerized Code Snippets Manager with AI</span>
          </div>
          <div className="text-[11px] text-zinc-500">
            Нажмите <kbd className="px-1.5 py-0.5 bg-zinc-900 rounded border border-zinc-800 font-mono text-[10px]">Ctrl+K</kbd> для командной строки
          </div>
        </div>
      </footer>

      {/* Create / Edit Modal */}
      {(isCreateOpen || editingSnippet) && (
        <SnippetEditorModal
          isOpen={isCreateOpen || Boolean(editingSnippet)}
          snippet={editingSnippet}
          onClose={() => {
            setIsCreateOpen(false);
            setEditingSnippet(null);
          }}
          onSave={handleSaveSnippet}
          onTriggerAI={async (action, files, activeFile) => {
            if (action === "meta") {
              return handleTriggerAI("meta", files, activeFile);
            } else {
              return handleTriggerAI(action, activeFile.content, activeFile.language);
            }
          }}
        />
      )}

      {/* View Full Snippet Modal */}
      {viewingSnippet && (
        <SnippetViewModal
          isOpen={Boolean(viewingSnippet)}
          snippet={viewingSnippet}
          onClose={() => setViewingSnippet(null)}
          onEdit={(s) => {
            setViewingSnippet(null);
            setEditingSnippet(s);
          }}
          onDelete={handleDeleteSnippet}
          onToggleFavorite={handleToggleFavorite}
          onTriggerAI={async (action, code, language) => {
            return handleTriggerAI(action, code, language);
          }}
        />
      )}

      {/* AI Assistant Output Modal */}
      <AIModal
        isOpen={aiModal.isOpen}
        title={aiModal.title}
        type={aiModal.type}
        content={aiModal.content}
        language={aiModal.language}
        onClose={() => setAiModal((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentUser={currentUser}
        onUserUpdated={fetchCurrentUser}
      />

      {/* Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        snippets={snippets}
        onSelectSnippet={(s) => setViewingSnippet(s)}
        onOpenCreateModal={() => setIsCreateOpen(true)}
        onOpenSettingsModal={() => setIsSettingsOpen(true)}
        onShowFavorites={() => setSelectedFilter("FAVORITES")}
      />
    </div>
  );
}
