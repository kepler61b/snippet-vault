"use client";

import React, { useState } from "react";
import {
  Check,
  Code2,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  FileCode,
  MoreVertical,
  Star,
  Trash2,
} from "lucide-react";
import { SnippetItem } from "@/types/snippet";
import { getLanguageMeta } from "@/lib/languages";
import { CollectionIcon } from "@/lib/collection-icons";

interface SnippetCardProps {
  snippet: SnippetItem;
  onView: (snippet: SnippetItem) => void;
  onEdit: (snippet: SnippetItem) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onSelectTag?: (tag: string) => void;
}

export function SnippetCard({
  snippet,
  onView,
  onEdit,
  onDelete,
  onToggleFavorite,
  onSelectTag,
}: SnippetCardProps) {
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const primaryFile = snippet.files[0];
  const fileCount = snippet.files?.length || 0;
  const tagList = snippet.tags
    ? snippet.tags.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  const handleCopyCode = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!primaryFile) return;
    try {
      await navigator.clipboard.writeText(primaryFile.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopyShareLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const shareUrl = `${window.location.origin}/s/${snippet.shareToken || snippet.id}`;
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleExportSnippet = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    const a = document.createElement("a");
    a.href = `/api/export?type=snippet&id=${snippet.id}`;
    a.download = `${snippet.title || "snippet"}.snippetvault.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Extract preview lines (max 4 lines)
  const previewLines = primaryFile?.content
    ? primaryFile.content.split("\n").slice(0, 4).join("\n")
    : "";

  return (
    <div
      onClick={() => onView(snippet)}
      className="group relative flex flex-col justify-between rounded-2xl border border-zinc-800/80 bg-zinc-900/40 hover:bg-zinc-900/80 hover:border-zinc-700/80 p-5 cursor-pointer hover:shadow-xl hover:shadow-indigo-500/10 backdrop-blur-sm card-lift"
    >
      <div>
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="flex-1 min-w-0">
            {snippet.collection && (
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border mr-1 flex-shrink-0"
                  style={{
                    backgroundColor: `${snippet.collection.color || "#8b5cf6"}15`,
                    borderColor: `${snippet.collection.color || "#8b5cf6"}35`,
                    color: snippet.collection.color || "#a78bfa",
                  }}
                  title={`Коллекция: ${snippet.collection.name}`}
                >
                  <CollectionIcon
                    iconType={snippet.collection.iconType}
                    iconValue={snippet.collection.iconValue}
                    color={snippet.collection.color}
                    className="w-3 h-3"
                  />
                  <span className="truncate max-w-[100px]">{snippet.collection.name}</span>
                </span>
              </div>
            )}

              <h3 className="text-base font-semibold text-zinc-100 group-hover:text-white truncate transition-colors">
                {snippet.title}
              </h3>
              {snippet.description && (
                <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                  {snippet.description}
                </p>
              )}
            </div>

          {/* Star & Action Menu */}
          <div className="flex items-center gap-1 -mr-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(snippet.id);
              }}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-amber-400 hover:bg-zinc-800 transition-all active:scale-90"
              title={snippet.isFavorite ? "Убрать из избранного" : "В избранное"}
            >
              <Star
                className={`w-4 h-4 transition-all duration-200 ${
                  snippet.isFavorite
                    ? "fill-amber-400 text-amber-400 scale-110"
                    : "text-zinc-500 hover:text-amber-400 hover:scale-115"
                }`}
              />
            </button>

            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(!menuOpen);
                }}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {menuOpen && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-0 mt-1 w-44 rounded-xl border border-zinc-800 bg-zinc-950 p-1 shadow-xl z-20 text-xs"
                >
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onEdit(snippet);
                    }}
                    className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-zinc-300 hover:bg-zinc-800 hover:text-white"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Редактировать</span>
                  </button>
                  <button
                    onClick={handleCopyShareLink}
                    className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-zinc-300 hover:bg-zinc-800 hover:text-white"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{copiedLink ? "Ссылка скопирована!" : "Скопировать ссылку"}</span>
                  </button>
                  <button
                    onClick={handleExportSnippet}
                    className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-zinc-300 hover:bg-zinc-800 hover:text-white"
                  >
                    <Download className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Экспорт (.json)</span>
                  </button>
                  <div className="my-1 border-t border-zinc-800" />
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onDelete(snippet.id);
                    }}
                    className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    <span>Удалить</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Code Preview Box */}
        {previewLines && (
          <div className="my-3 rounded-xl border border-zinc-800/80 bg-zinc-950/80 p-3 font-mono text-[11px] text-zinc-300 overflow-hidden relative">
            <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-2 border-b border-zinc-800/60 pb-1">
              <span className="flex items-center gap-1 font-semibold text-zinc-400">
                <FileCode className="w-3 h-3" />
                {primaryFile?.filename || "code"}
              </span>
              <span>{primaryFile?.language}</span>
            </div>
            <pre className="overflow-hidden text-zinc-300/90 whitespace-pre font-mono leading-relaxed max-h-20 opacity-85">
              {previewLines}
            </pre>
            <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-zinc-950 to-transparent pointer-events-none" />
          </div>
        )}
      </div>

      {/* Footer Details */}
      <div className="mt-2 pt-3 border-t border-zinc-800/60 flex flex-col gap-2.5">
        {/* Tags */}
        {tagList.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tagList.slice(0, 3).map((tag) => (
              <span
                key={tag}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectTag?.(tag);
                }}
                className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-800/70 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                #{tag}
              </span>
            ))}
            {tagList.length > 3 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-md text-zinc-400">
                +{tagList.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Bottom Bar: Files, Languages, Copy */}
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 font-medium text-zinc-400">
              <Code2 className="w-3.5 h-3.5" />
              {fileCount} {fileCount === 1 ? "файл" : fileCount < 5 ? "файла" : "файлов"}
            </span>

            {/* Language Badges */}
            <div className="flex items-center gap-1">
              {snippet.files.slice(0, 2).map((f, i) => {
                const meta = getLanguageMeta(f.language);
                return (
                  <span
                    key={i}
                    className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-medium"
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: meta.color }}
                    />
                    {meta.name}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleCopyCode}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
              title="Копировать первый файл"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
