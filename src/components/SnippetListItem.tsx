"use client";

import React, { useState } from "react";
import {
  Check,
  Copy,
  Download,
  Edit3,
  Star,
  Trash2,
} from "lucide-react";
import { SnippetItem } from "@/types/snippet";
import { getLanguageMeta } from "@/lib/languages";
import { CollectionIcon } from "@/lib/collection-icons";
import { useI18n } from "@/lib/i18n";

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
  const { t, locale, tFilesCount } = useI18n();
  const [copied, setCopied] = useState(false);

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

  const formattedDate = new Date(snippet.updatedAt || snippet.createdAt).toLocaleDateString(
    locale === "ru" ? "ru-RU" : "en-US",
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
      className="group relative flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 p-3 sm:px-4 sm:py-3 rounded-xl border border-zinc-800/80 bg-zinc-900/40 hover:bg-zinc-900/90 hover:border-zinc-700/80 transition-all cursor-pointer backdrop-blur-sm card-lift"
    >
      {/* Left: Star + Main info */}
      <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
        {/* Star Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(snippet.id);
          }}
          className="p-1.5 sm:p-2 rounded-lg text-zinc-500 hover:text-amber-400 hover:bg-zinc-800 transition-colors shrink-0 mt-0.5 sm:mt-0 min-w-[34px] min-h-[34px] flex items-center justify-center active:scale-90"
          title={snippet.isFavorite ? t("snippets.removeFromFavorites") : t("snippets.addToFavorites")}
          aria-label={t("sidebar.favorites")}
        >
          <Star
            className={`w-4 h-4 ${
              snippet.isFavorite ? "fill-amber-400 text-amber-400" : ""
            }`}
          />
        </button>

        {/* Content details */}
        <div className="min-w-0 flex-1 space-y-0.5 sm:space-y-1">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* Collection Badge */}
            {snippet.collection && (
              <span
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border shrink-0"
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
                  className="w-3 h-3 shrink-0"
                />
                <span className="truncate max-w-[100px]">{snippet.collection.name}</span>
              </span>
            )}

            {/* Title */}
            <h3 className="text-xs sm:text-sm font-semibold text-zinc-100 group-hover:text-white truncate transition-colors">
              {snippet.title}
            </h3>
          </div>

          {/* Description or FTS Code Match line */}
          {snippet.matches && snippet.matches.length > 0 ? (
            <div className="flex items-center gap-2 text-[11px] font-mono text-violet-300 bg-violet-950/40 px-2 py-0.5 rounded-lg border border-violet-500/30 max-w-xl truncate">
              <span className="text-[10px] text-violet-400 font-semibold shrink-0">
                {snippet.matches[0].filename}:{snippet.matches[0].lineNumber}
              </span>
              <span
                className="truncate text-zinc-200"
                dangerouslySetInnerHTML={{ __html: snippet.matches[0].highlightedLine }}
              />
            </div>
          ) : snippet.description ? (
            <p className="text-xs text-zinc-400 truncate max-w-xl">
              {snippet.description}
            </p>
          ) : null}
        </div>
      </div>

      {/* Right: Languages, Tags, Date, Actions */}
      <div className="flex items-center justify-between sm:justify-end gap-2.5 sm:gap-3 shrink-0 border-t sm:border-t-0 border-zinc-800/60 pt-2 sm:pt-0">
        {/* Languages badges */}
        <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
          {languages.slice(0, 3).map((lang) => {
            const meta = getLanguageMeta(lang);
            return (
              <span
                key={lang}
                className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 sm:px-2 py-0.5 rounded-md bg-zinc-800/90 text-zinc-300 border border-zinc-700/50 shrink-0"
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
              className="text-[10px] text-zinc-400 bg-zinc-800/60 px-1.5 py-0.5 rounded border border-zinc-700/40 shrink-0"
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
        <span className="text-[11px] text-zinc-400 whitespace-nowrap text-right shrink-0">
          {formattedDate}
        </span>

        {/* Quick Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {primaryFile && (
            <button
              type="button"
              onClick={handleCopyCode}
              className={`p-1.5 rounded-lg border transition-all min-w-[32px] min-h-[32px] flex items-center justify-center ${
                copied
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : "bg-zinc-800/60 hover:bg-zinc-800 border-zinc-700/50 text-zinc-400 hover:text-white"
              }`}
              title={copied ? t("common.copied") : t("snippets.copyCode")}
              aria-label={t("snippets.copyCode")}
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
            className="p-1.5 rounded-lg bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/50 text-zinc-400 hover:text-white transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"
            title={t("common.edit")}
            aria-label={t("common.edit")}
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
            className="p-1.5 rounded-lg bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/50 text-zinc-400 hover:text-white transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"
            title={`${t("common.export")} (.json)`}
            aria-label={t("common.export")}
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(t("snippets.deleteConfirm", { title: snippet.title }))) {
                onDelete(snippet.id);
              }
            }}
            className="p-1.5 rounded-lg bg-zinc-800/60 hover:bg-rose-500/20 border border-zinc-700/50 text-zinc-400 hover:text-rose-400 transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"
            title={t("common.delete")}
            aria-label={t("common.delete")}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
