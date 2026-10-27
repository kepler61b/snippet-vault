"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Code,
  FileCode,
  Folder,
  Loader2,
  Plus,
  Sparkles,
  Star,
  Trash2,
  Wand2,
  X,
  Play,
  Eye,
  Edit2,
} from "lucide-react";
import { SnippetItem, SnippetFileItem, CollectionItem } from "@/types/snippet";
import {
  detectLanguageFromFilename,
  detectLanguageFromCode,
  getDefaultExtensionForLanguage,
  replaceFileExtension,
  getLanguageMeta,
  SUPPORTED_LANGUAGES,
} from "@/lib/languages";
import { CollectionIcon } from "@/lib/collection-icons";
import { CustomSelect, CustomSelectOption } from "@/components/ui/CustomSelect";
import { useI18n } from "@/lib/i18n";
import { CodeEditor } from "@/components/CodeEditor";
import { MarkdownPreview } from "@/components/MarkdownPreview";
import { CodePlaygroundModal } from "@/components/CodePlaygroundModal";
import { AICodeAssistantBlock } from "@/components/AICodeAssistantBlock";

interface SnippetEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  snippet?: SnippetItem | null;
  collections?: CollectionItem[];
  defaultCollectionId?: string | null;
  onSave: (data: any) => Promise<void>;
  onTriggerAI: (
    action: "meta" | "explain" | "refactor" | "document",
    files: SnippetFileItem[],
    activeFile: SnippetFileItem
  ) => Promise<any>;
  onCollectionCreated?: (collection: CollectionItem) => void;
  onOpenCreateCollectionModal?: () => void;
}

