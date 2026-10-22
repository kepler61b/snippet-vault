"use client";

import React, { useState, useEffect } from "react";
import {
  History,
  Clock,
  RotateCcw,
  Check,
  X,
  Loader2,
  FileCode,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { SnippetItem, SnippetFileItem } from "@/types/snippet";
import { DiffViewer } from "./DiffViewer";
import { useI18n } from "@/lib/i18n";

interface RevisionItem {
  id: string;
  snippetId: string;
  title: string;
  description: string | null;
  tags: string;
  createdAt: string;
  files: SnippetFileItem[];
  filesCount: number;
}

interface SnippetRevisionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  snippet: SnippetItem | null;
  onSnippetRestored: (updatedSnippet: SnippetItem) => void;
}

export function SnippetRevisionsModal({
  isOpen,
  onClose,
  snippet,
  onSnippetRestored,
}: SnippetRevisionsModalProps) {
  const { t, locale } = useI18n();
  const [revisions, setRevisions] = useState<RevisionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRevisionId, setSelectedRevisionId] = useState<string | null>(null);
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !snippet) return;

    const fetchRevisions = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/snippets/${snippet.id}/revisions`);
        const data = await res.json();
        if (data.success) {
          setRevisions(data.revisions);
          if (data.revisions.length > 0) {
            setSelectedRevisionId(data.revisions[0].id);
          }
        } else {
          setError(data.error || "Не удалось загрузить историю");
        }
      } catch (err: any) {
        setError(err.message || "Ошибка загрузки");
      } finally {
        setLoading(false);
      }
    };

    fetchRevisions();
  }, [isOpen, snippet?.id]);

  if (!isOpen || !snippet) return null;

  const selectedRevision = revisions.find((r) => r.id === selectedRevisionId);
  const oldFiles = selectedRevision?.files || [];
  const currentFiles = snippet.files || [];

  const currentOldFile = oldFiles[activeFileIndex] || oldFiles[0];
  // Match corresponding current file by filename or same index
  const currentNewFile =
    currentFiles.find((f) => f.filename === currentOldFile?.filename) ||
    currentFiles[activeFileIndex] ||
    currentFiles[0];

  const handleRestore = async () => {
    if (!selectedRevision) return;
    const confirmMsg =
      locale === "ru"
        ? "Восстановить эту версию? Текущее состояние сниппета будет сохранено как новая ревизия."
        : "Restore this revision? The current state will be saved as a new revision.";

    if (!confirm(confirmMsg)) return;

    try {
      setRestoring(true);
      const res = await fetch(`/api/snippets/${snippet.id}/revisions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revisionId: selectedRevision.id }),
      });
      const data = await res.json();
      if (data.success) {
        onSnippetRestored(data.snippet);
        onClose();
      } else {
        alert(data.error || "Ошибка восстановления");
      }
    } catch (e: any) {
      alert(e.message || "Ошибка восстановления");
    } finally {
      setRestoring(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "ru-RU", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex flex-col w-full max-w-5xl max-h-[92vh] sm:max-h-[85vh] bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-zinc-800 bg-zinc-900/80">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-violet-600/20 text-violet-400 border border-violet-500/30">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>{locale === "ru" ? "История версий" : "Version History"}</span>
                <span className="text-xs font-normal text-zinc-400 truncate max-w-[200px] sm:max-w-[300px]">
                  — {snippet.title}
                </span>
              </h2>
              <p className="text-[11px] text-zinc-400">
                {locale === "ru"
                  ? "Сравнение изменений и откат к предыдущим ревизиям"
                  : "Compare revisions and roll back to previous versions"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedRevision && (
              <button
                onClick={handleRestore}
                disabled={restoring}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 active:scale-95 transition-all shadow-md shadow-violet-600/20 disabled:opacity-50"
              >
                {restoring ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="w-3.5 h-3.5" />
                )}
                <span>{locale === "ru" ? "Восстановить" : "Restore"}</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-zinc-950">
          {/* Left Column: Revision list */}
          <div className="w-full md:w-72 lg:w-80 border-b md:border-b-0 md:border-r border-zinc-800 bg-zinc-900/40 flex flex-col shrink-0 max-h-[200px] md:max-h-none overflow-y-auto">
            <div className="px-3.5 py-2.5 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider border-b border-zinc-800/60 flex items-center justify-between">
              <span>{locale === "ru" ? "Сохраненные ревизии" : "Saved Revisions"}</span>
              <span className="text-zinc-500">{revisions.length}</span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center p-8 text-zinc-500 text-xs gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{locale === "ru" ? "Загрузка..." : "Loading..."}</span>
              </div>
            ) : error ? (
              <div className="p-4 text-xs text-rose-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            ) : revisions.length === 0 ? (
              <div className="p-6 text-center text-zinc-500 text-xs">
                <History className="w-6 h-6 mx-auto mb-2 opacity-40 text-zinc-400" />
                <p className="font-medium text-zinc-400">
                  {locale === "ru" ? "Нет сохраненных ревизий" : "No saved revisions"}
                </p>
                <p className="text-[11px] mt-1 text-zinc-500">
                  {locale === "ru"
                    ? "При каждом сохранении изменений снимки будут появляться здесь."
                    : "Revisions will automatically appear here every time you save changes."}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-800/40 overflow-y-auto">
                {revisions.map((rev, idx) => {
                  const isSelected = rev.id === selectedRevisionId;
                  return (
                    <button
                      key={rev.id}
                      onClick={() => {
                        setSelectedRevisionId(rev.id);
                        setActiveFileIndex(0);
                      }}
                      className={`w-full text-left p-3 transition-colors ${
                        isSelected
                          ? "bg-violet-600/15 border-l-2 border-violet-500 text-white"
                          : "hover:bg-zinc-800/40 text-zinc-300"
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-semibold text-zinc-200">
                          {idx === 0
                            ? locale === "ru"
                              ? "Предыдущая версия"
                              : "Previous version"
                            : `${locale === "ru" ? "Ревизия" : "Revision"} #${revisions.length - idx}`}
                        </span>
                        <span className="text-[10px] text-zinc-500">
                          {rev.filesCount} {locale === "ru" ? "файл(ов)" : "files"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-zinc-500">
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(rev.createdAt)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Diff Comparison View */}
          <div className="flex-1 flex flex-col overflow-hidden bg-zinc-950">
            {selectedRevision ? (
              <>
                {/* File Tabs of the selected revision */}
                <div className="flex items-center justify-between px-3.5 py-2 border-b border-zinc-800 bg-zinc-900/60 overflow-x-auto">
                  <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                    <span className="text-[11px] font-semibold text-zinc-400 mr-1 shrink-0">
                      {locale === "ru" ? "Файл:" : "File:"}
                    </span>
                    {oldFiles.map((file, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveFileIndex(idx)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all shrink-0 ${
                          activeFileIndex === idx
                            ? "bg-zinc-800 text-white border border-zinc-700"
                            : "text-zinc-400 hover:text-zinc-200"
                        }`}
                      >
                        <FileCode className="w-3.5 h-3.5 text-zinc-500" />
                        <span>{file.filename}</span>
                      </button>
                    ))}
                  </div>

                  <span className="text-[11px] text-zinc-500 shrink-0 hidden sm:inline">
                    {locale === "ru"
                      ? "Красный: удалено в ревизии, Зеленый: добавлено сейчас"
                      : "Red: in revision, Green: in current"}
                  </span>
                </div>

                {/* Diff Viewer Component */}
                <div className="flex-1 p-3 sm:p-4 overflow-y-auto">
                  <DiffViewer
                    oldContent={currentOldFile?.content || ""}
                    newContent={currentNewFile?.content || ""}
                    filename={currentOldFile?.filename || currentNewFile?.filename}
                  />
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-zinc-500 text-xs">
                {locale === "ru" ? "Выберите ревизию для просмотра" : "Select a revision to inspect"}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-4 py-2.5 border-t border-zinc-800 bg-zinc-900/70 text-xs">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            {t("common.close")}
          </button>
        </div>
      </div>
    </div>
  );
}
