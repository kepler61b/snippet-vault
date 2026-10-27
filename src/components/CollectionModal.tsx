"use client";

import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import {
  Check,
  Folder,
  FolderGit2,
  FolderTree,
  ImageIcon,
  Loader2,
  Plus,
  Save,
  Sparkles,
  Tag,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { CollectionItem, SmartFilterRule } from "@/types/snippet";
import {
  CollectionIcon,
  PRESET_COLORS,
  STANDARD_ICONS,
} from "@/lib/collection-icons";
import { SUPPORTED_LANGUAGES } from "@/lib/languages";
import { CustomSelect, CustomSelectOption } from "./ui/CustomSelect";
import { useI18n } from "@/lib/i18n";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";

interface CollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  collection?: CollectionItem | null;
  allCollections?: CollectionItem[];
  initialParentId?: string | null;
  availableTags?: string[];
  onSave: (data: {
    name: string;
    description?: string | null;
    iconType: string;
    iconValue: string;
    color?: string | null;
    parentId?: string | null;
    isSmart?: boolean;
    filterRule?: string | null;
  }) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export function CollectionModal({
  isOpen,
  onClose,
  collection,
  allCollections = [],
  initialParentId = null,
  availableTags = [],
  onSave,
  onDelete,
}: CollectionModalProps) {
  const { t } = useI18n();
  const isEditing = Boolean(collection);

  // Prevent background scrolling while modal is open
  useLockBodyScroll(isOpen);

  // Basic Info
  const [name, setName] = useState(collection?.name || "");
  const [description, setDescription] = useState(collection?.description || "");
  const [iconType, setIconType] = useState<"lucide" | "custom_image">(
    (collection?.iconType as any) || "lucide"
  );
  const [iconValue, setIconValue] = useState(collection?.iconValue || "Folder");
  const [color, setColor] = useState(collection?.color || "#8b5cf6");
  const [iconMode, setIconMode] = useState<"preset" | "custom">(
    collection?.iconType === "custom_image" ? "custom" : "preset"
  );

  // Folder Hierarchy
  const [parentId, setParentId] = useState<string | null>(
    collection?.parentId || initialParentId || null
  );

  // Smart Collection Mode & Rules
  const [isSmart, setIsSmart] = useState<boolean>(Boolean(collection?.isSmart));
  const [smartTimeRange, setSmartTimeRange] = useState<"all" | "today" | "7days" | "30days">("all");
  const [smartLanguage, setSmartLanguage] = useState<string>("");
  const [smartTag, setSmartTag] = useState<string>("");
  const [smartUntaggedOnly, setSmartUntaggedOnly] = useState<boolean>(false);
  const [smartFavoritesOnly, setSmartFavoritesOnly] = useState<boolean>(false);
  const [smartQuery, setSmartQuery] = useState<string>("");

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dynamic Height & Smooth Transitions (matching SettingsModal)
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

    const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
    const viewportH = isMobile ? window.innerHeight : (window.visualViewport?.height || window.innerHeight);
    const maxH = isMobile ? viewportH * 0.96 : viewportH * 0.90;

    if (isMobile) {
      // On mobile smartphones, default to full comfortable modal height (maxH)
      // to keep "Regular folder" at proper size and prevent awkward dynamic shrinking
      setModalHeight(Math.round(maxH));
      return;
    }

    // Add +2px safety buffer to avoid subpixel clipping
    const targetH = headerH + contentH + footerH + 2;
    const minH = 340;
    const finalH = Math.min(maxH, Math.max(minH, targetH));
    setModalHeight(Math.round(finalH));
  }, []);

  useEffect(() => {
    if (!isOpen) {
      isReadyForTransitionRef.current = false;
      setHasTransition(false);
      setModalHeight(undefined);
      return;
    }

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
  }, [isOpen, updateModalHeight]);

  useEffect(() => {
    requestAnimationFrame(() => {
      updateModalHeight();
    });
  }, [isSmart, iconMode, updateModalHeight]);

  // Initialize form state
  useEffect(() => {
    if (isOpen) {
      setName(collection?.name || "");
      setDescription(collection?.description || "");
      setIconType((collection?.iconType as any) || "lucide");
      setIconValue(collection?.iconValue || (collection?.isSmart ? "Sparkles" : "Folder"));
      setColor(collection?.color || (collection?.isSmart ? "#ec4899" : "#8b5cf6"));
      setIconMode(collection?.iconType === "custom_image" ? "custom" : "preset");
      setParentId(collection?.parentId || initialParentId || null);
      setIsSmart(Boolean(collection?.isSmart));

      if (collection?.isSmart && collection.filterRule) {
        try {
          const rule: SmartFilterRule = JSON.parse(collection.filterRule);
          setSmartTimeRange(rule.timeRange || "all");
          setSmartLanguage(rule.language || "");
          setSmartTag(rule.tag || "");
          setSmartUntaggedOnly(Boolean(rule.untaggedOnly));
          setSmartFavoritesOnly(Boolean(rule.favoritesOnly));
          setSmartQuery(rule.query || "");
        } catch {
          setSmartTimeRange("all");
          setSmartLanguage("");
          setSmartTag("");
          setSmartUntaggedOnly(false);
          setSmartFavoritesOnly(false);
          setSmartQuery("");
        }
      } else {
        setSmartTimeRange("all");
        setSmartLanguage("");
        setSmartTag("");
        setSmartUntaggedOnly(false);
        setSmartFavoritesOnly(false);
        setSmartQuery("");
      }

      setError(null);
    }
  }, [isOpen, collection, initialParentId]);

  // Compute eligible parent collections (exclude self and self's descendants to avoid cycles)
  const eligibleParents = useMemo(() => {
    if (!isEditing || !collection) {
      return allCollections.filter((c) => !c.isSmart);
    }

    // Find all descendants of current collection
    const descendantIds = new Set<string>([collection.id]);
    let added = true;
    while (added) {
      added = false;
      for (const col of allCollections) {
        if (col.parentId && descendantIds.has(col.parentId) && !descendantIds.has(col.id)) {
          descendantIds.add(col.id);
          added = true;
        }
      }
    }

    return allCollections.filter((c) => !descendantIds.has(c.id) && !c.isSmart);
  }, [allCollections, collection, isEditing]);

  // Build parent display options with tree paths
  const parentOptions = useMemo(() => {
    const colMap = new Map<string, CollectionItem>();
    allCollections.forEach((c) => colMap.set(c.id, c));

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

    return eligibleParents
      .map((c) => ({
        id: c.id,
        name: c.name,
        path: getPath(c),
      }))
      .sort((a, b) => a.path.localeCompare(b.path));
  }, [eligibleParents, allCollections]);

  // CustomSelect Options for Parent Collection
  const parentSelectOptions: CustomSelectOption[] = useMemo(() => {
    return [
      {
        value: "",
        label: t("collection.noParent"),
        icon: <Folder className="w-4 h-4 text-zinc-500" />,
      },
      ...parentOptions.map((opt) => ({
        value: opt.id,
        label: opt.path,
        icon: <Folder className="w-4 h-4 text-violet-400" />,
      })),
    ];
  }, [parentOptions, t]);

  // CustomSelect Options for Languages
  const languageSelectOptions: CustomSelectOption[] = useMemo(() => {
    return [
      {
        value: "",
        label: t("collection.anyLanguage"),
      },
      ...SUPPORTED_LANGUAGES.map((lang) => ({
        value: lang.id,
        label: lang.name,
        icon: (
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: lang.color }}
          />
        ),
      })),
    ];
  }, [t]);

  if (!isOpen) return null;

  // Preset Handlers for Smart Collections
  const applyPreset = (preset: "recent7" | "fastapi" | "untagged" | "favorites" | "today") => {
    setIsSmart(true);
    setIconValue("Sparkles");
    setColor("#ec4899");

    if (preset === "recent7") {
      setSmartTimeRange("7days");
      setSmartLanguage("");
      setSmartTag("");
      setSmartUntaggedOnly(false);
      setSmartFavoritesOnly(false);
      setSmartQuery("");
      if (!name) setName("Недавние (7 дней)");
    } else if (preset === "fastapi") {
      setSmartTimeRange("all");
      setSmartLanguage("python");
      setSmartTag("fastapi");
      setSmartUntaggedOnly(false);
      setSmartFavoritesOnly(false);
      setSmartQuery("");
      if (!name) setName("FastAPI Python");
    } else if (preset === "untagged") {
      setSmartTimeRange("all");
      setSmartLanguage("");
      setSmartTag("");
      setSmartUntaggedOnly(true);
      setSmartFavoritesOnly(false);
      setSmartQuery("");
      if (!name) setName("Без тегов");
    } else if (preset === "favorites") {
      setSmartTimeRange("all");
      setSmartLanguage("");
      setSmartTag("");
      setSmartUntaggedOnly(false);
      setSmartFavoritesOnly(true);
      setSmartQuery("");
      if (!name) setName("Избранное");
    } else if (preset === "today") {
      setSmartTimeRange("today");
      setSmartLanguage("");
      setSmartTag("");
      setSmartUntaggedOnly(false);
      setSmartFavoritesOnly(false);
      setSmartQuery("");
      if (!name) setName("За 24 часа");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Пожалуйста, выберите файл изображения (PNG, JPG, SVG, WebP)");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("Размер файла не должен превышать 2 МБ");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setIconType("custom_image");
        setIconValue(dataUrl);
        setIconMode("custom");
        setError(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(t("collection.namePlaceholder"));
      return;
    }

    setSaving(true);
    setError(null);

    let filterRuleJson: string | null = null;
    if (isSmart) {
      const rule: SmartFilterRule = {
        timeRange: smartTimeRange,
        language: smartLanguage || undefined,
        tag: smartUntaggedOnly ? undefined : smartTag || undefined,
        untaggedOnly: smartUntaggedOnly,
        favoritesOnly: smartFavoritesOnly,
        query: smartQuery.trim() || undefined,
      };
      filterRuleJson = JSON.stringify(rule);
    }

    try {
      await onSave({
        name: name.trim(),
        description: description.trim() || null,
        iconType,
        iconValue,
        color,
        parentId: isSmart ? null : parentId,
        isSmart,
        filterRule: filterRuleJson,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Ошибка сохранения коллекции");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!collection?.id || !onDelete) return;
    if (confirm(t("collection.deleteConfirm", { name: collection.name }))) {
      setDeleting(true);
      try {
        await onDelete(collection.id);
        onClose();
      } catch (err: any) {
        setError(err.message || t("common.error"));
      } finally {
        setDeleting(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4 lg:p-6 bg-black/80 backdrop-blur-sm animate-modal-backdrop touch-none">
      <div
        ref={dialogRef}
        style={{
          height: modalHeight ? `${modalHeight}px` : undefined,
          transition:
            hasTransition && (typeof window === "undefined" || window.innerWidth >= 640)
              ? "height 0.32s cubic-bezier(0.16, 1, 0.3, 1)"
              : undefined,
        }}
        className="relative w-full max-w-xl h-[100dvh] sm:h-auto max-h-[100dvh] sm:max-h-[90vh] rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden flex flex-col animate-modal-content will-change-[height] safe-top touch-auto"
      >
        {/* Header */}
        <div
          ref={headerRef}
          className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-zinc-800 bg-zinc-900/70 shrink-0"
        >
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center border border-white/10 shadow-sm shrink-0"
              style={{ backgroundColor: `${color}20` }}
            >
              <CollectionIcon
                iconType={iconType}
                iconValue={iconValue}
                color={color}
                className="w-4 h-4 sm:w-5 sm:h-5"
              />
            </div>
            <div className="truncate">
              <h2 className="text-sm sm:text-base font-semibold text-white truncate">
                {isEditing ? t("collection.editTitle") : t("collection.createTitle")}
              </h2>
              <p className="text-[11px] sm:text-xs text-zinc-400 truncate hidden sm:block">
                {isSmart ? t("collection.smartDesc") : t("collection.descPlaceholder")}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors shrink-0 ml-2 min-w-[36px] min-h-[36px] flex items-center justify-center active:scale-95"
            aria-label={t("common.close")}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Scrollable Body */}
          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto min-h-0 overscroll-contain"
          >
            <div
              ref={innerContentRef}
              className="p-4 sm:p-6 space-y-4 sm:space-y-5 text-xs text-zinc-200"
            >
              {error && (
                <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300">
                  {error}
                </div>
              )}

              {/* Collection Type Toggle (Standard vs Smart) */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider">
                  {t("collection.collectionType")}
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-900/90 rounded-xl border border-zinc-800">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSmart(false);
                      if (iconValue === "Sparkles") setIconValue("Folder");
                      requestAnimationFrame(() => updateModalHeight());
                    }}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-medium transition-all min-h-[42px] ${
                      !isSmart
                        ? "bg-violet-600 text-white shadow-sm font-semibold"
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
                    }`}
                  >
                    <Folder className="w-4 h-4" />
                    <span>{t("collection.typeStandard")}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsSmart(true);
                      if (iconValue === "Folder") setIconValue("Sparkles");
                      if (color === "#8b5cf6") setColor("#ec4899");
                      requestAnimationFrame(() => updateModalHeight());
                    }}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-medium transition-all min-h-[42px] ${
                      isSmart
                        ? "bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-sm font-semibold"
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
                    }`}
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{t("collection.typeSmart")}</span>
                  </button>
                </div>
              </div>

              {/* Quick Presets for Smart Collection */}
              {isSmart && (
                <div className="space-y-2 p-3 sm:p-3.5 rounded-xl bg-pink-950/20 border border-pink-500/20 animate-fade-in">
                <div className="flex items-center justify-between text-[11px] font-semibold text-pink-300">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                    {t("collection.presets")}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => applyPreset("recent7")}
                    className="px-2.5 py-2 sm:py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-pink-500/50 text-[11px] text-zinc-300 hover:text-white transition-all active:scale-95 min-h-[36px] flex items-center justify-center text-center"
                  >
                    {t("collection.presetRecent7")}
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset("fastapi")}
                    className="px-2.5 py-2 sm:py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-pink-500/50 text-[11px] text-zinc-300 hover:text-white transition-all active:scale-95 min-h-[36px] flex items-center justify-center text-center"
                  >
                    {t("collection.presetFastapi")}
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset("untagged")}
                    className="px-2.5 py-2 sm:py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-pink-500/50 text-[11px] text-zinc-300 hover:text-white transition-all active:scale-95 min-h-[36px] flex items-center justify-center text-center"
                  >
                    {t("collection.presetUntagged")}
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset("favorites")}
                    className="px-2.5 py-2 sm:py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-pink-500/50 text-[11px] text-zinc-300 hover:text-white transition-all active:scale-95 min-h-[36px] flex items-center justify-center text-center"
                  >
                    {t("collection.presetFavorites")}
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset("today")}
                    className="px-2.5 py-2 sm:py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-pink-500/50 text-[11px] text-zinc-300 hover:text-white transition-all active:scale-95 min-h-[36px] flex items-center justify-center text-center"
                  >
                    {t("collection.presetToday")}
                  </button>
                </div>
              </div>
            )}

            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider">
                {t("collection.nameLabel")} <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                autoFocus={typeof window !== "undefined" && window.innerWidth >= 640}
                placeholder={t("collection.namePlaceholder")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900 focus:bg-zinc-950 focus:border-violet-500 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-all min-h-[42px]"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider">
                {t("collection.descLabel")}
              </label>
              <textarea
                rows={2}
                placeholder={t("collection.descPlaceholder")}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900 focus:bg-zinc-950 focus:border-violet-500 text-xs text-zinc-100 placeholder-zinc-500 outline-none resize-none transition-all"
              />
            </div>

            {/* Parent Collection (Folder Tree - CustomSelect) */}
            {!isSmart && (
              <div className="space-y-1.5 animate-fade-in">
                <label className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <FolderTree className="w-3.5 h-3.5 text-violet-400" />
                  <span>{t("collection.parentLabel")}</span>
                </label>
                <CustomSelect
                  value={parentId || ""}
                  onChange={(val) => setParentId(val || null)}
                  options={parentSelectOptions}
                  placeholder={t("collection.noParent")}
                  searchable={parentSelectOptions.length > 5}
                  searchPlaceholder="Поиск папки..."
                />
              </div>
            )}

            {/* Smart Collection Rule Configurator */}
            {isSmart && (
              <div className="space-y-3.5 p-3.5 sm:p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 animate-fade-in">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-pink-400">
                  {t("collection.filterRules")}
                </div>

                {/* Time Range */}
                <div className="space-y-1.5">
                  <label className="text-[11px] text-zinc-400 font-medium">{t("collection.timeRange")}</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(["all", "today", "7days", "30days"] as const).map((range) => {
                      const label =
                        range === "all"
                          ? t("collection.timeAny")
                          : range === "today"
                          ? t("collection.timeToday")
                          : range === "7days"
                          ? t("collection.time7days")
                          : t("collection.time30days");
                      return (
                        <button
                          key={range}
                          type="button"
                          onClick={() => setSmartTimeRange(range)}
                          className={`py-2 px-2.5 rounded-xl text-center text-xs font-medium border transition-all min-h-[38px] active:scale-95 ${
                            smartTimeRange === range
                              ? "bg-pink-600/20 border-pink-500 text-pink-200 font-semibold"
                              : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Language & Tag (CustomSelect for Language) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Language CustomSelect */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-zinc-400 font-medium">{t("collection.languageLabel")}</label>
                    <CustomSelect
                      value={smartLanguage}
                      onChange={setSmartLanguage}
                      options={languageSelectOptions}
                      placeholder={t("collection.anyLanguage")}
                      searchable={true}
                      searchPlaceholder="Поиск языка..."
                    />
                  </div>

                  {/* Tag */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-zinc-400 font-medium">{t("collection.tagLabel")}</label>
                    <div className="relative">
                      <input
                        type="text"
                        disabled={smartUntaggedOnly}
                        placeholder="Например: fastapi"
                        value={smartTag}
                        onChange={(e) => setSmartTag(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 outline-none disabled:opacity-40 min-h-[42px] transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Checkboxes */}
                <div className="pt-1.5 space-y-2.5">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none p-2 rounded-xl hover:bg-zinc-800/40 transition-colors">
                    <input
                      type="checkbox"
                      checked={smartUntaggedOnly}
                      onChange={(e) => {
                        setSmartUntaggedOnly(e.target.checked);
                        if (e.target.checked) setSmartTag("");
                      }}
                      className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-pink-600 focus:ring-0 cursor-pointer"
                    />
                    <span className="text-xs text-zinc-300 font-medium">{t("collection.untaggedOnly")}</span>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer select-none p-2 rounded-xl hover:bg-zinc-800/40 transition-colors">
                    <input
                      type="checkbox"
                      checked={smartFavoritesOnly}
                      onChange={(e) => setSmartFavoritesOnly(e.target.checked)}
                      className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-pink-600 focus:ring-0 cursor-pointer"
                    />
                    <span className="text-xs text-zinc-300 font-medium">{t("collection.favoritesOnly")}</span>
                  </label>
                </div>

                {/* Search Query within code/title */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-[11px] text-zinc-400 font-medium">{t("collection.searchQueryLabel")}</label>
                  <input
                    type="text"
                    placeholder={t("collection.searchQueryPlaceholder")}
                    value={smartQuery}
                    onChange={(e) => setSmartQuery(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 outline-none min-h-[42px] transition-all"
                  />
                </div>
              </div>
            )}

            {/* Color Presets */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider">
                {t("collection.colorLabel")}
              </label>
              <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-7 h-7 sm:w-6 sm:h-6 rounded-full transition-transform flex items-center justify-center active:scale-95 ${
                      color === c ? "scale-125 ring-2 ring-white/50" : "hover:scale-110"
                    }`}
                    style={{ backgroundColor: c }}
                  >
                    {color === c && <Check className="w-3.5 h-3.5 text-white" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Icon Picker Mode */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider">
                  {t("collection.iconLabel")}
                </label>

                {/* Mode switch */}
                <div className="flex items-center p-0.5 rounded-xl bg-zinc-900 border border-zinc-800 text-[10px] sm:text-[11px]">
                  <button
                    type="button"
                    onClick={() => {
                      setIconMode("preset");
                      setIconType("lucide");
                    }}
                    className={`px-3 py-1.5 rounded-lg transition-colors min-h-[32px] ${
                      iconMode === "preset"
                        ? "bg-zinc-800 text-white font-medium"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    Библиотека иконок
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIconMode("custom");
                      if (iconType !== "custom_image") {
                        fileInputRef.current?.click();
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg transition-colors min-h-[32px] ${
                      iconMode === "custom"
                        ? "bg-zinc-800 text-white font-medium"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    Своя картинка
                  </button>
                </div>
              </div>

              {iconMode === "preset" ? (
                <div className="grid grid-cols-6 sm:grid-cols-9 gap-1.5 sm:gap-2 p-2.5 rounded-xl border border-zinc-800 bg-zinc-900/40 max-h-48 overflow-y-auto overscroll-contain">
                  {STANDARD_ICONS.map((item) => {
                    const Icon = item.component;
                    const isSelected = iconType === "lucide" && iconValue === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setIconType("lucide");
                          setIconValue(item.id);
                        }}
                        className={`p-2.5 rounded-xl flex items-center justify-center transition-all min-h-[38px] active:scale-95 ${
                          isSelected
                            ? "bg-violet-600 text-white scale-105 shadow-md"
                            : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                        }`}
                        title={item.name}
                      >
                        <Icon className="w-4 h-4" />
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />

                  {iconType === "custom_image" && iconValue ? (
                    <div className="flex items-center gap-3 p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/60">
                      <img
                        src={iconValue}
                        alt="Custom icon"
                        className="w-10 h-10 rounded-xl object-contain bg-zinc-950 border border-zinc-800 p-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-white truncate">
                          Кастомное изображение
                        </div>
                        <div className="flex items-center gap-3 mt-1.5">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="text-xs text-violet-400 hover:text-violet-300 font-medium"
                          >
                            Заменить
                          </button>
                          <span className="text-zinc-600">•</span>
                          <button
                            type="button"
                            onClick={() => {
                              setIconType("lucide");
                              setIconValue(isSmart ? "Sparkles" : "Folder");
                              setIconMode("preset");
                            }}
                            className="text-xs text-rose-400 hover:text-rose-300 font-medium"
                          >
                            Сбросить
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full flex flex-col items-center justify-center gap-2 p-5 rounded-xl border border-dashed border-zinc-800 hover:border-violet-500/50 bg-zinc-900/20 text-zinc-400 hover:text-zinc-200 transition-colors"
                    >
                      <Upload className="w-6 h-6 text-zinc-500" />
                      <span className="text-xs font-medium">Загрузить логотип или иконку</span>
                      <span className="text-[10px] text-zinc-500">PNG, SVG, JPG до 2 МБ</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sticky Footer Actions */}
        <div
          ref={footerRef}
          className="shrink-0 px-4 sm:px-6 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:py-3.5 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur-md flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2.5 z-10"
        >
            {isEditing && onDelete ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors w-full sm:w-auto min-h-[44px] sm:min-h-[38px] active:scale-[0.98]"
              >
                <Trash2 className="w-4 h-4" />
                <span>{t("collection.delete")}</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center justify-end gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors text-center min-h-[44px] sm:min-h-[38px] active:scale-[0.98]"
              >
                {t("common.cancel")}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 active:scale-[0.98] transition-all disabled:opacity-50 min-h-[44px] sm:min-h-[38px] shadow-lg shadow-violet-600/20"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                <Save className="w-4 h-4" />
                <span>{t("common.save")}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
