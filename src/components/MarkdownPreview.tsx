"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownPreviewProps {
  content: string;
  className?: string;
}

export function MarkdownPreview({ content, className = "" }: MarkdownPreviewProps) {
  if (!content || !content.trim()) {
    return null;
  }

  return (
    <div
      className={`prose prose-invert prose-sm max-w-none text-zinc-300 leading-relaxed break-words
        [&_h1]:text-base [&_h1]:font-bold [&_h1]:text-zinc-100 [&_h1]:mb-2 [&_h1]:mt-3
        [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-zinc-100 [&_h2]:mb-1.5 [&_h2]:mt-2.5
        [&_h3]:text-xs [&_h3]:font-semibold [&_h3]:text-zinc-200 [&_h3]:mb-1 [&_h3]:mt-2
        [&_p]:mb-2 [&_p]:last:mb-0
        [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-2 [&_ul]:space-y-1
        [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-2 [&_ol]:space-y-1
        [&_li]:text-zinc-300
        [&_a]:text-violet-400 [&_a]:underline [&_a]:hover:text-violet-300 [&_a]:transition-colors
        [&_blockquote]:border-l-2 [&_blockquote]:border-violet-500/60 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-zinc-400 [&_blockquote]:my-2
        [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:bg-zinc-800/80 [&_code]:text-violet-300 [&_code]:font-mono [&_code]:text-[11px] sm:[&_code]:text-xs
        [&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:bg-zinc-950 [&_pre]:border [&_pre]:border-zinc-800 [&_pre]:overflow-x-auto [&_pre]:my-2
        [&_table]:w-full [&_table]:border-collapse [&_table]:my-2 [&_table]:text-xs
        [&_th]:border [&_th]:border-zinc-800 [&_th]:bg-zinc-900/80 [&_th]:px-2.5 [&_th]:py-1.5 [&_th]:text-left [&_th]:font-semibold [&_th]:text-zinc-200
        [&_td]:border [&_td]:border-zinc-800/80 [&_td]:px-2.5 [&_td]:py-1.5 [&_td]:text-zinc-300
        [&_hr]:border-zinc-800 [&_hr]:my-3
        [&_input[type="checkbox"]]:mr-1.5 [&_input[type="checkbox"]]:accent-violet-600
        ${className}
      `}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
