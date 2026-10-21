"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Check,
  Folder,
  ImageIcon,
  Loader2,
  Plus,
  Save,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { CollectionItem } from "@/types/snippet";
import {
  CollectionIcon,
  PRESET_COLORS,
  STANDARD_ICONS,
} from "@/lib/collection-icons";

interface CollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  collection?: CollectionItem | null;
  onSave: (data: {
    name: string;
    description?: string | null;
    iconType: string;
    iconValue: string;
    color?: string | null;
  }) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export function CollectionModal({
  isOpen,
  onClose,
  collection,
  onSave,
  onDelete,
}: CollectionModalProps) {
  const isEditing = Boolean(collection);

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

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName(collection?.name || "");
      setDescription(collection?.description || "");
      setIconType((collection?.iconType as any) || "lucide");
      setIconValue(collection?.iconValue || "Folder");
      setColor(collection?.color || "#8b5cf6");
      setIconMode(collection?.iconType === "custom_image" ? "custom" : "preset");
      setError(null);
    }
  }, [isOpen, collection]);

  if (!isOpen) return null;

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
      setError("Укажите название коллекции");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onSave({
        name: name.trim(),
        description: description.trim() || null,
        iconType,
        iconValue,
        color,
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
    if (confirm(`Вы уверены, что хотите удалить коллекцию «${collection.name}»? Сниппеты не будут удалены, а только откреплены.`)) {
      setDeleting(true);
      try {
        await onDelete(collection.id);
        onClose();
      } catch (err: any) {
        setError(err.message || "Ошибка удаления");
      } finally {
        setDeleting(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-1.5 sm:p-6 bg-black/80 backdrop-blur-sm animate-modal-backdrop">
      <div className="relative w-full max-w-lg max-h-[96dvh] rounded-xl sm:rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden flex flex-col animate-modal-content">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-zinc-800 bg-zinc-900/60 shrink-0">
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
                {isEditing ? "Редактировать коллекцию" : "Новая коллекция"}
              </h2>
              <p className="text-[11px] sm:text-xs text-zinc-400 truncate hidden sm:block">
                Группируйте сниппеты по проектам, темам или задачам
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors shrink-0 ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-3.5 sm:p-6 space-y-4 sm:space-y-5 text-xs text-zinc-200 overflow-y-auto">
          {error && (
            <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300">
              {error}
            </div>
          )}

          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider">
              Название коллекции <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="Например: Микросервисы, Devops, React UI"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2 sm:py-2.5 rounded-xl border border-zinc-800 bg-zinc-900 focus:bg-zinc-950 focus:border-violet-500 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 outline-none"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider">
              Описание (необязательно)
            </label>
            <textarea
              rows={2}
              placeholder="Краткое описание содержимого или цели этой коллекции..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-zinc-800 bg-zinc-900 focus:bg-zinc-950 focus:border-violet-500 text-xs text-zinc-100 placeholder-zinc-500 outline-none resize-none"
            />
          </div>

          {/* Color Presets */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider">
              Цветовой акцент
            </label>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full transition-transform flex items-center justify-center ${
                    color === c ? "scale-125 ring-2 ring-white/50" : "hover:scale-110"
                  }`}
                  style={{ backgroundColor: c }}
                >
                  {color === c && <Check className="w-3 h-3 text-white" />}
                </button>
              ))}
            </div>
          </div>

          {/* Icon Picker Mode */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <label className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider">
                Иконка коллекции
              </label>

              {/* Mode switch */}
              <div className="flex items-center p-0.5 rounded-lg bg-zinc-900 border border-zinc-800 text-[10px] sm:text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    setIconMode("preset");
                    setIconType("lucide");
                    if (iconValue.startsWith("data:")) setIconValue("Folder");
                  }}
                  className={`px-2 sm:px-2.5 py-1 rounded-md transition-all ${
                    iconMode === "preset"
                      ? "bg-violet-600 text-white font-medium"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Стандартные
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIconMode("custom");
                    if (iconType === "custom_image" && iconValue.startsWith("data:")) {
                      // Already has image
                    } else {
                      fileInputRef.current?.click();
                    }
                  }}
                  className={`px-2 sm:px-2.5 py-1 rounded-md transition-all ${
                    iconMode === "custom"
                      ? "bg-violet-600 text-white font-medium"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Своя иконка / Фото
                </button>
              </div>
            </div>

            {/* Standard Icons Grid */}
            {iconMode === "preset" ? (
              <div className="grid grid-cols-5 sm:grid-cols-7 gap-1.5 sm:gap-2 p-2 sm:p-3 rounded-xl border border-zinc-800 bg-zinc-900/60 max-h-40 overflow-y-auto">
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
                      title={item.name}
                      className={`p-2 sm:p-2.5 rounded-xl border transition-all flex items-center justify-center ${
                        isSelected
                          ? "border-violet-500 bg-violet-600/20 text-white shadow-sm scale-105"
                          : "border-zinc-800/80 bg-zinc-900 text-zinc-400 hover:text-white hover:border-zinc-700"
                      }`}
                    >
                      <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  );
                })}
              </div>
            ) : (
              /* Custom File Upload */
              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                {iconType === "custom_image" && iconValue.startsWith("data:") ? (
                  <div className="flex items-center gap-4">
                    <img
                      src={iconValue}
                      alt="Uploaded icon"
                      className="w-14 h-14 rounded-xl object-cover border border-zinc-700 shadow-md"
                    />
                    <div className="space-y-1.5">
                      <div className="text-xs font-semibold text-white">
                        Иконка загружена
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-2.5 py-1 rounded-lg text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                        >
                          Заменить
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIconType("lucide");
                            setIconValue("Folder");
                            setIconMode("preset");
                          }}
                          className="px-2.5 py-1 rounded-lg text-xs text-rose-400 hover:bg-rose-500/10"
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-zinc-800 hover:border-violet-500/60 rounded-xl p-5 text-center cursor-pointer transition-colors space-y-2 group"
                  >
                    <div className="inline-flex p-3 rounded-xl bg-zinc-800 group-hover:bg-violet-600/20 text-zinc-400 group-hover:text-violet-400 transition-colors">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-zinc-200">
                        Нажмите для выбора файла с ПК или смартфона
                      </div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">
                        PNG, JPG, SVG, WebP до 2 МБ
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-zinc-800 flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2.5">
            {isEditing && onDelete ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors w-full sm:w-auto"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Удалить коллекцию</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center justify-end gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors text-center"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <Save className="w-3.5 h-3.5" />
                <span>{isEditing ? "Сохранить" : "Создать"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
