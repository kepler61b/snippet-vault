"use client";

import React, { useEffect, useState } from "react";
import { Check, Eye, EyeOff, Loader2, Save, Sparkles, X } from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [provider, setProvider] = useState<"openai" | "gemini" | "custom">("openai");
  const [apiKey, setApiKey] = useState("");
  const [hasApiKey, setHasApiKey] = useState(false);
  const [maskedKey, setMaskedKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("https://api.openai.com/v1");
  const [model, setModel] = useState("gpt-4o-mini");

  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/settings");
      const data = await res.json();
      if (data.success && data.settings) {
        setProvider(data.settings.provider || "openai");
        setHasApiKey(data.settings.hasApiKey || false);
        setMaskedKey(data.settings.maskedKey || "");
        setBaseUrl(data.settings.baseUrl || "https://api.openai.com/v1");
        setModel(data.settings.model || "gpt-4o-mini");
      }
    } catch (e) {
      console.error("Failed to load settings:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleProviderChange = (newProvider: "openai" | "gemini" | "custom") => {
    setProvider(newProvider);
    if (newProvider === "openai") {
      setBaseUrl("https://api.openai.com/v1");
      setModel("gpt-4o-mini");
    } else if (newProvider === "gemini") {
      setBaseUrl("https://generativelanguage.googleapis.com");
      setModel("gemini-1.5-flash");
    } else if (newProvider === "custom") {
      setBaseUrl("http://localhost:11434/v1");
      setModel("llama3");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          apiKey: apiKey.trim(),
          baseUrl: baseUrl.trim(),
          model: model.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save settings");
      }
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 1200);
    } catch (e: any) {
      alert(e.message || "Ошибка сохранения настроек");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-modal-backdrop">
      <div className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden flex flex-col animate-modal-content">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/60">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-600/20 text-violet-400 border border-violet-500/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">
                Настройки AI Ассистента
              </h2>
              <p className="text-xs text-zinc-400">
                Конфигурация провайдера нейросети для анализа кода
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        {loading ? (
          <div className="py-16 flex items-center justify-center text-zinc-400 text-xs">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Загрузка настроек...
          </div>
        ) : (
          <form onSubmit={handleSave} className="p-6 space-y-4 text-xs">
            {/* Provider selection */}
            <div className="space-y-1.5">
              <label className="font-semibold text-zinc-300 uppercase tracking-wider text-[11px]">
                Провайдер AI
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleProviderChange("openai")}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    provider === "openai"
                      ? "border-violet-500 bg-violet-600/10 text-white font-medium shadow-sm"
                      : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  OpenAI
                </button>
                <button
                  type="button"
                  onClick={() => handleProviderChange("gemini")}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    provider === "gemini"
                      ? "border-violet-500 bg-violet-600/10 text-white font-medium shadow-sm"
                      : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Google Gemini
                </button>
                <button
                  type="button"
                  onClick={() => handleProviderChange("custom")}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    provider === "custom"
                      ? "border-violet-500 bg-violet-600/10 text-white font-medium shadow-sm"
                      : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Ollama / Custom
                </button>
              </div>
            </div>

            {/* API Key */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-zinc-300 uppercase tracking-wider text-[11px]">
                  API Ключ {provider === "custom" && "(Опционально)"}
                </label>
                {hasApiKey && !apiKey && (
                  <span className="text-[10px] text-emerald-400 font-medium">
                    ✓ Ключ уже сохранен ({maskedKey})
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  placeholder={
                    hasApiKey
                      ? "Введите новый ключ для замены..."
                      : provider === "gemini"
                      ? "AIzaSy..."
                      : "sk-..."
                  }
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full px-3 py-2 pr-10 rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-100 placeholder-zinc-500 outline-none focus:border-violet-500"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-2.5 text-zinc-500 hover:text-zinc-300"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-zinc-500">
                Ключ сохраняется в вашей локальной базе SQLite или берется из .env
              </p>
            </div>

            {/* Base URL */}
            <div className="space-y-1.5">
              <label className="font-semibold text-zinc-300 uppercase tracking-wider text-[11px]">
                Base URL
              </label>
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://api.openai.com/v1"
                className="w-full px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-100 placeholder-zinc-500 outline-none focus:border-violet-500"
              />
              {provider === "custom" && (
                <p className="text-[10px] text-zinc-500">
                  Для Ollama в Docker используйте: <code>http://host.docker.internal:11434/v1</code>
                </p>
              )}
            </div>

            {/* Model Name */}
            <div className="space-y-1.5">
              <label className="font-semibold text-zinc-300 uppercase tracking-wider text-[11px]">
                Модель
              </label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder={
                  provider === "gemini"
                    ? "gemini-1.5-flash"
                    : provider === "openai"
                    ? "gpt-4o-mini"
                    : "llama3"
                }
                className="w-full px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-100 placeholder-zinc-500 outline-none focus:border-violet-500"
              />
            </div>

            {/* Footer Buttons */}
            <div className="pt-3 border-t border-zinc-800 flex items-center justify-between">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                Отмена
              </button>

              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white bg-violet-600 hover:bg-violet-500 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : saveSuccess ? (
                  <Check className="w-4 h-4 text-emerald-300" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>{saveSuccess ? "Сохранено!" : "Сохранить"}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
