"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Check,
  Code2,
  Copy,
  Download,
  FileCode,
  Share2,
  Terminal,
} from "lucide-react";
import { SnippetItem } from "@/types/snippet";
import { CodeBlock } from "@/components/CodeBlock";
import { getLanguageMeta } from "@/lib/languages";

interface SharedSnippetClientProps {
  snippet: SnippetItem;
}

export function SharedSnippetClient({ snippet }: SharedSnippetClientProps) {
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);

  const currentFile = snippet.files[activeFileIndex] || snippet.files[0];
  const tagList = snippet.tags
    ? snippet.tags.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopyAsMarkdown = async () => {
    if (!currentFile) return;
    try {
      const md = `\`\`\`${currentFile.language}\n// ${currentFile.filename}\n${currentFile.content}\n\`\`\``;
      await navigator.clipboard.writeText(md);
      setCopiedMarkdown(true);
      setTimeout(() => setCopiedMarkdown(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownload = () => {
    if (!currentFile) return;
    const blob = new Blob([currentFile.content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = currentFile.filename || "snippet.txt";
    link.click();
    URL.revokeObjectURL(url);
  };

  const formattedDate = new Date(snippet.createdAt).toLocaleDateString("ru-RU", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Navbar */}
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-30 safe-top">
        <div className="max-w-5xl mx-auto px-3.5 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2">
          <Link href="/" className="flex items-center gap-2 sm:gap-2.5 group min-w-0">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-600 text-white shadow-md shadow-indigo-500/20 shrink-0">
              <Terminal className="w-4 h-4" />
            </div>
            <span className="font-bold text-sm sm:text-base tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent group-hover:from-white group-hover:to-zinc-200 transition-all truncate">
              SnippetVault
            </span>
          </Link>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-medium bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white transition-all min-h-[34px]"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Скопировано!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Поделиться</span>
                </>
              )}
            </button>
            <Link
              href="/"
              className="px-3 py-1.5 sm:py-2 rounded-xl text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 transition-all min-h-[34px] flex items-center"
            >
              В сервис
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-3.5 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
        {/* Header Info */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">
              <Share2 className="w-3 h-3" />
              Доступ по секретной ссылке
            </span>
          </div>

          <h1 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight break-words">
            {snippet.title}
          </h1>

          {snippet.description && (
            <p className="text-sm text-zinc-400 leading-relaxed max-w-3xl">
              {snippet.description}
            </p>
          )}

          <div className="flex items-center gap-4 text-xs text-zinc-500 pt-1">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {formattedDate}
            </span>
            <span className="flex items-center gap-1">
              <Code2 className="w-3.5 h-3.5" />
              {snippet.files.length} {snippet.files.length === 1 ? "файл" : "файлов"}
            </span>
          </div>

          {tagList.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-2">
              {tagList.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Code Box */}
        <div className="border border-zinc-800 rounded-2xl overflow-hidden bg-zinc-950 shadow-2xl">
          {/* File Tabs */}
          <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/80 px-2 overflow-x-auto">
            <div className="flex items-center gap-1 py-1">
              {snippet.files.map((file, idx) => {
                const meta = getLanguageMeta(file.language);
                return (
                  <button
                    key={idx}
                    onClick={() => setActiveFileIndex(idx)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      activeFileIndex === idx
                        ? "bg-zinc-800 text-white shadow-sm border border-zinc-700/60"
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: meta.color }}
                    />
                    <span>{file.filename}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-1.5 py-1">
              <button
                onClick={handleCopyAsMarkdown}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-zinc-300 hover:bg-zinc-800 transition-colors"
                title="Скопировать как Markdown"
              >
                {copiedMarkdown ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span className="hidden sm:inline">Markdown</span>
              </button>

              <button
                onClick={handleDownload}
                className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                title="Скачать файл"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Syntax Highlighted Code */}
          {currentFile && (
            <CodeBlock
              code={currentFile.content}
              language={currentFile.language}
              className="border-none rounded-none"
            />
          )}
        </div>
      </main>
    </div>
  );
}