export function SnippetEditorModal({
  isOpen,
  onClose,
  snippet,
  collections = [],
  defaultCollectionId = null,
  onSave,
  onTriggerAI,
  onCollectionCreated,
  onOpenCreateCollectionModal,
}: SnippetEditorModalProps) {
  const { t, tFilesCount, locale } = useI18n();
  const isEditing = Boolean(snippet);

  const [localCollections, setLocalCollections] = useState<CollectionItem[]>(collections);
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [isCreatingCollectionLoading, setIsCreatingCollectionLoading] = useState(false);
  const [collectionError, setCollectionError] = useState<string | null>(null);
  const [descTab, setDescTab] = useState<"edit" | "preview">("edit");
  const [isPlaygroundOpen, setIsPlaygroundOpen] = useState(false);
  const newColInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalCollections(collections);
  }, [collections]);

  useEffect(() => {
    if (isCreatingCollection) {
      setTimeout(() => {
        newColInputRef.current?.focus();
      }, 50);
    } else {
      setNewCollectionName("");
      setCollectionError(null);
    }
  }, [isCreatingCollection]);

  const handleQuickCreateCollection = async (closeSelect?: () => void) => {
    const trimmed = newCollectionName.trim();
    if (!trimmed) {
      setCollectionError(t("editor.quickCreateErrorEmpty"));
      return;
    }

    setIsCreatingCollectionLoading(true);
    setCollectionError(null);

    try {
      const res = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmed,
          color: "#8b5cf6",
          iconType: "lucide",
          iconValue: "Folder",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || t("editor.quickCreateErrorFail"));
      }

      const created: CollectionItem = data.collection;
      setLocalCollections((prev) => [...prev, created]);
      setCollectionId(created.id);
      setIsCreatingCollection(false);
      setNewCollectionName("");
      onCollectionCreated?.(created);
      closeSelect?.();
    } catch (err: any) {
      setCollectionError(err.message || t("editor.quickCreateErrorFail"));
    } finally {
      setIsCreatingCollectionLoading(false);
    }
  };

  const [title, setTitle] = useState(snippet?.title || "");
  const [description, setDescription] = useState(snippet?.description || "");
  const [collectionId, setCollectionId] = useState(
    snippet?.collectionId || defaultCollectionId || ""
  );
  const [isFavorite, setIsFavorite] = useState(snippet?.isFavorite || false);
  const [tags, setTags] = useState(snippet?.tags || "");
  const [tagInput, setTagInput] = useState("");

  const [files, setFiles] = useState<SnippetFileItem[]>(
    snippet?.files && snippet.files.length > 0
      ? snippet.files.map((f) => ({ ...f }))
      : [
          {
            filename: "main.ts",
            language: "typescript",
            content: t("editor.defaultCodeComment"),
          },
        ]
  );

  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [autoDetectedLang, setAutoDetectedLang] = useState<string | null>(null);
  const [manualLanguageMap, setManualLanguageMap] = useState<Record<number, boolean>>({});

  if (!isOpen) return null;

  const currentFile = files[activeFileIndex] || files[0];

  const handleAddFile = () => {
    const currentLang = currentFile?.language || "typescript";
    const ext = getDefaultExtensionForLanguage(currentLang);
    const newFileNumber = files.length + 1;
    const newFile: SnippetFileItem = {
      filename: `file${newFileNumber}.${ext}`,
      language: currentLang,
      content: "",
    };
    setFiles([...files, newFile]);
    setActiveFileIndex(files.length);
  };

  const handleRemoveFile = (index: number) => {
    if (files.length <= 1) return;
    const nextFiles = files.filter((_, i) => i !== index);
    setFiles(nextFiles);
    if (activeFileIndex >= nextFiles.length) {
      setActiveFileIndex(nextFiles.length - 1);
    }
  };

  const handleFilenameChange = (filename: string) => {
    const detected = detectLanguageFromFilename(filename);
    const updated = [...files];
    const prevLang = updated[activeFileIndex].language;
    const langChanged = detected !== "plaintext" && detected !== prevLang;

    updated[activeFileIndex] = {
      ...updated[activeFileIndex],
      filename,
      language: detected !== "plaintext" ? detected : prevLang,
    };
    setFiles(updated);

    if (langChanged) {
      setManualLanguageMap((prev) => ({ ...prev, [activeFileIndex]: true }));
      setAutoDetectedLang(detected);
      setTimeout(() => setAutoDetectedLang(null), 3500);
    }
  };

  const handleLanguageChange = (language: string) => {
    const updated = [...files];
    const currentName = updated[activeFileIndex].filename;
    const newFilename = replaceFileExtension(currentName, language);

    updated[activeFileIndex] = {
      ...updated[activeFileIndex],
      language,
      filename: newFilename,
    };
    setFiles(updated);
    setManualLanguageMap((prev) => ({ ...prev, [activeFileIndex]: true }));
    setAutoDetectedLang(null);
  };

  const handleCodeChange = (content: string) => {
    const updated = [...files];
    const file = updated[activeFileIndex];
    let nextLang = file.language;
    let nextFilename = file.filename;

    // Detect language from code if not manually chosen by user
    if (!manualLanguageMap[activeFileIndex]) {
      const detected = detectLanguageFromCode(content);
      if (detected && detected !== file.language) {
        nextLang = detected;
        nextFilename = replaceFileExtension(file.filename, detected);
        setAutoDetectedLang(detected);
        setTimeout(() => setAutoDetectedLang(null), 3500);
      }
    }

    updated[activeFileIndex] = {
      ...file,
      content,
      language: nextLang,
      filename: nextFilename,
    };
    setFiles(updated);
  };

  const handleAutoDetectLanguage = () => {
    const detected = detectLanguageFromCode(currentFile.content);
    if (detected) {
      const newFilename = replaceFileExtension(currentFile.filename, detected);
      const updated = [...files];
      updated[activeFileIndex] = {
        ...updated[activeFileIndex],
        language: detected,
        filename: newFilename,
      };
      setFiles(updated);
      setAutoDetectedLang(detected);
      setTimeout(() => setAutoDetectedLang(null), 3500);
    }
  };

  const handleAddTag = () => {
    const trimmed = tagInput.trim().replace(/^#/, "");
    if (!trimmed) return;
    const existingTags = tags
      ? tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean)
      : [];
    if (!existingTags.includes(trimmed.toLowerCase())) {
      existingTags.push(trimmed.toLowerCase());
      setTags(existingTags.join(", "));
    }
    setTagInput("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const existingTags = tags
      ? tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean)
      : [];
    const nextTags = existingTags.filter((t) => t !== tagToRemove);
    setTags(nextTags.join(", "));
  };

  // AI Autofill
  const handleAiAutoFill = async () => {
    if (!currentFile.content.trim()) {
      alert(t("editor.aiAutofillEmptyAlert"));
      return;
    }
    try {
      setAiLoading("autofill");
      const meta = await onTriggerAI("meta", files, currentFile);
      if (meta) {
        if (meta.title && !title) setTitle(meta.title);
        if (meta.description) setDescription(meta.description);
        if (meta.tags && meta.tags.length > 0) {
          const currentTagList = tags
            ? tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean)
            : [];
          const merged = Array.from(new Set([...currentTagList, ...meta.tags]));
          setTags(merged.join(", "));
        }
      }
    } catch (err: any) {
      if (err?.code !== "AI_KEY_REQUIRED" && !err?.message?.includes("AI_KEY_REQUIRED") && !err?.message?.includes("AI API ключ не настроен")) {
        alert(err.message || t("editor.aiAutofillError"));
      }
    } finally {
      setAiLoading(null);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim()) {
      alert(t("editor.validationTitle"));
      return;
    }
    if (files.some((f) => !f.content.trim())) {
      const confirmSave = confirm(t("editor.validationEmptyFile"));
      if (!confirmSave) return;
    }

    try {
      setSaving(true);
      await onSave({
        title: title.trim(),
        description: description.trim() || null,
        isFavorite,
        tags,
        collectionId: collectionId || null,
        files,
      });
      onClose();
    } catch (err: any) {
      alert(err.message || t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  const collectionOptions: CustomSelectOption[] = useMemo(() => {
    const colMap = new Map<string, CollectionItem>();
    localCollections.forEach((c) => colMap.set(c.id, c));

    const getPath = (c: CollectionItem): string => {
      const parts = [c.name];
      let curr = c;
      const seen = new Set<string>([curr.id]);
      while (curr.parentId && colMap.has(curr.parentId) && !seen.has(curr.parentId)) {
        curr = colMap.get(curr.parentId)!;
        seen.add(curr.id);
        parts.unshift(curr.name);
      }
      return parts.join(" / ");
    };

    // Filter out smart collections (only standard folders can hold snippets directly)
    const standardCols = localCollections.filter((c) => !c.isSmart);
    const sorted = [...standardCols].sort((a, b) => getPath(a).localeCompare(getPath(b)));

    return [
      {
        value: "",
        label: t("editor.noCollection"),
        icon: <Folder className="w-4 h-4 text-zinc-500" />,
      },
      ...sorted.map((col) => ({
        value: col.id,
        label: getPath(col),
        icon: (
          <CollectionIcon
            iconType={col.iconType}
            iconValue={col.iconValue}
            color={col.color}
            className="w-4 h-4"
          />
        ),
        badge: col._count?.snippets ? `${col._count.snippets}` : undefined,
        description: col.description || undefined,
      })),
    ];
  }, [localCollections, t]);


  const languageOptions: CustomSelectOption[] = SUPPORTED_LANGUAGES.map((lang) => ({
    value: lang.id,
    label: lang.name,
    icon: (
      <span
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: lang.color }}
      />
    ),
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 lg:p-6 bg-black/80 backdrop-blur-sm animate-modal-backdrop">
      <div className="relative w-full max-w-5xl h-[100dvh] sm:h-[92vh] max-h-[100dvh] flex flex-col rounded-none sm:rounded-2xl border-0 sm:border border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden animate-modal-content safe-top">
        {/* Header */}
        <div className="flex items-center justify-between px-3.5 sm:px-6 py-2.5 sm:py-4 border-b border-zinc-800 bg-zinc-900/70">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-600/20 text-violet-400 border border-violet-500/30 shrink-0">
              <FileCode className="w-4 h-4" />
            </div>
            <div className="truncate">
              <h2 className="text-sm sm:text-base font-semibold text-white truncate">
                {isEditing ? t("editor.editTitle") : t("editor.newTitle")}
              </h2>
              <p className="text-[11px] sm:text-xs text-zinc-400 truncate hidden sm:block">
                {t("editor.descPlaceholder")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsFavorite(!isFavorite)}
              className={`p-2 rounded-xl transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center ${
                isFavorite
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800"
              }`}
              title={isFavorite ? t("snippets.removeFromFavorites") : t("snippets.addToFavorites")}
              aria-label={t("sidebar.favorites")}
            >
              <Star className={`w-4 h-4 ${isFavorite ? "fill-amber-400" : ""}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
              aria-label={t("common.close")}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-3.5 sm:space-y-5">
          {/* Metadata Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-[11px] sm:text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                {t("editor.titleLabel")} <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder={t("editor.titlePlaceholder")}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2 sm:py-2.5 rounded-xl border border-zinc-800 bg-zinc-900/60 focus:bg-zinc-900 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-all"
                />
              </div>
            </div>

            {/* Collection Selector */}
            <div className="space-y-1.5 md:col-span-1">
              <label className="text-[11px] sm:text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                {t("editor.collectionLabel")}
              </label>
              <CustomSelect
                value={collectionId}
                onChange={setCollectionId}
                options={collectionOptions}
                placeholder={t("editor.noCollection")}
                searchable={localCollections.length > 5}
                searchPlaceholder={t("editor.searchCollection")}
                footer={({ close }) => (
                  <div className="p-1" onClick={(e) => e.stopPropagation()}>
                    {!isCreatingCollection ? (
                      <button
                        type="button"
                        onClick={() => setIsCreatingCollection(true)}
                        className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-violet-600/10 hover:bg-violet-600/20 text-violet-400 hover:text-violet-300 border border-violet-500/20 hover:border-violet-500/30 text-xs font-medium transition-all group"
                      >
                        <Plus className="w-3.5 h-3.5 transition-transform group-hover:scale-110" />
                        <span>{t("editor.quickCreateCollection")}</span>
                      </button>
                    ) : (
                      <div className="space-y-2 p-2 rounded-xl bg-zinc-950/90 border border-zinc-800">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[11px] font-semibold text-zinc-300 flex items-center gap-1.5">
                            <Folder className="w-3.5 h-3.5 text-violet-400" />
                            {t("editor.quickCreateCollection")}
                          </span>
                          {onOpenCreateCollectionModal && (
                            <button
                              type="button"
                              onClick={() => {
                                close();
                                setIsCreatingCollection(false);
                                onOpenCreateCollectionModal();
                              }}
                              className="text-[10px] text-zinc-400 hover:text-violet-400 transition-colors"
                              title={t("editor.quickCreateMoreTooltip")}
                            >
                              {t("editor.quickCreateMore")}
                            </button>
                          )}
                        </div>

                        <div className="space-y-1">
                          <input
                            ref={newColInputRef}
                            type="text"
                            placeholder={t("editor.quickCreatePlaceholder")}
                            value={newCollectionName}
                            onChange={(e) => {
                              setNewCollectionName(e.target.value);
                              if (collectionError) setCollectionError(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleQuickCreateCollection(close);
                              } else if (e.key === "Escape") {
                                e.preventDefault();
                                setIsCreatingCollection(false);
                              }
                            }}
                            className="w-full px-2.5 py-1.5 text-xs bg-zinc-900 border border-zinc-700/80 rounded-lg text-zinc-100 placeholder-zinc-500 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                            disabled={isCreatingCollectionLoading}
                          />
                          {collectionError && (
                            <p className="text-[10px] text-rose-400">{collectionError}</p>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center justify-end gap-1.5 pt-1.5 border-t border-zinc-800/80">
                          <button
                            type="button"
                            onClick={() => {
                              setIsCreatingCollection(false);
                              setNewCollectionName("");
                              setCollectionError(null);
                            }}
                            disabled={isCreatingCollectionLoading}
                            className="px-2.5 py-1 text-xs rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                          >
                            {t("common.cancel")}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickCreateCollection(close)}
                            disabled={isCreatingCollectionLoading || !newCollectionName.trim()}
                            className="px-3 py-1 text-xs rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5 shadow-sm"
                          >
                            {isCreatingCollectionLoading ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Plus className="w-3.5 h-3.5" />
                            )}
                            <span>{t("common.create")}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              />
            </div>
          </div>

          {/* Description & AI Autofill Button */}
          <div className="space-y-1.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div className="flex items-center gap-2">
                <label className="text-[11px] sm:text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  {t("editor.notesLabel")}
                </label>
                {/* Markdown Mode Toggle */}
                <div className="flex items-center p-0.5 rounded-lg bg-zinc-900 border border-zinc-800 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setDescTab("edit")}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-medium transition-colors ${
                      descTab === "edit"
                        ? "bg-zinc-800 text-white"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>{t("editor.editMarkdown")}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDescTab("preview")}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-medium transition-colors ${
                      descTab === "preview"
                        ? "bg-zinc-800 text-white"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <Eye className="w-3 h-3" />
                    <span>{t("editor.previewMarkdown")}</span>
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={handleAiAutoFill}
                disabled={Boolean(aiLoading)}
                className="flex items-center gap-1.5 text-xs font-medium text-violet-400 hover:text-violet-300 disabled:opacity-50 transition-colors self-start sm:self-auto"
              >
                {aiLoading === "autofill" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Wand2 className="w-3.5 h-3.5" />
                )}
                <span className="sm:hidden">{t("editor.aiAutofillShort")}</span>
                <span className="hidden sm:inline">{t("editor.aiAutofill")}</span>
              </button>
            </div>
            {descTab === "preview" ? (
              <div className="w-full min-h-[64px] max-h-[160px] overflow-y-auto px-3.5 py-2 rounded-xl border border-zinc-800 bg-zinc-900/60 text-xs text-zinc-300">
                {description.trim() ? (
                  <MarkdownPreview content={description} />
                ) : (
                  <span className="text-zinc-600 italic">
                    {locale === "ru" ? "Заметки пусты (поддерживается Markdown)" : "Notes are empty (Markdown supported)"}
                  </span>
                )}
              </div>
            ) : (
              <textarea
                rows={2}
                placeholder={t("editor.notesPlaceholder")}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-800 bg-zinc-900/60 focus:bg-zinc-900 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-all resize-none"
              />
            )}
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <label className="text-[11px] sm:text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              {t("editor.tagsLabel")}
            </label>
            <div className="flex flex-wrap items-center gap-2 p-2 rounded-xl border border-zinc-800 bg-zinc-900/60">
              {tags &&
                tags
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean)
                  .map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-zinc-800 text-zinc-200 border border-zinc-700/60"
                    >
                      <span>#{t}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(t)}
                        className="hover:text-rose-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
              <input
                type="text"
                placeholder={t("editor.addTagPlaceholder")}
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                className="flex-1 min-w-[120px] bg-transparent text-xs text-zinc-100 placeholder-zinc-500 outline-none px-2 py-1"
              />
            </div>
          </div>

          {/* File Tabs & Editor Container */}
          <div className="border border-zinc-800 rounded-xl sm:rounded-2xl overflow-hidden bg-zinc-950">
            {/* File Tabs & AI Actions Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 bg-zinc-900/80 px-2 py-1 gap-1">
              {/* File tabs scrollable */}
              <div className="flex items-center gap-1 overflow-x-auto py-1 max-w-full scrollbar-none">
                {files.map((file, idx) => (
                  <div
                    key={idx}
                    onClick={() => setActiveFileIndex(idx)}
                    className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all flex-shrink-0 ${
                      activeFileIndex === idx
                        ? "bg-zinc-800 text-white shadow-sm border border-zinc-700/60"
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
                    }`}
                  >
                    <FileCode className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{file.filename || t("editor.fileTabDefault", { index: idx + 1 })}</span>
                    {files.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFile(idx);
                        }}
                        className="p-0.5 text-zinc-500 hover:text-rose-400 rounded transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={handleAddFile}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors flex-shrink-0"
                  title={t("editor.addFileTooltip")}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t("editor.addFileBtn")}</span>
                </button>
              </div>

              {/* File Actions Bar */}
              <div className="flex items-center gap-1 overflow-x-auto py-1 border-t sm:border-t-0 border-zinc-800/60 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setIsPlaygroundOpen(true)}
                  disabled={!currentFile.content.trim()}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-teal-400 hover:bg-teal-500/10 disabled:opacity-40 transition-colors flex-shrink-0"
                  title={t("editor.runCodeTooltip")}
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>{t("editor.runCode")}</span>
                </button>
              </div>
            </div>

            {/* File Settings Row: Filename & Language */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 p-2.5 sm:p-3 bg-zinc-900/40 border-b border-zinc-800">
              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  placeholder={t("editor.fileNamePlaceholder")}
                  value={currentFile.filename}
                  onChange={(e) => handleFilenameChange(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 focus:bg-zinc-950 focus:border-zinc-700 text-xs font-mono text-zinc-200 outline-none transition-all"
                />
              </div>

              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                <div className="flex-1 sm:w-52">
                  <CustomSelect
                    value={currentFile.language}
                    onChange={handleLanguageChange}
                    options={languageOptions}
                    searchable
                    searchPlaceholder={t("editor.searchLanguage")}
                    triggerClassName="py-1.5 px-3 text-xs rounded-lg bg-zinc-900 border-zinc-800"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAutoDetectLanguage}
                  className="p-2 sm:p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-violet-300 transition-colors shrink-0"
                  title={t("editor.detectLanguageTooltip")}
                >
                  <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                </button>
              </div>
            </div>

            {/* Auto-detection Notification Banner */}
            {autoDetectedLang && (
              <div className="px-3 py-1.5 bg-violet-950/40 border-b border-violet-800/40 text-[11px] text-violet-300 flex items-center justify-between animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Sparkles className="w-3.5 h-3.5 text-violet-400 animate-pulse shrink-0" />
                  <span className="truncate">
                    {t("editor.languageDetected")}{" "}
                    <strong className="text-white">{getLanguageMeta(autoDetectedLang).name}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setAutoDetectedLang(null)}
                  className="text-violet-400 hover:text-white p-0.5 rounded transition-colors shrink-0 ml-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Advanced Code Editor (CodeMirror 6) */}
            <CodeEditor
              value={currentFile.content}
              onChange={handleCodeChange}
              language={currentFile.language}
              placeholder={t("editor.codePlaceholder")}
              onSaveShortcut={handleSubmit}
              height="380px"
              minHeight="220px"
              maxHeight="48vh"
            />

            {/* AI Code Assistant Block */}
            <div className="mt-3">
              <AICodeAssistantBlock
                code={currentFile.content}
                language={currentFile.language}
                onApplyCode={(newCode) => {
                  handleCodeChange(newCode);
                }}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 sm:px-6 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:py-3.5 border-t border-zinc-800 bg-zinc-900/80 shrink-0">
          <span className="text-[11px] sm:text-xs text-zinc-500">
            {tFilesCount(files.length)}
          </span>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-3 sm:px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-md shadow-violet-600/30 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isEditing ? t("common.save") : t("editor.newTitle")}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Code Playground Modal */}
      <CodePlaygroundModal
        isOpen={isPlaygroundOpen}
        onClose={() => setIsPlaygroundOpen(false)}
        files={files}
        initialFileIndex={activeFileIndex}
      />
    </div>
  );
}
