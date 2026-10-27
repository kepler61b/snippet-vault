"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  AlertTriangle,
  ArrowRightLeft,
  Calendar,
  Check,
  CheckCircle,
  Clock,
  Eye,
  FileCode,
  Folder,
  Globe,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  Search,
  Tag,
  Trash2,
  User,
  Users,
  X,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface SnippetItem {
  id: string;
  title: string;
  description: string | null;
  visibility: string;
  isFavorite: boolean;
  tags: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
  } | null;
  collection: {
    id: string;
    name: string;
  } | null;
  _count: {
    files: number;
  };
}

interface UserOption {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

interface AdminContentTabProps {
  users: UserOption[];
  showFeedback: (text: string, type?: "success" | "error") => void;
  onRefreshData?: () => void;
}

export function AdminContentTab({ users, showFeedback, onRefreshData }: AdminContentTabProps) {
  const { t, locale } = useI18n();

  const [snippets, setSnippets] = useState<SnippetItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAuthor, setSelectedAuthor] = useState("");

  // Transfer ownership modal state
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferFrom, setTransferFrom] = useState("");
  const [transferTo, setTransferTo] = useState("");
  const [transferSnippets, setTransferSnippets] = useState(true);
  const [transferCollections, setTransferCollections] = useState(true);
  const [transferring, setTransferring] = useState(false);

  // Delete snippet state
  const [deleteTargetSnippet, setDeleteTargetSnippet] = useState<SnippetItem | null>(null);
  const [deletingSnippet, setDeletingSnippet] = useState(false);

  const loadSnippets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set("query", searchQuery.trim());
      if (selectedAuthor) params.set("userId", selectedAuthor);
      params.set("limit", "100");

      const res = await fetch(`/api/admin/content/snippets?${params.toString()}`);
      const data = await res.json();

      if (res.ok && data.success) {
        setSnippets(data.snippets || []);
        setTotalCount(data.total || 0);
      } else {
        throw new Error(data.error || "Failed to load snippets");
      }
    } catch (err: any) {
      console.error("Load snippets error:", err);
      showFeedback(err.message || t("admin.loadError"), "error");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedAuthor, showFeedback, t]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadSnippets();
    }, 250);
    return () => clearTimeout(timer);
  }, [loadSnippets]);

  // Execute transfer ownership
  const handleExecuteTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferFrom || !transferTo) {
      showFeedback("Выберите обоих пользователей", "error");
      return;
    }
    if (transferFrom === transferTo) {
      showFeedback("Исходный и целевой пользователь не могут совпадать", "error");
      return;
    }

    const fromUser = users.find((u) => u.id === transferFrom);
    const toUser = users.find((u) => u.id === transferTo);

    const confirmMsg = t("admin.transferConfirm", {
      from: fromUser?.email || "User",
      to: toUser?.email || "User",
    });

    if (!confirm(confirmMsg)) return;

    setTransferring(true);
    try {
      const res = await fetch("/api/admin/content/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromUserId: transferFrom,
          toUserId: transferTo,
          transferSnippets,
          transferCollections,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to transfer content");
      }

      showFeedback(
        t("admin.transferSuccess", {
          snippets: data.transferredSnippets,
          collections: data.transferredCollections,
        })
      );

      setShowTransferModal(false);
      setTransferFrom("");
      setTransferTo("");
      loadSnippets();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      showFeedback(err.message || "Transfer error", "error");
    } finally {
      setTransferring(false);
    }
  };

  // Delete snippet
  const handleDeleteSnippet = async () => {
    if (!deleteTargetSnippet) return;
    setDeletingSnippet(true);
    try {
      const res = await fetch(`/api/admin/content/snippets/${deleteTargetSnippet.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to delete snippet");
      }

      showFeedback(t("admin.snippetDeletedSuccess", { title: deleteTargetSnippet.title }));
      setDeleteTargetSnippet(null);
      loadSnippets();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      showFeedback(err.message || "Delete error", "error");
    } finally {
      setDeletingSnippet(false);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Header bar */}
      <div className="p-4 sm:p-5 rounded-2xl border border-zinc-800 bg-zinc-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileCode className="w-4 h-4 text-sky-400" />
              <span>{t("admin.contentTitle")}</span>
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700/50">
              {totalCount} {t("admin.totalSnippets")?.toLowerCase() || "сниппетов"}
            </span>
          </div>
          <p className="text-xs text-zinc-400">{t("admin.contentSubtitle")}</p>
        </div>

        <button
          type="button"
          onClick={() => setShowTransferModal(true)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white shadow-lg shadow-violet-600/20 transition-all cursor-pointer self-start sm:self-auto shrink-0"
        >
          <ArrowRightLeft className="w-3.5 h-3.5" />
          <span>{t("admin.transferOwnershipBtn")}</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("admin.contentSearchPlaceholder")}
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-zinc-900/70 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 transition-colors"
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

        {/* Author filter */}
        <select
          value={selectedAuthor}
          onChange={(e) => setSelectedAuthor(e.target.value)}
          aria-label={t("admin.allAuthors")}
          className="px-3 py-2 rounded-xl bg-zinc-900/70 border border-zinc-800 text-xs text-zinc-300 focus:outline-none focus:border-violet-500 cursor-pointer"
        >
          <option value="">{t("admin.allAuthors")}</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.email} {u.name ? `(${u.name})` : ""}
            </option>
          ))}
        </select>
      </div>

      {/* Snippets list */}
      <div className="space-y-2">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-14 text-zinc-400 space-y-2">
            <Loader2 className="w-6 h-6 animate-spin text-sky-400" />
            <span className="text-xs">{t("common.loading") || "Загрузка..."}</span>
          </div>
        ) : snippets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-zinc-500 space-y-2 border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/20">
            <FileCode className="w-8 h-8 text-zinc-600" />
            <p className="text-xs font-medium">{t("admin.noSnippetsFound")}</p>
          </div>
        ) : (
          snippets.map((snip) => {
            const dateStr = new Date(snip.createdAt).toLocaleDateString(
              locale === "ru" ? "ru-RU" : "en-US",
              { day: "2-digit", month: "short", year: "numeric" }
            );

            return (
              <div
                key={snip.id}
                className="p-3.5 rounded-xl border border-zinc-850 bg-zinc-900/50 hover:bg-zinc-900/80 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-white truncate max-w-[280px] sm:max-w-[400px]">
                      {snip.title}
                    </span>

                    {/* Visibility badge */}
                    <span
                      className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${
                        snip.visibility === "PUBLIC"
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                          : snip.visibility === "UNLISTED"
                          ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                          : "bg-zinc-800 border-zinc-700 text-zinc-400"
                      }`}
                    >
                      {snip.visibility}
                    </span>

                    <span className="text-[11px] text-zinc-500 font-mono">
                      {snip._count?.files || 1} {t("snippets.files") || "файлов"}
                    </span>
                  </div>

                  {snip.description && (
                    <p className="text-[11px] text-zinc-400 line-clamp-1">{snip.description}</p>
                  )}

                  {/* Metadata line: Author, Collection, Tags, Date */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-500 font-mono pt-0.5">
                    {snip.user && (
                      <div className="flex items-center gap-1 text-zinc-400">
                        <User className="w-3 h-3 text-zinc-500" />
                        <span className="text-zinc-300 font-sans">{snip.user.email}</span>
                      </div>
                    )}

                    {snip.collection && (
                      <div className="flex items-center gap-1 text-sky-400">
                        <Folder className="w-3 h-3" />
                        <span>{snip.collection.name}</span>
                      </div>
                    )}

                    {snip.tags && (
                      <div className="flex items-center gap-1 text-zinc-400">
                        <Tag className="w-3 h-3 text-zinc-500" />
                        <span className="truncate max-w-[200px]">{snip.tags}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-1 text-zinc-500">
                      <Clock className="w-3 h-3" />
                      <span>{dateStr}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => setDeleteTargetSnippet(snip)}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-950/30 transition-all cursor-pointer"
                    title={t("admin.deleteSnippetBtn")}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL: TRANSFER CONTENT OWNERSHIP */}
      {showTransferModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-modal-backdrop">
          <div className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-violet-600/20 text-violet-400 border border-violet-500/30">
                  <ArrowRightLeft className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-white">{t("admin.transferModalTitle")}</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowTransferModal(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecuteTransfer} className="space-y-4">
              {/* From User */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-300">
                  {t("admin.transferFromLabel")}
                </label>
                <select
                  required
                  value={transferFrom}
                  onChange={(e) => setTransferFrom(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-violet-500"
                >
                  <option value="">-- Выберите пользователя --</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.email} {u.name ? `(${u.name})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* To User */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-300">
                  {t("admin.transferToLabel")}
                </label>
                <select
                  required
                  value={transferTo}
                  onChange={(e) => setTransferTo(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-violet-500"
                >
                  <option value="">-- Выберите нового владельца --</option>
                  {users
                    .filter((u) => u.id !== transferFrom)
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.email} {u.name ? `(${u.name})` : ""}
                      </option>
                    ))}
                </select>
              </div>

              {/* Checkboxes */}
              <div className="space-y-2 pt-1 border-t border-zinc-900">
                <label className="flex items-center gap-2.5 text-xs text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={transferSnippets}
                    onChange={(e) => setTransferSnippets(e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-violet-600 focus:ring-0"
                  />
                  <span>{t("admin.transferSnippetsCheck")}</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={transferCollections}
                    onChange={(e) => setTransferCollections(e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-violet-600 focus:ring-0"
                  />
                  <span>{t("admin.transferCollectionsCheck")}</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={transferring || !transferFrom || !transferTo}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 disabled:opacity-50 transition-all shadow-md shadow-violet-600/20 cursor-pointer"
                >
                  {transferring && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{t("admin.transferSubmitBtn")}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DELETE SNIPPET CONFIRM */}
      {deleteTargetSnippet && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-modal-backdrop">
          <div className="relative w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">{t("admin.deleteSnippetBtn")}</h3>
                <p className="text-xs text-zinc-400 truncate max-w-[240px]">
                  {deleteTargetSnippet.title}
                </p>
              </div>
            </div>

            <p className="text-xs text-zinc-400">
              {t("admin.deleteSnippetConfirm", { title: deleteTargetSnippet.title })}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setDeleteTargetSnippet(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white"
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                onClick={handleDeleteSnippet}
                disabled={deletingSnippet}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-50 transition-all cursor-pointer"
              >
                {deletingSnippet && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{t("common.delete")}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
