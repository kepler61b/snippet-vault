"use client";

import React, { useState } from "react";
import {
  Code,
  FileCode,
  Folder,
  Globe,
  Loader2,
  Lock,
  Plus,
  Share2,
  Sparkles,
  Star,
  Trash2,
  Wand2,
  X,
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
}

export function SnippetEditorModal({
  isOpen,
  onClose,
  snippet,
  collections = [],
  defaultCollectionId = null,
  onSave,
  onTriggerAI,
}: SnippetEditorModalProps) {
  const isEditing = Boolean(snippet);

  const [title, setTitle] = useState(snippet?.title || "");
  const [description, setDescription] = useState(snippet?.description || "");
  const [collectionId, setCollectionId] = useState(
    snippet?.collectionId || defaultCollectionId || ""
  );
  const [visibility, setVisibility] = useState<"PUBLIC" | "UNLISTED" | "PRIVATE">(
    snippet?.visibility || "PUBLIC"
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
            content: "// Напишите или вставьте ваш код сюда\n",
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

  // Indent with 2 spaces on Tab key press
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const val = target.value;

      const newVal = val.substring(0, start) + "  " + val.substring(end);
      handleCodeChange(newVal);

      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 2;
      }, 0);
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
      alert("Сначала вставьте хотя бы немного кода, чтобы AI мог его проанализировать!");
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
      alert(err.message || "Ошибка автозаполнения");
    } finally {
      setAiLoading(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert("Укажите название сниппета");
      return;
    }
    if (files.some((f) => !f.content.trim())) {
      const confirmSave = confirm("Один из файлов пустой. Всё равно сохранить?");
      if (!confirmSave) return;
    }

    try {
      setSaving(true);
      await onSave({
        title: title.trim(),
        description: description.trim() || null,
        visibility,
        isFavorite,
        tags,
        collectionId: collectionId || null,
        files,
      });
      onClose();
    } catch (err: any) {
      alert(err.message || "Ошибка сохранения сниппета");
    } finally {
      setSaving(false);
    }
  };

  const currentLines = (currentFile?.content || "").split("\n");

  const collectionOptions: CustomSelectOption[] = [
    {
      value: "",
      label: "Без коллекции",
      icon: <Folder className="w-4 h-4 text-zinc-500" />,
    },
    ...collections.map((col) => ({
      value: col.id,
      label: col.name,
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

  const visibilityOptions: CustomSelectOption[] = [
    {
      value: "PUBLIC",
      label: "Публичный (видно всем)",
      icon: <Globe className="w-4 h-4 text-emerald-400" />,
      description: "Виден всем пользователям",
    },
    {
      value: "UNLISTED",
      label: "По секретной ссылке",
      icon: <Share2 className="w-4 h-4 text-sky-400" />,
      description: "Доступ только по прямой ссылке",
    },
    {
      value: "PRIVATE",
      label: "Приватный (только для вас)",
      icon: <Lock className="w-4 h-4 text-zinc-400" />,
      description: "Виден только в вашем аккаунте",
    },
  ];

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-black/80 backdrop-blur-sm animate-modal-backdrop">
      <div className="relative w-full max-w-5xl h-[96vh] sm:h-[92vh] flex flex-col rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden animate-modal-content">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-zinc-800 bg-zinc-900/70">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-600/20 text-violet-400 border border-violet-500/30 flex-shrink-0">
              <FileCode className="w-4 h-4" />
            </div>
            <div className="truncate">
              <h2 className="text-sm sm:text-base font-semibold text-white truncate">
                {isEditing ? "Редактировать сниппет" : "Создать новый сниппет"}
              </h2>
              <p className="text-[11px] sm:text-xs text-zinc-400 truncate">
                Мульти-файлы, подсветка и встроенный AI-ассистент
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <button
              onClick={() => setIsFavorite(!isFavorite)}
              className={`p-2 rounded-xl transition-colors ${
                isFavorite
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800"
              }`}
              title={isFavorite ? "В избранном" : "Добавить в избранное"}
            >
              <Star className={`w-4 h-4 ${isFavorite ? "fill-amber-400" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5">
          {/* Metadata Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-[11px] sm:text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Название сниппета <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="Например: Fast Debounce Hook или Docker Compose для PostgreSQL"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2 sm:py-2.5 rounded-xl border border-zinc-800 bg-zinc-900/60 focus:bg-zinc-900 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-all"
                />
              </div>
            </div>

            {/* Collection Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] sm:text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Коллекция
              </label>
              <CustomSelect
                value={collectionId}
                onChange={setCollectionId}
                options={collectionOptions}
                placeholder="Без коллекции"
                searchable={collections.length > 5}
                searchPlaceholder="Поиск коллекции..."
              />
            </div>

            {/* Visibility Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] sm:text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Видимость / Доступ
              </label>
              <CustomSelect
                value={visibility}
                onChange={(val) => setVisibility(val as any)}
                options={visibilityOptions}
              />
            </div>
          </div>

          {/* Description & AI Autofill Button */}
          <div className="space-y-1.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <label className="text-[11px] sm:text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Описание / Заметки
              </label>
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
                <span>AI: Заполнить название и теги по коду</span>
              </button>
            </div>
            <textarea
              rows={2}
              placeholder="Дополнительные заметки, инструкции по установке или пример использования..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-zinc-800 bg-zinc-900/60 focus:bg-zinc-900 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-all resize-none"
            />
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <label className="text-[11px] sm:text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Теги
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
                placeholder="+ Добавить тег"
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
          <div className="border border-zinc-800 rounded-2xl overflow-hidden bg-zinc-950">
            {/* File Tabs & AI Actions Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 bg-zinc-900/80 px-2 py-1 gap-1">
              {/* File tabs scrollable */}
              <div className="flex items-center gap-1 overflow-x-auto py-1 max-w-full">
                {files.map((file, idx) => (
                  <div
                    key={idx}
                    onClick={() => setActiveFileIndex(idx)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all flex-shrink-0 ${
                      activeFileIndex === idx
                        ? "bg-zinc-800 text-white shadow-sm border border-zinc-700/60"
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
                    }`}
                  >
                    <FileCode className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{file.filename || `файл-${idx + 1}`}</span>
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
                  title="Добавить еще один файл в этот сниппет"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Файл</span>
                </button>
              </div>

              {/* AI Code Actions Bar */}
              <div className="flex items-center gap-1 overflow-x-auto py-1 border-t sm:border-t-0 border-zinc-800/60">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      setAiLoading("explain");
                      await onTriggerAI("explain", files, currentFile);
                    } catch (e: any) {
                      alert(e.message);
                    } finally {
                      setAiLoading(null);
                    }
                  }}
                  disabled={Boolean(aiLoading) || !currentFile.content.trim()}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-sky-400 hover:bg-sky-500/10 disabled:opacity-40 transition-colors flex-shrink-0"
                  title="Объяснить код файла"
                >
                  {aiLoading === "explain" ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  <span>Объяснить</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    try {
                      setAiLoading("refactor");
                      await onTriggerAI("refactor", files, currentFile);
                    } catch (e: any) {
                      alert(e.message);
                    } finally {
                      setAiLoading(null);
                    }
                  }}
                  disabled={Boolean(aiLoading) || !currentFile.content.trim()}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-40 transition-colors flex-shrink-0"
                  title="Оптимизировать код файла"
                >
                  {aiLoading === "refactor" ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Wand2 className="w-3.5 h-3.5" />
                  )}
                  <span>Рефакторинг</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    try {
                      setAiLoading("document");
                      await onTriggerAI("document", files, currentFile);
                    } catch (e: any) {
                      alert(e.message);
                    } finally {
                      setAiLoading(null);
                    }
                  }}
                  disabled={Boolean(aiLoading) || !currentFile.content.trim()}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-amber-400 hover:bg-amber-500/10 disabled:opacity-40 transition-colors flex-shrink-0"
                  title="Добавить комментарии и типы"
                >
                  {aiLoading === "document" ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Code className="w-3.5 h-3.5" />
                  )}
                  <span>Документация</span>
                </button>
              </div>
            </div>

            {/* File Settings Row: Filename & Language */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 p-3 bg-zinc-900/40 border-b border-zinc-800">
              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  placeholder="Имя файла (напр. app.py, utils.ts, Dockerfile)"
                  value={currentFile.filename}
                  onChange={(e) => handleFilenameChange(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 focus:bg-zinc-950 focus:border-zinc-700 text-xs font-mono text-zinc-200 outline-none transition-all"
                />
              </div>

              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                <div className="w-full sm:w-52">
                  <CustomSelect
                    value={currentFile.language}
                    onChange={handleLanguageChange}
                    options={languageOptions}
                    searchable
                    searchPlaceholder="Поиск языка..."
                    triggerClassName="py-1.5 px-3 text-xs rounded-lg bg-zinc-900 border-zinc-800"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAutoDetectLanguage}
                  className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-violet-300 transition-colors shrink-0"
                  title="Определить язык по коду"
                >
                  <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                </button>
              </div>
            </div>

            {/* Auto-detection Notification Banner */}
            {autoDetectedLang && (
              <div className="px-3.5 py-1.5 bg-violet-950/40 border-b border-violet-800/40 text-[11px] text-violet-300 flex items-center justify-between animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-violet-400 animate-pulse" />
                  <span>
                    Язык автоматически определен:{" "}
                    <strong className="text-white">{getLanguageMeta(autoDetectedLang).name}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setAutoDetectedLang(null)}
                  className="text-violet-400 hover:text-white p-0.5 rounded transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Editor Textarea with line numbers */}
            <div className="relative flex bg-zinc-950 font-mono text-xs sm:text-sm min-h-[280px] sm:min-h-[340px] max-h-[50vh] overflow-hidden">
              {/* Line numbers column */}
              <div
                className="select-none py-3 px-2.5 sm:px-3 text-right text-zinc-600 bg-zinc-950 border-r border-zinc-800/80 font-mono text-xs sm:text-sm leading-6 flex-shrink-0"
                aria-hidden="true"
              >
                {currentLines.map((_, i) => (
                  <div key={i}>{i + 1}</div>
                ))}
              </div>

              {/* Textarea */}
              <textarea
                value={currentFile.content}
                onChange={(e) => handleCodeChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Вставьте исходный код сюда..."
                spellCheck={false}
                className="flex-1 p-3 bg-transparent text-zinc-100 placeholder-zinc-600 outline-none resize-none font-mono text-xs sm:text-sm leading-6 overflow-y-auto whitespace-pre tab-size-2"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-t border-zinc-800 bg-zinc-900/60">
          <span className="text-[11px] sm:text-xs text-zinc-500">
            {files.length} {files.length === 1 ? "файл" : "файлов"}
          </span>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-3 sm:px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-md shadow-violet-600/30 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isEditing ? "Сохранить" : "Создать"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
