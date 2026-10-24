"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Wand2,
  FileText,
  Copy,
  Check,
  ChevronUp,
  ChevronDown,
  AlertCircle,
  Settings,
  ArrowRight,
  RotateCw,
} from "lucide-react";
import { MarkdownPreview } from "@/components/MarkdownPreview";
import { useI18n } from "@/lib/i18n";

export type AIActionType = "explain" | "refactor" | "document";

interface AICodeAssistantBlockProps {
  code: string;
  language?: string;
  onApplyCode?: (newCode: string) => void;
  onOpenSettings?: () => void;
  className?: string;
}

export function AICodeAssistantBlock({
  code,
  language = "plaintext",
  onApplyCode,
  onOpenSettings,
  className = "",
}: AICodeAssistantBlockProps) {
  const { t, locale } = useI18n();

  const [activeAction, setActiveAction] = useState<AIActionType | null>(null);
  const [loadingAction, setLoadingAction] = useState<AIActionType | null>(null);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isKeyRequired, setIsKeyRequired] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [applied, setApplied] = useState(false);

  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const responseContainerRef = useRef<HTMLDivElement>(null);

  // Clear progress interval on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, []);

  const handleRunAction = async (action: AIActionType) => {
    if (!code || !code.trim()) {
      setError(t("aiAssistantBlock.emptyCodeWarning"));
      return;
    }

    if (loadingAction) return;

    setError(null);
    setIsKeyRequired(false);
    setLoadingAction(action);
    setActiveAction(action);
    setIsCollapsed(false);
    setApplied(false);
    setProgress(12);

    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    progressIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev < 45) return prev + Math.floor(Math.random() * 8) + 4;
        if (prev < 78) return prev + Math.floor(Math.random() * 4) + 2;
        if (prev < 93) return prev + 1;
        return prev;
      });
    }, 140);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          code,
          language: language || "plaintext",
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        const isKey =
          data.code === "AI_KEY_REQUIRED" ||
          data.error?.includes("AI API ключ не настроен") ||
          data.error?.includes("API ключ не настроен");

        if (isKey) {
          setIsKeyRequired(true);
          throw new Error(t("aiAssistantBlock.keyRequired"));
        }
        throw new Error(data.error || "Ошибка обращения к AI");
      }

      // Finish progress bar smoothly
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      setProgress(100);

      setTimeout(() => {
        setResult(data.result || "");
        setLoadingAction(null);
        // Scroll response into view if needed
        requestAnimationFrame(() => {
          responseContainerRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        });
      }, 220);
    } catch (err: any) {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      setProgress(0);
      setLoadingAction(null);
      setError(err.message || "Не удалось получить ответ от AI");
    }
  };

  const handleCopyResult = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const ta = document.createElement("textarea");
      ta.value = result;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Helper to extract code from markdown block for "Apply Code"
  const extractCodeFromMarkdown = (text: string): string | null => {
    const match = text.match(/```(?:[a-zA-Z0-9_.-]+)?\n([\s\S]*?)```/);
    if (match && match[1]?.trim()) {
      return match[1].trim();
    }
    return null;
  };

  const extractedCode = result ? extractCodeFromMarkdown(result) : null;

  const handleApplyCode = () => {
    if (!extractedCode || !onApplyCode) return;
    onApplyCode(extractedCode);
    setApplied(true);
    setTimeout(() => setApplied(false), 2500);
  };

  const getStatusText = () => {
    if (progress < 35) return t("aiAssistantBlock.connecting");
    if (progress < 75) return t("aiAssistantBlock.analyzing");
    return t("aiAssistantBlock.generating");
  };

  const actionMeta = {
    explain: {
      label: t("aiAssistantBlock.explainBtn"),
      icon: Sparkles,
      color: "text-sky-400",
      activeBg: "bg-sky-500/10 border-sky-500/30 text-sky-300",
      hoverBg: "hover:bg-sky-500/10 hover:text-sky-300",
    },
    refactor: {
      label: t("aiAssistantBlock.refactorBtn"),
      icon: Wand2,
      color: "text-emerald-400",
      activeBg: "bg-emerald-500/10 border-emerald-500/30 text-emerald-300",
      hoverBg: "hover:bg-emerald-500/10 hover:text-emerald-300",
    },
    document: {
      label: t("aiAssistantBlock.documentBtn"),
      icon: FileText,
      color: "text-amber-400",
      activeBg: "bg-amber-500/10 border-amber-500/30 text-amber-300",
      hoverBg: "hover:bg-amber-500/10 hover:text-amber-300",
    },
  };

  return (
    <div
      className={`rounded-2xl border border-zinc-800/80 bg-zinc-950/70 backdrop-blur-md overflow-hidden transition-all duration-300 shadow-lg shadow-black/20 ${className}`}
    >
      {/* Action Buttons Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 sm:p-2.5 bg-zinc-900/50 border-b border-zinc-800/60">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
          {/* Action 1: Explain */}
          <button
            type="button"
            onClick={() => handleRunAction("explain")}
            disabled={Boolean(loadingAction) || !code?.trim()}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all disabled:opacity-40 active:scale-[0.98] ${
              activeAction === "explain" && !isCollapsed
                ? actionMeta.explain.activeBg
                : `border-zinc-800/70 bg-zinc-900/80 text-zinc-300 ${actionMeta.explain.hoverBg}`
            }`}
          >
            <Sparkles
              className={`w-3.5 h-3.5 ${actionMeta.explain.color} ${
                loadingAction === "explain" ? "animate-spin" : ""
              }`}
            />
            <span>{actionMeta.explain.label}</span>
          </button>

          {/* Action 2: Refactor */}
          <button
            type="button"
            onClick={() => handleRunAction("refactor")}
            disabled={Boolean(loadingAction) || !code?.trim()}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all disabled:opacity-40 active:scale-[0.98] ${
              activeAction === "refactor" && !isCollapsed
                ? actionMeta.refactor.activeBg
                : `border-zinc-800/70 bg-zinc-900/80 text-zinc-300 ${actionMeta.refactor.hoverBg}`
            }`}
          >
            <Wand2
              className={`w-3.5 h-3.5 ${actionMeta.refactor.color} ${
                loadingAction === "refactor" ? "animate-pulse" : ""
              }`}
            />
            <span>{actionMeta.refactor.label}</span>
          </button>

          {/* Action 3: Document */}
          <button
            type="button"
            onClick={() => handleRunAction("document")}
            disabled={Boolean(loadingAction) || !code?.trim()}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all disabled:opacity-40 active:scale-[0.98] ${
              activeAction === "document" && !isCollapsed
                ? actionMeta.document.activeBg
                : `border-zinc-800/70 bg-zinc-900/80 text-zinc-300 ${actionMeta.document.hoverBg}`
            }`}
          >
            <FileText className={`w-3.5 h-3.5 ${actionMeta.document.color}`} />
            <span>{actionMeta.document.label}</span>
          </button>
        </div>

        {/* Right side controls (when result exists) */}
        {(result || error) && !loadingAction && (
          <div className="flex items-center gap-1.5">
            {result && (
              <>
                {/* Apply Code to editor if available */}
                {onApplyCode && extractedCode && (
                  <button
                    type="button"
                    onClick={handleApplyCode}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 hover:bg-emerald-900/40 transition-colors"
                    title={t("aiAssistantBlock.applyCode")}
                  >
                    {applied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-300" />
                    ) : (
                      <ArrowRight className="w-3.5 h-3.5" />
                    )}
                    <span>{applied ? t("aiAssistantBlock.applied") : t("aiAssistantBlock.applyCode")}</span>
                  </button>
                )}

                {/* Copy result button */}
                <button
                  type="button"
                  onClick={handleCopyResult}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/70 transition-colors"
                  title={t("aiAssistantBlock.copyResult")}
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copied ? t("aiAssistantBlock.copied") : t("aiAssistantBlock.copyResult")}</span>
                </button>
              </>
            )}

            {/* Collapse / Expand toggle button */}
            <button
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/70 transition-colors"
              title={isCollapsed ? t("aiAssistantBlock.expand") : t("aiAssistantBlock.collapse")}
            >
              {isCollapsed ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronUp className="w-4 h-4" />
              )}
            </button>
          </div>
        )}
      </div>

      {/* Progress Bar (Visible while loading) */}
      {loadingAction && (
        <div className="p-3 space-y-2 animate-in fade-in duration-200">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400 font-medium flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-violet-400 animate-ping" />
              {getStatusText()}
            </span>
            <span className="font-mono text-zinc-500 text-[11px] font-semibold">{progress}%</span>
          </div>

          <div className="h-1.5 w-full rounded-full bg-zinc-900 border border-zinc-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 via-indigo-500 to-sky-400 transition-all duration-200 ease-out shadow-sm shadow-violet-500/50"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Response Box (Smooth expansion up to 20 lines, then scrolling) */}
      {!loadingAction && !isCollapsed && result && (
        <div
          ref={responseContainerRef}
          className="p-3.5 sm:p-4 text-xs sm:text-sm animate-in fade-in slide-in-from-top-1 duration-300 transition-all"
        >
          {/* Scrollable text container: max 20 lines (approx 440px / 28rem) */}
          <div className="max-h-[28rem] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-zinc-700/60 scrollbar-track-transparent">
            <MarkdownPreview content={result} />
          </div>
        </div>
      )}

      {/* Error state */}
      {!loadingAction && !isCollapsed && error && (
        <div className="p-3.5 flex items-start gap-2.5 text-xs text-rose-300 bg-rose-950/20 border-t border-rose-900/30 animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-2">
            <p className="leading-relaxed">{error}</p>
            {isKeyRequired && onOpenSettings && (
              <button
                type="button"
                onClick={onOpenSettings}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-900/40 hover:bg-rose-800/40 border border-rose-700/50 text-white font-medium text-xs transition-colors"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>{t("aiAssistantBlock.openSettings")}</span>
              </button>
            )}
            {!isKeyRequired && activeAction && (
              <button
                type="button"
                onClick={() => handleRunAction(activeAction)}
                className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition-colors"
              >
                <RotateCw className="w-3 h-3" />
                <span>{t("aiAssistantBlock.retry")}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
