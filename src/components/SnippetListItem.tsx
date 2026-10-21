"use client";

import React, { useState } from "react";
import {
  Check,
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

interface SnippetListItemProps {
  snippet: SnippetItem;
  onView: (snippet: SnippetItem) => void;
  onEdit: (snippet: SnippetItem) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onSelectTag?: (tag: string) => void;
}

export function SnippetListItem({
  snippet,
  onView,
  onEdit,
  onDelete,
  onToggleFavorite,
  onSelectTag,
}: SnippetListItemProps) {
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const primaryFile = snippet.files[0];
  const fileCount = snippet.files?.length || 0;
  const tagList = snippet.tags
    ? snippet.tags.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  // Extract unique languages in this snippet
  const languages = Array.from(
    new Set(snippet.files.map((f) => f.language).filter(Boolean))
  );

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

  const formattedDate = new Date(snippet.updatedAt || snippet.createdAt).toLocaleDateString(
    "ru-RU",
    {
      day: "numeric",
      month: "short",
      year:
        new Date(snippet.updatedAt || snippet.createdAt).getFullYear() !==
        new Date().getFullYear()
          ? "numeric"
          : undefined,
    }
  );

  return (
    <div
      onClick={() => onView(snippet)}
      className="group relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 rounded-xl border border-zinc-800/80 bg-zinc-900/40 hover:bg-zinc-900/90 hover:border-zinc-700/80 transition-all cursor-pointer backdrop-blur-sm card-lift"
    >
      {/* Left: Star + Main info */}
      <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
        {/* Star Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(snippet.id);
          }}
          className="p-1.5 rounded-lg text-zinc-500 hover:text-amber-400 hover:bg-zinc-800 transition-colors flex-shrink-0 mt-0.5 sm:mt-0"
          title={snippet.isFavorite ? "Убрать из избранного" : "Добавить в избранное"}
        >
          <Star
            className={`w-4 h-4 ${
              snippet.isFavorite ? "fill-amber-400 text-amber-400" : ""
            }`}
          />
        </button>

        {/* Content details */}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            {/* Collection Badge */}
            {snippet.collection && (
              <span
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border flex-shrink-0"
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
                <span className="truncate max-w-[110px]">{snippet.collection.name}</span>
              </span>
            )}

            {/* Title */}
            <h3 className="text-sm font-semibold text-zinc-100 group-hover:text-white truncate transition-colors">
              {snippet.title}
            </h3>
          </div>

          {/* Description (one line) */}
          {snippet.description && (
            <p className="text-xs text-zinc-400 truncate max-w-xl">
              {snippet.description}
            </p>
          )}
        </div>
      </div>

      {/* Right: Languages, Tags, Date, Actions */}
      <div className="flex items-center justify-between sm:justify-end gap-3 flex-shrink-0 border-t sm:border-t-0 border-zinc-800/60 pt-2 sm:pt-0">
        {/* Languages badges */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {languages.slice(0, 3).map((lang) => {
            const meta = getLanguageMeta(lang);
            return (
              <span
                key={lang}
                className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-zinc-800/90 text-zinc-300 border border-zinc-700/50"
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: meta.color }}
                />
                <span>{meta.name}</span>
              </span>
            );
          })}
          {fileCount > 1 && (
            <span
              className="text-[10px] text-zinc-400 bg-zinc-800/60 px-1.5 py-0.5 rounded border border-zinc-700/40"
              title={`${fileCount} файлов в сниппете`}
            >
              {fileCount} ф.
            </span>
          )}
        </div>

        {/* Tags (hidden on small screens if many) */}
        {tagList.length > 0 && (
          <div className="hidden md:flex items-center gap-1">
            {tagList.slice(0, 2).map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectTag?.(tag);
                }}
                className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800/50 text-zinc-400 hover:text-violet-300 hover:bg-violet-900/20 transition-colors"
              >
                #{tag}
              </button>
            ))}
            {tagList.length > 2 && (
              <span className="text-[10px] text-zinc-500">+{tagList.length - 2}</span>
            )}
          </div>
        )}

        {/* Date */}
        <span className="text-[11px] text-zinc-400 whitespace-nowrap min-w-[50px] text-right">
          {formattedDate}
        </span>

        {/* Quick Actions */}
        <div className="flex items-center gap-1">
          {primaryFile && (
            <button
              type="button"
              onClick={handleCopyCode}
              className={`p-1.5 rounded-lg border transition-all ${
                copied
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : "bg-zinc-800/60 hover:bg-zinc-800 border-zinc-700/50 text-zinc-400 hover:text-white"
              }`}
              title={copied ? "Скопировано!" : "Скопировать код первого файла"}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(snippet);
            }}
            className="p-1.5 rounded-lg bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/50 text-zinc-400 hover:text-white transition-colors"
            title="Редактировать сниппет"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const a = document.createElement("a");
              a.href = `/api/export?type=snippet&id=${snippet.id}`;
              a.download = `${snippet.title || "snippet"}.snippetvault.json`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
            }}
            className="p-1.5 rounded-lg bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/50 text-zinc-400 hover:text-white transition-colors"
            title="Экспортировать сниппет (.json)"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`Удалить сниппет "${snippet.title}"?`)) {
                onDelete(snippet.id);
              }
            }}
            className="p-1.5 rounded-lg bg-zinc-800/60 hover:bg-rose-500/20 border border-zinc-700/50 text-zinc-400 hover:text-rose-400 transition-colors"
            title="Удалить сниппет"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
