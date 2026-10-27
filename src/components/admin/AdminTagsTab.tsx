"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  AlertTriangle,
  ArrowRightLeft,
  Check,
  CheckCircle,
  Hash,
  Loader2,
  RefreshCw,
  Search,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface TagItem {
  name: string;
  count: number;
}

interface AdminTagsTabProps {
  showFeedback: (text: string, type?: "success" | "error") => void;
  onRefreshData?: () => void;
}

export function AdminTagsTab({ showFeedback, onRefreshData }: AdminTagsTabProps) {
  const { t } = useI18n();

  const [tags, setTags] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Merge modal state
  const [mergeSourceTag, setMergeSourceTag] = useState<string | null>(null);
  const [mergeTargetTag, setMergeTargetTag] = useState("");
  const [merging, setMerging] = useState(false);

  // Delete modal state
  const [deleteTargetTag, setDeleteTargetTag] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadTags = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/tags");
      const data = await res.json();
      if (res.ok && data.success) {
        setTags(data.tags || []);
      } else {
        throw new Error(data.error || "Failed to load tags");
      }
    } catch (err: any) {
      console.error("Load tags error:", err);
      showFeedback(err.message || t("admin.loadError"), "error");
    } finally {
      setLoading(false);
    }
  }, [showFeedback, t]);

  useEffect(() => {
    loadTags();
  }, [loadTags]);

  const filteredTags = tags.filter((tag) =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  // Execute merge
  const handleMergeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mergeSourceTag || !mergeTargetTag.trim()) return;

    if (mergeSourceTag.toLowerCase() === mergeTargetTag.trim().toLowerCase()) {
      showFeedback("Исходный и целевой тег не могут совпадать", "error");
      return;
    }

    setMerging(true);
    try {
      const res = await fetch("/api/admin/tags/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceTag: mergeSourceTag,
          targetTag: mergeTargetTag.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to merge tags");
      }

      showFeedback(t("admin.mergeSuccess", { count: data.updatedSnippets }));
      setMergeSourceTag(null);
      setMergeTargetTag("");
      loadTags();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      showFeedback(err.message || "Merge error", "error");
    } finally {
      setMerging(false);
    }
  };

  // Execute delete
  const handleDeleteSubmit = async () => {
    if (!deleteTargetTag) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/tags?tag=${encodeURIComponent(deleteTargetTag)}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to delete tag");
      }

      showFeedback(t("admin.tagDeletedSuccess", { tag: deleteTargetTag, count: data.updatedCount }));
      setDeleteTargetTag(null);
      loadTags();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      showFeedback(err.message || "Delete error", "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Header bar */}
      <div className="p-4 sm:p-5 rounded-2xl border border-zinc-800 bg-zinc-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Tag className="w-4 h-4 text-emerald-400" />
              <span>{t("admin.tagsTitle")}</span>
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700/50">
              {tags.length} {t("admin.tagsTab")?.toLowerCase() || "тегов"}
            </span>
          </div>
          <p className="text-xs text-zinc-400">{t("admin.tagsSubtitle")}</p>
        </div>

        <button
          type="button"
          onClick={loadTags}
          disabled={loading}
          className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors self-start sm:self-auto cursor-pointer"
          title={t("admin.refreshData")}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-emerald-400" : ""}`} />
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t("admin.tagsSearchPlaceholder")}
          className="w-full pl-9 pr-8 py-2 rounded-xl bg-zinc-900/70 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Tags Grid / List */}
      <div className="space-y-2">
        {loading && tags.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-zinc-400 space-y-2">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
            <span className="text-xs">{t("common.loading") || "Загрузка..."}</span>
          </div>
        ) : filteredTags.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-zinc-500 space-y-2 border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/20">
            <Tag className="w-8 h-8 text-zinc-600" />
            <p className="text-xs font-medium">{t("admin.noTagsFound")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {filteredTags.map((tag) => (
              <div
                key={tag.name}
                className="p-3 rounded-xl border border-zinc-850 bg-zinc-900/50 hover:bg-zinc-900/80 transition-all flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="p-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                    <Hash className="w-3 h-3" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white truncate">{tag.name}</div>
                    <div className="text-[10px] text-zinc-500 font-mono">
                      {t("admin.snippetsCountBadge", { count: tag.count })}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setMergeSourceTag(tag.name);
                      setMergeTargetTag("");
                    }}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                    title={t("admin.mergeTagBtn")}
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeleteTargetTag(tag.name)}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors cursor-pointer"
                    title={t("admin.deleteTagBtn")}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL: MERGE TAG */}
      {mergeSourceTag && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-modal-backdrop">
          <div className="relative w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
                  <ArrowRightLeft className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-white">{t("admin.mergeModalTitle")}</h3>
              </div>
              <button
                type="button"
                onClick={() => setMergeSourceTag(null)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleMergeSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-300">
                  {t("admin.sourceTagLabel")}
                </label>
                <input
                  type="text"
                  readOnly
                  value={mergeSourceTag}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-400 cursor-not-allowed"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-300">
                  {t("admin.targetTagLabel")}
                </label>
                <input
                  required
                  type="text"
                  autoFocus
                  list="existing-tags"
                  value={mergeTargetTag}
                  onChange={(e) => setMergeTargetTag(e.target.value)}
                  placeholder={t("admin.targetTagPlaceholder")}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
                <datalist id="existing-tags">
                  {tags
                    .filter((t) => t.name !== mergeSourceTag)
                    .map((t) => (
                      <option key={t.name} value={t.name} />
                    ))}
                </datalist>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setMergeSourceTag(null)}
                  className="px-3.5 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={merging || !mergeTargetTag.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 transition-all cursor-pointer shadow-md shadow-emerald-600/20"
                >
                  {merging && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{t("admin.submitMergeBtn")}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DELETE TAG CONFIRM */}
      {deleteTargetTag && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-modal-backdrop">
          <div className="relative w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">{t("admin.deleteTagBtn")}</h3>
                <p className="text-xs text-zinc-400 font-mono">#{deleteTargetTag}</p>
              </div>
            </div>

            <p className="text-xs text-zinc-400">
              {t("admin.deleteTagConfirm", { tag: deleteTargetTag })}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setDeleteTargetTag(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white"
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                onClick={handleDeleteSubmit}
                disabled={deleting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-50 transition-all cursor-pointer"
              >
                {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{t("common.delete")}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
