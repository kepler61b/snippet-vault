"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  Square,
  RotateCcw,
  Terminal,
  Eye,
  Copy,
  Check,
  X,
  Loader2,
  Clock,
  AlertCircle,
  FileCode,
} from "lucide-react";
import { SnippetFileItem } from "@/types/snippet";
import { useI18n } from "@/lib/i18n";

interface CodePlaygroundModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: SnippetFileItem[];
  initialFileIndex?: number;
}

interface OutputLog {
  type: "log" | "error" | "warn" | "info";
  message: string;
  timestamp: string;
}

export function CodePlaygroundModal({
  isOpen,
  onClose,
  files,
  initialFileIndex = 0,
}: CodePlaygroundModalProps) {
  const { t } = useI18n();
  const [activeFileIndex, setActiveFileIndex] = useState(initialFileIndex);
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<OutputLog[]>([]);
  const [activeTab, setActiveTab] = useState<"console" | "preview">("console");
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [hasError, setHasError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pyodideLoading, setPyodideLoading] = useState(false);

  const previewIframeRef = useRef<HTMLIFrameElement>(null);
  const pyodideRef = useRef<any>(null);

  const activeFile = files[activeFileIndex] || files[0] || {
    filename: "snippet.js",
    language: "javascript",
    content: "",
  };

  const isWebTech =
    activeFile.language === "html" ||
    activeFile.language === "css" ||
    files.some((f) => f.language === "html");

  const isPython =
    activeFile.language === "python" || activeFile.language === "py";

  const isJsOrTs =
    activeFile.language === "javascript" ||
    activeFile.language === "typescript" ||
    activeFile.language === "js" ||
    activeFile.language === "ts";

  useEffect(() => {
    setActiveFileIndex(initialFileIndex);
    setLogs([]);
    setExecutionTime(null);
    setHasError(false);
    if (isWebTech) {
      setActiveTab("preview");
    } else {
      setActiveTab("console");
    }
  }, [isOpen, initialFileIndex]);

  // Load and cache Pyodide for Python runner
  const initPyodide = async () => {
    if (pyodideRef.current) return pyodideRef.current;
    setPyodideLoading(true);

    return new Promise((resolve, reject) => {
      // Check if pyodide script already injected
      if ((window as any).loadPyodide) {
        (window as any)
          .loadPyodide({
            indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/",
          })
          .then((py: any) => {
            pyodideRef.current = py;
            setPyodideLoading(false);
            resolve(py);
          })
          .catch((err: any) => {
            setPyodideLoading(false);
            reject(err);
          });
        return;
      }

      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js";
      script.async = true;
      script.onload = async () => {
        try {
          const py = await (window as any).loadPyodide({
            indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/",
          });
          pyodideRef.current = py;
          setPyodideLoading(false);
          resolve(py);
        } catch (e) {
          setPyodideLoading(false);
          reject(e);
        }
      };
      script.onerror = () => {
        setPyodideLoading(false);
        reject(new Error("Не удалось загрузить Pyodide WebAssembly runtime"));
      };
      document.body.appendChild(script);
    });
  };

  const handleRun = async () => {
    setIsRunning(true);
    setLogs([]);
    setHasError(false);
    const startTime = performance.now();

    // 1. Web Preview (HTML / CSS / JS)
    if (isWebTech || activeTab === "preview") {
      const htmlFile = files.find((f) => f.language === "html") || activeFile;
      const cssFiles = files.filter((f) => f.language === "css");
      const jsFiles = files.filter(
        (f) => f.language === "javascript" || f.language === "typescript"
      );

      const combinedHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 16px; margin: 0; background: #fff; color: #111; }
              ${cssFiles.map((f) => f.content).join("\n")}
            </style>
          </head>
          <body>
            ${htmlFile.language === "html" ? htmlFile.content : `<pre>${htmlFile.content}</pre>`}
            <script>
              window.onerror = function(msg, url, line) {
                window.parent.postMessage({ type: 'CONSOLE_LOG', level: 'error', message: msg + ' (line ' + line + ')' }, '*');
              };
              ['log', 'warn', 'error', 'info'].forEach(function(lvl) {
                var old = console[lvl];
                console[lvl] = function() {
                  var args = Array.prototype.slice.call(arguments).map(function(a) {
                    try { return typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a); } catch(e) { return String(a); }
                  });
                  window.parent.postMessage({ type: 'CONSOLE_LOG', level: lvl, message: args.join(' ') }, '*');
                  old.apply(console, arguments);
                };
              });
              ${jsFiles.map((f) => f.content).join("\n")}
            <\/script>
          </body>
        </html>
      `;

      if (previewIframeRef.current) {
        previewIframeRef.current.srcdoc = combinedHtml;
      }
      setExecutionTime(Math.round(performance.now() - startTime));
      setIsRunning(false);
      return;
    }

    // 2. Python (Pyodide in WebAssembly)
    if (isPython) {
      try {
        const py = await initPyodide();
        const collectedLogs: OutputLog[] = [];

        // Setup stdout/stderr redirection
        py.setStdout({
          batched: (text: string) => {
            collectedLogs.push({
              type: "log",
              message: text,
              timestamp: new Date().toLocaleTimeString(),
            });
          },
        });
        py.setStderr({
          batched: (text: string) => {
            collectedLogs.push({
              type: "error",
              message: text,
              timestamp: new Date().toLocaleTimeString(),
            });
          },
        });

        await py.runPythonAsync(activeFile.content);

        setLogs(collectedLogs);
        setExecutionTime(Math.round(performance.now() - startTime));
      } catch (err: any) {
        setHasError(true);
        setLogs((prev) => [
          ...prev,
          {
            type: "error",
            message: err.message || String(err),
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);
        setExecutionTime(Math.round(performance.now() - startTime));
      } finally {
        setIsRunning(false);
      }
      return;
    }

    // 3. JavaScript / TypeScript Execution
    if (isJsOrTs) {
      const outputLogs: OutputLog[] = [];

      try {
        // Strip TypeScript types or run as JS
        let runnableCode = activeFile.content;

        // Custom sandbox console
        const sandboxConsole = {
          log: (...args: any[]) => {
            outputLogs.push({
              type: "log",
              message: args.map(formatArg).join(" "),
              timestamp: new Date().toLocaleTimeString(),
            });
          },
          error: (...args: any[]) => {
            outputLogs.push({
              type: "error",
              message: args.map(formatArg).join(" "),
              timestamp: new Date().toLocaleTimeString(),
            });
          },
          warn: (...args: any[]) => {
            outputLogs.push({
              type: "warn",
              message: args.map(formatArg).join(" "),
              timestamp: new Date().toLocaleTimeString(),
            });
          },
          info: (...args: any[]) => {
            outputLogs.push({
              type: "info",
              message: args.map(formatArg).join(" "),
              timestamp: new Date().toLocaleTimeString(),
            });
          },
        };

        // Execute in isolated function context
        const runFn = new Function("console", `"use strict";\n${runnableCode}`);
        const result = runFn(sandboxConsole);

        if (result !== undefined && outputLogs.length === 0) {
          outputLogs.push({
            type: "info",
            message: `<- ${formatArg(result)}`,
            timestamp: new Date().toLocaleTimeString(),
          });
        }

        setLogs(outputLogs);
        setExecutionTime(Math.round(performance.now() - startTime));
      } catch (err: any) {
        setHasError(true);
        outputLogs.push({
          type: "error",
          message: `${err.name || "Error"}: ${err.message}`,
          timestamp: new Date().toLocaleTimeString(),
        });
        setLogs(outputLogs);
        setExecutionTime(Math.round(performance.now() - startTime));
      } finally {
        setIsRunning(false);
      }
      return;
    }

    // 4. Other languages: informational note
    setLogs([
      {
        type: "info",
        message: `Язык "${activeFile.language}" не поддерживает выполнение в браузере. Поддерживаются JavaScript, TypeScript, HTML/CSS и Python.`,
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);
    setIsRunning(false);
  };

  const formatArg = (arg: any): string => {
    if (arg === null) return "null";
    if (arg === undefined) return "undefined";
    if (typeof arg === "object") {
      try {
        return JSON.stringify(arg, null, 2);
      } catch {
        return String(arg);
      }
    }
    return String(arg);
  };

  const handleCopyLogs = async () => {
    try {
      const text = logs.map((l) => `[${l.timestamp}] [${l.type.toUpperCase()}] ${l.message}`).join("\n");
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 lg:p-6 bg-black/80 backdrop-blur-sm animate-modal-backdrop">
      <div className="relative flex flex-col w-full max-w-4xl h-[100dvh] sm:h-auto max-h-[100dvh] sm:max-h-[88vh] rounded-none sm:rounded-2xl border-0 sm:border border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden animate-modal-content safe-top">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-zinc-800 bg-zinc-900/80">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-violet-600/20 text-violet-400 border border-violet-500/30">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>Песочница кода</span>
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
                  {activeFile.language}
                </span>
              </h2>
              <p className="text-[11px] text-zinc-400 truncate">
                JS, TS, HTML/CSS и Python прямо в браузере
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRun}
              disabled={isRunning || pyodideLoading}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-md shadow-emerald-600/20 active:scale-95 transition-all disabled:opacity-50"
            >
              {isRunning || pyodideLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4 fill-white" />
              )}
              <span>
                {pyodideLoading
                  ? "Загрузка Python..."
                  : isRunning
                  ? "Выполняется..."
                  : "Запустить"}
              </span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* File Tabs & Runner Mode Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 border-b border-zinc-800 bg-zinc-950/60 text-xs">
          {/* Files Selector */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
            {files.map((file, idx) => (
              <button
                key={file.id || idx}
                onClick={() => {
                  setActiveFileIndex(idx);
                  setLogs([]);
                  setExecutionTime(null);
                }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all shrink-0 ${
                  activeFileIndex === idx
                    ? "bg-zinc-800 text-white border border-zinc-700"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
                }`}
              >
                <FileCode className="w-3.5 h-3.5 text-zinc-500" />
                <span>{file.filename}</span>
              </button>
            ))}
          </div>

          {/* Console / Preview Tab Buttons */}
          <div className="flex items-center p-0.5 rounded-lg bg-zinc-900 border border-zinc-800 shrink-0">
            <button
              onClick={() => setActiveTab("console")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                activeTab === "console"
                  ? "bg-zinc-800 text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Консоль</span>
            </button>
            {isWebTech && (
              <button
                onClick={() => {
                  setActiveTab("preview");
                  handleRun();
                }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  activeTab === "preview"
                    ? "bg-zinc-800 text-white shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Превью</span>
              </button>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 min-h-[300px] sm:min-h-[400px] max-h-[55vh] flex flex-col bg-zinc-950 overflow-hidden font-mono text-xs">
          {activeTab === "preview" && isWebTech ? (
            <div className="relative w-full h-full bg-white flex-1 min-h-[340px]">
              <iframe
                ref={previewIframeRef}
                title="Preview"
                sandbox="allow-scripts allow-modals"
                className="w-full h-full border-0 min-h-[340px]"
              />
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Terminal Logs */}
              <div className="flex-1 p-3 sm:p-4 overflow-y-auto space-y-1.5 font-mono text-xs select-text">
                {logs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-zinc-500 py-12 text-center">
                    <Terminal className="w-8 h-8 mb-2 opacity-40 text-zinc-400" />
                    <p className="text-zinc-400 font-medium">Консоль чиста</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      Нажмите «Запустить», чтобы выполнить код и увидеть результат
                    </p>
                  </div>
                ) : (
                  logs.map((log, i) => (
                    <div
                      key={i}
                      className={`flex items-start gap-2.5 p-2 rounded-lg border leading-relaxed break-all ${
                        log.type === "error"
                          ? "bg-rose-950/20 text-rose-300 border-rose-900/30"
                          : log.type === "warn"
                          ? "bg-amber-950/20 text-amber-300 border-amber-900/30"
                          : log.type === "info"
                          ? "bg-sky-950/20 text-sky-300 border-sky-900/30"
                          : "bg-zinc-900/40 text-zinc-200 border-zinc-800/40"
                      }`}
                    >
                      <span className="text-[10px] text-zinc-500 select-none shrink-0 pt-0.5">
                        {log.timestamp}
                      </span>
                      <pre className="flex-1 whitespace-pre-wrap font-mono text-xs">
                        {log.message}
                      </pre>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer with stats & actions */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-zinc-800 bg-zinc-900/70 text-xs">
          <div className="flex items-center gap-3 text-zinc-400 text-[11px]">
            {executionTime !== null && (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-zinc-500" />
                <span>Время: <strong className="text-zinc-200">{executionTime} мс</strong></span>
              </span>
            )}
            {hasError ? (
              <span className="flex items-center gap-1 text-rose-400 font-medium">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Ошибка выполнения</span>
              </span>
            ) : executionTime !== null ? (
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <Check className="w-3.5 h-3.5" />
                <span>Успешно</span>
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            {logs.length > 0 && (
              <>
                <button
                  onClick={handleCopyLogs}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copied ? "Скопировано" : "Копировать"}</span>
                </button>
                <button
                  onClick={() => setLogs([])}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Очистить</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
