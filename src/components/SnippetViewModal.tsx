"use client";

import React, { useState } from "react";
import {
  Calendar,
  Check,
  Code2,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  FileCode,
  Share2,
  Sparkles,
  Star,
  Trash2,
  Wand2,
  X,
} from "lucide-react";
import { SnippetItem, SnippetFileItem } from "@/types/snippet";
import { CodeBlock } from "./CodeBlock";
import { getLanguageMeta } from "@/lib/languages";
import { CollectionIcon } from "@/lib/collection-icons";
import { useI18n } from "@/lib/i18n";

interface SnippetViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  snippet: SnippetItem | null;
  onEdit: (snippet: SnippetItem) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onTriggerAI: (
    action: "explain" | "refactor" | "document",
    code: string,
    language: string
  ) => Promise<any>;
}

export function SnippetViewModal({
  isOpen,
  onClose,
  snippet,
  onEdit,
  onDelete,
  onToggleFavorite,
  onTriggerAI,
}: SnippetViewModalProps) {
  const { t, locale, tFilesCount } = useI18n();
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);

  if (!isOpen || !snippet) return null;

  const currentFile = snippet.files[activeFileIndex] || snippet.files[0];
  const tagList = snippet.tags
    ? snippet.tags.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  const handleCopyShareLink = async () => {
    try {
      const shareUrl = `${window.location.origin}/s/${snippet.shareToken || snippet.id}`;
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopyAsMarkdown = async () => {
    if (!currentFile) return;
    try {
      const md = `\`\`\`${currentFile.language}\n// ${currentFile.filename}\n${currentFile.content}\n\`\`\``;
      await navigator.clipboard.writeText(md);
      setCopiedMarkdown(true);
      setTimeout(() => setCopiedMarkdown(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownloadFile = () => {
    if (!currentFile) return;
    const blob = new Blob([currentFile.content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = currentFile.filename || "snippet.txt";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportSnippet = () => {
    if (!snippet) return;
    const a = document.createElement("a");
    a.href = `/api/export?type=snippet&id=${snippet.id}`;
    a.download = `${snippet.title || "snippet"}.snippetvault.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const formattedDate = new Date(snippet.createdAt).toLocaleDateString(
    locale === "ru" ? "ru-RU" : "en-US",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 lg:p-6 bg-black/80 backdrop-blur-sm animate-modal-backdrop">
      <div className="relative w-full max-w-5xl h-[100dvh] sm:h-[92vh] max-h-[100dvh] flex flex-col rounded-none sm:rounded-2xl border-0 sm:border border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden animate-modal-content safe-top">
        {/* Header */}
        <div className="px-3.5 sm:px-6 py-3 sm:py-4 border-b border-zinc-800 bg-zinc-900/70 space-y-2 sm:space-y-0 sm:flex sm:items-start sm:justify-between sm:gap-4">
          <div className="space-y-1.5 max-w-2xl min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2 sm:block">
              <div className="flex flex-wrap items-center gap-2 min-w-0">
                {snippet.collection && (
                  <span
                    className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border shrink-0"
                    style={{
                      backgroundColor: `${snippet.collection.color || "#8b5cf6"}15`,
                      borderColor: `${snippet.collection.color || "#8b5cf6"}35`,
                      color: snippet.collection.color || "#a78bfa",
                    }}
                  >
                    <CollectionIcon
                      iconType={snippet.collection.iconType}
                      iconValue={snippet.collection.iconValue}
                      color={snippet.collection.color}
                      className="w-3.5 h-3.5"
                    />
                    <span>{snippet.collection.name}</span>
                  </span>
                )}

                <h2 className="text-sm sm:text-lg font-bold text-white tracking-tight break-words">
                  {snippet.title}
                </h2>
              </div>

              {/* Close button for mobile only right in top-right */}
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors sm:hidden shrink-0 min-w-[36px] min-h-[36px] flex items-center justify-center"
                aria-label={t("common.close")}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {snippet.description && (
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed break-words">
                {snippet.description}
              </p>
            )}

            <div className="flex items-center gap-3 sm:gap-4 text-[11px] sm:text-xs text-zinc-500 pt-0.5">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {formattedDate}
              </span>
              <span className="flex items-center gap-1">
                <Code2 className="w-3.5 h-3.5" />
                {tFilesCount(snippet.files.length)}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 self-start shrink-0 pt-1 sm:pt-0">
            <button
              onClick={() => onToggleFavorite(snippet.id)}
              className={`p-2 rounded-xl transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center ${
                snippet.isFavorite
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800"
              }`}
              title={snippet.isFavorite ? t("snippets.removeFromFavorites") : t("snippets.addToFavorites")}
              aria-label={t("sidebar.favorites")}
            >
              <Star className={`w-4 h-4 ${snippet.isFavorite ? "fill-amber-400" : ""}`} />
            </button>

            <button
              onClick={() => onEdit(snippet)}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
              title={t("view.editSnippet")}
              aria-label={t("view.editSnippet")}
            >
              <Edit3 className="w-4 h-4" />
            </button>

            <button
              onClick={handleExportSnippet}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
              title={`${t("common.export")} (.json)`}
              aria-label={t("common.export")}
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                if (confirm(t("view.confirmDelete"))) {
                  onDelete(snippet.id);
                  onClose();
                }
              }}
              className="p-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-zinc-800 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
              title={t("common.delete")}
              aria-label={t("common.delete")}
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="hidden sm:flex p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors min-w-[36px] min-h-[36px] items-center justify-center"
              aria-label={t("common.close")}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-3 sm:space-y-4">
          {/* Tags */}
          {tagList.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pb-2 border-b border-zinc-800/60">
              {tagList.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Files Container */}
          <div className="border border-zinc-800 rounded-xl sm:rounded-2xl overflow-hidden bg-zinc-950">
            {/* File Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 bg-zinc-900/80 px-2 py-1 gap-1">
              <div className="flex items-center gap-1 overflow-x-auto py-1 max-w-full scrollbar-none">
                {snippet.files.map((file, idx) => {
                  const meta = getLanguageMeta(file.language);
                  return (
                    <button
                      key={idx}
                      onClick={() => setActiveFileIndex(idx)}
                      className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex-shrink-0 ${
                        activeFileIndex === idx
                          ? "bg-zinc-800 text-white shadow-sm border border-zinc-700/60"
                          : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: meta.color }}
                      />
                      <span>{file.filename}</span>
                    </button>
                  );
                })}
              </div>

              {/* AI & Quick action buttons */}
              <div className="flex items-center gap-1 overflow-x-auto py-1 border-t sm:border-t-0 border-zinc-800/60 scrollbar-none">
                <button
                  onClick={async () => {
                    try {
                      await onTriggerAI("explain", currentFile.content, currentFile.language);
                    } catch (e: any) {
                      if (e?.code !== "AI_KEY_REQUIRED" && !e?.message?.includes("AI_KEY_REQUIRED") && !e?.message?.includes("AI API ключ не настроен")) {
                        alert(e.message);
                      }
                    }
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-sky-400 hover:bg-sky-500/10 transition-colors flex-shrink-0"
                  title={t("editor.quickActionExplain")}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{t("aiModal.tabExplain")}</span>
                </button>

                <button
                  onClick={async () => {
                    try {
                      await onTriggerAI("refactor", currentFile.content, currentFile.language);
                    } catch (e: any) {
                      if (e?.code !== "AI_KEY_REQUIRED" && !e?.message?.includes("AI_KEY_REQUIRED") && !e?.message?.includes("AI API ключ не настроен")) {
                        alert(e.message);
                      }
                    }
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-emerald-400 hover:bg-emerald-500/10 transition-colors flex-shrink-0"
                  title={t("editor.quickActionRefactor")}
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>{t("aiModal.tabRefactor")}</span>
                </button>

                <button
                  onClick={handleCopyAsMarkdown}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-zinc-300 hover:bg-zinc-800 transition-colors flex-shrink-0"
                  title={t("view.copyMarkdown")}
                >
                  {copiedMarkdown ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>Markdown</span>
                </button>

                <button
                  onClick={handleDownloadFile}
                  className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors flex-shrink-0"
                  title={t("view.downloadFile")}
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Code Block with line numbers and syntax highlighting */}
            {currentFile && (
              <CodeBlock
                code={currentFile.content}
                language={currentFile.language}
                className="border-none rounded-none"
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-3.5 sm:px-6 py-2.5 sm:py-4 border-t border-zinc-800 bg-zinc-900/60 safe-bottom">
          <button
            onClick={handleCopyShareLink}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-medium text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-700 transition-colors"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">{t("view.shareCopiedBadge")}</span>
              </>
            ) : (
              <>
                <ExternalLink className="w-3.5 h-3.5" />
                <span>{t("view.shareLink")}</span>
              </>
            )}
          </button>

          <button
            onClick={onClose}
            className="px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            {t("common.close")}
          </button>
        </div>
      </div>
    </div>
  );
}
