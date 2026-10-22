"use client";

import React, { useMemo } from "react";
import { diffLines, Change } from "diff";
import { Plus, Minus, FileCode } from "lucide-react";

interface DiffViewerProps {
  oldContent: string;
  newContent: string;
  filename?: string;
  className?: string;
}

interface DiffLineItem {
  type: "added" | "removed" | "unchanged";
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export function DiffViewer({
  oldContent,
  newContent,
  filename,
  className = "",
}: DiffViewerProps) {
  const { lines, additions, deletions } = useMemo(() => {
    const changes: Change[] = diffLines(oldContent || "", newContent || "");
    const result: DiffLineItem[] = [];

    let oldLine = 1;
    let newLine = 1;
    let adds = 0;
    let dels = 0;

    changes.forEach((change) => {
      // Split into individual lines while preserving empty lines
      const changeLines = change.value.replace(/\r\n/g, "\n").split("\n");
      // Remove trailing empty string from split if change ends in newline
      if (changeLines.length > 0 && changeLines[changeLines.length - 1] === "") {
        changeLines.pop();
      }

      changeLines.forEach((lineText) => {
        if (change.added) {
          adds++;
          result.push({
            type: "added",
            content: lineText,
            newLineNumber: newLine++,
          });
        } else if (change.removed) {
          dels++;
          result.push({
            type: "removed",
            content: lineText,
            oldLineNumber: oldLine++,
          });
        } else {
          result.push({
            type: "unchanged",
            content: lineText,
            oldLineNumber: oldLine++,
            newLineNumber: newLine++,
          });
        }
      });
    });

    return { lines: result, additions: adds, deletions: dels };
  }, [oldContent, newContent]);

  return (
    <div className={`rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden font-mono text-xs ${className}`}>
      {/* File Header & Stats */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 bg-zinc-900/80 border-b border-zinc-800/80 text-zinc-300">
        <div className="flex items-center gap-2 min-w-0">
          <FileCode className="w-4 h-4 text-zinc-500 shrink-0" />
          <span className="font-semibold text-zinc-200 truncate text-xs">{filename || "diff"}</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-semibold shrink-0">
          <span className="text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800/50">
            +{additions}
          </span>
          <span className="text-rose-400 bg-rose-950/50 px-2 py-0.5 rounded border border-rose-800/50">
            -{deletions}
          </span>
        </div>
      </div>

      {/* Diff Table */}
      <div className="overflow-x-auto max-h-[380px] sm:max-h-[440px] overflow-y-auto">
        <table className="w-full border-collapse font-mono text-[11px] sm:text-xs">
          <tbody>
            {lines.length === 0 ? (
              <tr>
                <td className="p-4 text-center text-zinc-500 italic">Файлы идентичны</td>
              </tr>
            ) : (
              lines.map((item, idx) => {
                const isAdded = item.type === "added";
                const isRemoved = item.type === "removed";

                return (
                  <tr
                    key={idx}
                    className={`leading-5 transition-colors ${
                      isAdded
                        ? "bg-emerald-950/30 text-emerald-200 hover:bg-emerald-950/40"
                        : isRemoved
                        ? "bg-rose-950/30 text-rose-200 hover:bg-rose-950/40"
                        : "text-zinc-400 hover:bg-zinc-900/40"
                    }`}
                  >
                    {/* Old line number */}
                    <td className="w-10 sm:w-12 select-none px-2 text-right text-[10px] text-zinc-600 border-r border-zinc-800/50">
                      {item.oldLineNumber || ""}
                    </td>

                    {/* New line number */}
                    <td className="w-10 sm:w-12 select-none px-2 text-right text-[10px] text-zinc-600 border-r border-zinc-800/50">
                      {item.newLineNumber || ""}
                    </td>

                    {/* Diff Marker (+, -, space) */}
                    <td className="w-6 select-none px-1.5 text-center font-bold">
                      {isAdded ? (
                        <span className="text-emerald-400">+</span>
                      ) : isRemoved ? (
                        <span className="text-rose-400">-</span>
                      ) : (
                        <span className="text-zinc-600"> </span>
                      )}
                    </td>

                    {/* Code Content */}
                    <td className="px-2 py-0.5 whitespace-pre break-all">
                      {item.content || "\n"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
