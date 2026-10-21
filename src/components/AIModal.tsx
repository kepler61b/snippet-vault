"use client";

import React, { useState } from "react";
import { Check, Copy, Sparkles, X } from "lucide-react";
import { CodeBlock } from "./CodeBlock";

interface AIModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  type: "explain" | "refactor" | "document" | "general";
  content: string;
  language?: string;
  onApplyCode?: (code: string) => void;
}

export function AIModal({
  isOpen,
  onClose,
  title,
  type,
  content,
  language = "plaintext",
  onApplyCode,
}: AIModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  // Attempt to extract pure code block if present
  let extractedCode = "";
  let remainingExplanation = "";
  const codeMatch = content.match(/```(?:[a-zA-Z0-9_-]+)?\n([\s\S]*?)```/);
  if (codeMatch && codeMatch[1]) {
    extractedCode = codeMatch[1].trim();
    remainingExplanation = content.replace(codeMatch[0], "").trim();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-3xl max-h-[85vh] flex flex-col rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/60">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-600/20 text-violet-400 border border-violet-500/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">{title}</h2>
              <p className="text-xs text-zinc-400">Сгенерировано AI Ассистентом</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-sm text-zinc-200">
          {extractedCode && (type === "refactor" || type === "document") ? (
            <div className="space-y-4">
              <div className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Предложенный код:
                </span>
                <CodeBlock code={extractedCode} language={language} />
              </div>

              {/* Explanatory notes if any */}
              {remainingExplanation && (
                <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800/80 text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed">
                  <div className="font-semibold text-zinc-200 mb-1">Пояснения к изменениям:</div>
                  {remainingExplanation}
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800/80 text-xs sm:text-sm whitespace-pre-wrap leading-relaxed font-sans text-zinc-200">
              {content}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800 bg-zinc-900/40">
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-700 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Скопировано!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Скопировать ответ</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            {onApplyCode && extractedCode && (
              <button
                onClick={() => {
                  onApplyCode(extractedCode);
                  onClose();
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 shadow-md shadow-violet-600/30 transition-all"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Применить код в файл</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
