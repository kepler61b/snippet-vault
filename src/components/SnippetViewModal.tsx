"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
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
  History,
  Play,
  Terminal,
} from "lucide-react";
import { SnippetItem, SnippetFileItem } from "@/types/snippet";
import { CodeBlock } from "./CodeBlock";
import { getLanguageMeta } from "@/lib/languages";
import { CollectionIcon } from "@/lib/collection-icons";
import { useI18n } from "@/lib/i18n";
import { MarkdownPreview } from "./MarkdownPreview";
import { SnippetRevisionsModal } from "./SnippetRevisionsModal";
import { CodePlaygroundModal } from "./CodePlaygroundModal";
import { AICodeAssistantBlock } from "./AICodeAssistantBlock";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";

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
  onSnippetUpdated?: (updated: SnippetItem) => void;
}

export function SnippetViewModal({
  isOpen,
  onClose,
  snippet,
  onEdit,
  onDelete,
  onToggleFavorite,
  onTriggerAI,
  onSnippetUpdated,
}: SnippetViewModalProps) {
  const { t, locale, tFilesCount } = useI18n();

  // Prevent background scrolling while modal is open
  useLockBodyScroll(isOpen);
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [internalSnippet, setInternalSnippet] = useState<SnippetItem | null>(snippet);
  const [isRevisionsOpen, setIsRevisionsOpen] = useState(false);
  const [isPlaygroundOpen, setIsPlaygroundOpen] = useState(false);

  // Dynamic Height & Smooth Transitions
  const dialogRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const innerContentRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);

  const [modalHeight, setModalHeight] = useState<number | undefined>(undefined);
  const [hasTransition, setHasTransition] = useState(false);
  const isReadyForTransitionRef = useRef(false);

  const updateModalHeight = useCallback(() => {
    if (!headerRef.current || !innerContentRef.current) return;
    const headerH = headerRef.current.offsetHeight;
    const footerH = footerRef.current ? footerRef.current.offsetHeight : 0;
    const contentH = Math.max(
      innerContentRef.current.offsetHeight,
      innerContentRef.current.scrollHeight
    );
    if (contentH === 0) return;

    // Add +2px safety buffer to avoid accidental 1px subpixel overflow
    const targetH = headerH + contentH + footerH + 2;
    const viewportH = window.visualViewport?.height || window.innerHeight;
    const isMobile = window.innerWidth < 640;
    const maxH = isMobile ? viewportH * 0.96 : viewportH * 0.92;
    const minH = isMobile ? 240 : 280;
    const finalH = Math.min(maxH, Math.max(minH, targetH));
    setModalHeight(Math.round(finalH));
  }, []);

  useEffect(() => {
    // Initial measurement
    updateModalHeight();

    // Enable smooth height transitions after entrance animation (0.28s) completes
    const timer = setTimeout(() => {
      isReadyForTransitionRef.current = true;
      setHasTransition(true);
      updateModalHeight();
    }, 280);

    let observer: ResizeObserver | null = null;
    if (innerContentRef.current && typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(() => {
        updateModalHeight();
      });
      observer.observe(innerContentRef.current);
    }

    const handleResize = () => {
      updateModalHeight();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      clearTimeout(timer);
      if (observer) observer.disconnect();
      window.removeEventListener("resize", handleResize);
    };
  }, [updateModalHeight]);

  useEffect(() => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: "instant" });
    requestAnimationFrame(() => {
      updateModalHeight();
    });
  }, [activeFileIndex, updateModalHeight]);

  useEffect(() => {
    setInternalSnippet(snippet);
  }, [snippet]);

  if (!isOpen || !snippet) return null;

  const currentSnippet = internalSnippet || snippet;

  const currentFile = currentSnippet.files[activeFileIndex] || currentSnippet.files[0];
  const tagList = currentSnippet.tags
    ? currentSnippet.tags.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  const handleCopyShareLink = async () => {
    try {
      const shareUrl = `${window.location.origin}/s/${currentSnippet.shareToken || currentSnippet.id}`;
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

  const handleCopyCurl = async () => {
    if (!currentFile) return;
    const token = currentSnippet.shareToken || currentSnippet.id;
    const rawUrl = `${window.location.origin}/s/${token}/raw/${encodeURIComponent(currentFile.filename)}`;
    const isShellScript =
      ["sh", "bash", "zsh", "shell"].includes(currentFile.language.toLowerCase()) ||
      currentFile.filename.endsWith(".sh");
    const cmd = isShellScript
      ? `curl -sL ${rawUrl} | bash`
      : `curl -sL ${rawUrl} -o ${currentFile.filename}`;
    try {
      await navigator.clipboard.writeText(cmd);
      setCopiedCurl(true);
      setTimeout(() => setCopiedCurl(false), 2000);
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
    if (!currentSnippet) return;
    const a = document.createElement("a");
    a.href = `/api/export?type=snippet&id=${currentSnippet.id}`;
    a.download = `${currentSnippet.title || "snippet"}.snippetvault.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleSnippetRestored = (updated: SnippetItem) => {
    setInternalSnippet(updated);
    if (onSnippetUpdated) {
      onSnippetUpdated(updated);
    }
  };

  const formattedDate = new Date(currentSnippet.createdAt).toLocaleDateString(
    locale === "ru" ? "ru-RU" : "en-US",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 lg:p-6 bg-black/80 backdrop-blur-sm animate-modal-backdrop touch-none">
      <div
        ref={dialogRef}
        style={{
          height: modalHeight ? `${modalHeight}px` : undefined,
          transition: hasTransition
            ? "height 0.32s cubic-bezier(0.16, 1, 0.3, 1)"
            : undefined,
        }}
        className="relative w-full max-w-5xl h-[100dvh] sm:h-auto max-h-[100dvh] sm:max-h-[92vh] flex flex-col rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden animate-modal-content will-change-[height] safe-top touch-auto"
      >
        {/* Header */}
        <div
          ref={headerRef}
          className="px-3.5 sm:px-6 py-2.5 sm:py-3 border-b border-zinc-800 bg-zinc-900/70 space-y-2 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-4 shrink-0"
        >
          <div className="space-y-1 max-w-2xl min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2 sm:block">
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

                <h2 className="text-sm sm:text-base lg:text-lg font-bold text-white tracking-tight break-words">
                  {snippet.title}
                </h2>
              </div>

              {/* Close button for mobile only right in top-right */}
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800/80 bg-zinc-900/60 sm:hidden shrink-0 flex items-center justify-center transition-colors"
                aria-label={t("common.close")}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {currentSnippet.description && (
              <div className="text-xs sm:text-sm text-zinc-300 leading-snug break-words">
                <MarkdownPreview content={currentSnippet.description} />
              </div>
            )}

            <div className="flex items-center gap-3 sm:gap-4 text-[11px] sm:text-xs text-zinc-500 pt-0.5">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {formattedDate}
              </span>
              <span className="flex items-center gap-1">
                <Code2 className="w-3.5 h-3.5" />
                {tFilesCount(currentSnippet.files.length)}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 shrink-0 sm:self-center">
            <button
              onClick={() => onToggleFavorite(currentSnippet.id)}
              className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all active:scale-95 ${
                currentSnippet.isFavorite
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30"
                  : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 hover:border-zinc-700"
              }`}
              title={currentSnippet.isFavorite ? t("snippets.removeFromFavorites") : t("snippets.addToFavorites")}
              aria-label={t("sidebar.favorites")}
            >
              <Star className={`w-4 h-4 ${currentSnippet.isFavorite ? "fill-amber-400" : ""}`} />
            </button>

            <button
              onClick={() => setIsRevisionsOpen(true)}
              className="w-9 h-9 rounded-xl flex items-center justify-center border border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-white hover:bg-zinc-800 hover:border-zinc-700 transition-all active:scale-95"
              title={t("view.revisions")}
              aria-label={t("view.revisions")}
            >
              <History className="w-4 h-4" />
            </button>

            <button
              onClick={() => onEdit(currentSnippet)}
              className="w-9 h-9 rounded-xl flex items-center justify-center border border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-white hover:bg-zinc-800 hover:border-zinc-700 transition-all active:scale-95"
              title={t("view.editSnippet")}
              aria-label={t("view.editSnippet")}
            >
              <Edit3 className="w-4 h-4" />
            </button>

            <button
              onClick={handleExportSnippet}
              className="w-9 h-9 rounded-xl flex items-center justify-center border border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-white hover:bg-zinc-800 hover:border-zinc-700 transition-all active:scale-95"
              title={`${t("common.export")} (.json)`}
              aria-label={t("common.export")}
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                if (confirm(t("view.confirmDelete"))) {
                  onDelete(currentSnippet.id);
                  onClose();
                }
              }}
              className="w-9 h-9 rounded-xl flex items-center justify-center border border-zinc-800 bg-zinc-900/60 text-rose-400 hover:text-rose-300 hover:bg-rose-500/15 hover:border-rose-500/30 transition-all active:scale-95"
              title={t("common.delete")}
              aria-label={t("common.delete")}
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <div className="hidden sm:block w-px h-5 bg-zinc-800 mx-0.5" />

            <button
              onClick={onClose}
              className="hidden sm:flex w-9 h-9 rounded-xl items-center justify-center border border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-white hover:bg-zinc-800 hover:border-zinc-700 transition-all active:scale-95"
              aria-label={t("common.close")}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto min-h-0 overscroll-contain"
        >
          <div
            ref={innerContentRef}
            className="p-3 sm:p-6 space-y-3 sm:space-y-4"
          >
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
                  {currentSnippet.files.map((file, idx) => {
                    const meta = getLanguageMeta(file.language);
                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          setActiveFileIndex(idx);
                          scrollContainerRef.current?.scrollTo({ top: 0, behavior: "instant" });
                        }}
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
                  {/* Copy curl command */}
                  <button
                    onClick={handleCopyCurl}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-amber-400 hover:bg-amber-500/10 transition-colors flex-shrink-0"
                    title={t("view.copyCurlCmd")}
                  >
                    {copiedCurl ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">{t("common.copied")}</span>
                      </>
                    ) : (
                      <>
                        <Terminal className="w-3.5 h-3.5" />
                        <span>curl</span>
                      </>
                    )}
                  </button>

                  {/* Direct Raw view link */}
                  {currentFile && (
                    <a
                      href={`/s/${currentSnippet.shareToken || currentSnippet.id}/raw/${encodeURIComponent(currentFile.filename)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-sky-400 hover:bg-sky-500/10 transition-colors flex-shrink-0"
                      title="Raw File"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Raw</span>
                    </a>
                  )}

                  <button
                    onClick={() => setIsPlaygroundOpen(true)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-teal-400 hover:bg-teal-500/10 transition-colors flex-shrink-0"
                    title={t("view.runCodeTooltip")}
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>{t("view.runCode")}</span>
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

              {/* AI Code Assistant Inline Block */}
              {currentFile && (
                <div className="mt-3">
                  <AICodeAssistantBlock
                    code={currentFile.content}
                    language={currentFile.language}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          ref={footerRef}
          className="flex items-center justify-between px-4 sm:px-6 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:py-3.5 border-t border-zinc-800 bg-zinc-900/80 shrink-0"
        >
          <button
            onClick={handleCopyShareLink}
            className={`h-9 sm:h-10 px-3.5 sm:px-4 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-2 border shadow-sm transition-all active:scale-95 ${
              copiedLink
                ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300 shadow-emerald-500/10"
                : "border-zinc-700/80 bg-zinc-800/90 hover:bg-zinc-750 text-zinc-100 hover:text-white hover:border-zinc-600 shadow-zinc-950/40"
            }`}
          >
            {copiedLink ? (
              <>
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-semibold">{t("view.shareCopiedBadge")}</span>
              </>
            ) : (
              <>
                <ExternalLink className="w-4 h-4 text-zinc-300 shrink-0" />
                <span>{t("view.shareLink")}</span>
              </>
            )}
          </button>

          <button
            onClick={onClose}
            className="h-9 sm:h-10 px-4 sm:px-5 rounded-xl text-xs sm:text-sm font-medium flex items-center justify-center border border-zinc-700/80 bg-zinc-800/90 hover:bg-zinc-750 text-zinc-200 hover:text-white hover:border-zinc-600 shadow-sm shadow-zinc-950/40 transition-all active:scale-95"
          >
            {t("common.close")}
          </button>
        </div>
      </div>

      {/* Version History Modal */}
      <SnippetRevisionsModal
        isOpen={isRevisionsOpen}
        onClose={() => setIsRevisionsOpen(false)}
        snippet={currentSnippet}
        onSnippetRestored={handleSnippetRestored}
      />

      {/* Code Playground Modal */}
      <CodePlaygroundModal
        isOpen={isPlaygroundOpen}
        onClose={() => setIsPlaygroundOpen(false)}
        files={currentSnippet.files}
        initialFileIndex={activeFileIndex}
      />
    </div>
  );
}
