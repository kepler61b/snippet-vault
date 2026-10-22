"use client";

import React, { useEffect } from "react";
import { Bot, Settings, Sparkles, X } from "lucide-react";

interface AIKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigure: () => void;
}

export function AIKeyModal({ isOpen, onClose, onConfigure }: AIKeyModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-5 sm:p-6 shadow-2xl shadow-violet-950/20 animate-modal-content space-y-5">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3.5 top-3.5 p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
          title="Закрыть"
          aria-label="Закрыть"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon & Title */}
        <div className="text-center space-y-3 pt-1">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600/20 via-indigo-600/20 to-sky-500/20 border border-violet-500/30 flex items-center justify-center text-violet-400 mx-auto shadow-lg shadow-violet-600/10">
            <Sparkles className="w-6 h-6 text-violet-400 animate-pulse" />
          </div>

          <div className="space-y-1">
            <h3 className="text-base sm:text-lg font-bold text-white">
              Требуется настройка AI API Ключа
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-sm mx-auto">
              Для использования функций искусственного интеллекта необходимо указать API ключ в настройках приложения.
            </p>
          </div>
        </div>

        {/* Features Info Box */}
        <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/60 space-y-2 text-xs text-zinc-300">
          <div className="flex items-center gap-2 font-medium text-zinc-200">
            <Bot className="w-4 h-4 text-violet-400 shrink-0" />
            <span>AI-функции приложения:</span>
          </div>
          <ul className="text-[11px] text-zinc-400 space-y-1 pl-6 list-disc">
            <li>Автогенерация заголовка, описания и тегов по коду</li>
            <li>Объяснение логики работы алгоритмов и файлов</li>
            <li>Рефакторинг, оптимизация и документирование кода</li>
          </ul>
          <p className="text-[11px] text-zinc-500 pt-1 border-t border-zinc-800/80">
            Поддерживаются: OpenAI, Google Gemini и локальные модели Ollama / LM Studio.
          </p>
        </div>

        {/* Action Buttons: ОК and Настроить */}
        <div className="flex items-center gap-2.5 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-medium text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 active:scale-95 transition-all text-center min-h-[44px]"
          >
            ОК
          </button>

          <button
            type="button"
            onClick={onConfigure}
            className="flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-md shadow-violet-600/25 active:scale-95 transition-all flex items-center justify-center gap-1.5 min-h-[44px]"
          >
            <Settings className="w-4 h-4" />
            <span>Настроить</span>
          </button>
        </div>
      </div>
    </div>
  );
}
