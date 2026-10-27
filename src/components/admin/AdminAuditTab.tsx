"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Activity,
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock,
  Download,
  FileJson,
  FileSpreadsheet,
  Filter,
  Globe,
  Loader2,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  Trash2,
  User,
  X,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";

export interface AuditLogItem {
  id: string;
  event: string;
  category: "AUTH" | "SECURITY" | "ADMIN" | "API" | string;
  status: "SUCCESS" | "FAILURE" | "WARNING" | "INFO" | string;
  actorId: string | null;
  actorEmail: string | null;
  targetId: string | null;
  targetEmail: string | null;
  ip: string | null;
  userAgent: string | null;
  details: string | null;
  createdAt: string;
}

interface AdminAuditTabProps {
  showFeedback: (text: string, type?: "success" | "error") => void;
}

export function AdminAuditTab({ showFeedback }: AdminAuditTabProps) {
  const { t, locale } = useI18n();

  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({
    ALL: 0,
    AUTH: 0,
    ADMIN: 0,
    SECURITY: 0,
    FAILURE: 0,
  });
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [clearing, setClearing] = useState(false);
  const [exporting, setExporting] = useState<"csv" | "json" | null>(null);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      if (categoryFilter !== "ALL") {
        if (categoryFilter === "FAILURE") {
          params.set("status", "FAILURE");
        } else {
          params.set("category", categoryFilter);
        }
      }

      const res = await fetch(`/api/admin/audit-logs?${params.toString()}`);
      const data = await res.json();

      if (res.ok && data.success) {
        setLogs(data.logs || []);
        if (data.counts) setCounts(data.counts);
      } else {
        throw new Error(data.error || "Failed to load audit logs");
      }
    } catch (err: any) {
      console.error("Audit load error:", err);
      showFeedback(err.message || t("admin.loadError"), "error");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, categoryFilter, showFeedback, t]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadLogs();
    }, 250);
    return () => clearTimeout(timer);
  }, [loadLogs]);

  const handleClearLogs = async () => {
    if (!confirm(t("admin.auditConfirmClear"))) return;
    setClearing(true);
    try {
      const res = await fetch("/api/admin/audit-logs", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to clear logs");
      }
      showFeedback(t("admin.auditClearedFeedback"));
      loadLogs();
    } catch (err: any) {
      showFeedback(err.message || "Failed to clear logs", "error");
    } finally {
      setClearing(false);
    }
  };

  const handleExport = async (format: "csv" | "json") => {
    setExporting(format);
    try {
      const res = await fetch(`/api/admin/audit-logs/export?format=${format}`);
      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showFeedback(format === "csv" ? "CSV скачан" : "JSON скачан");
    } catch (err: any) {
      showFeedback(err.message || "Failed to export", "error");
    } finally {
      setExporting(null);
    }
  };

  const getEventBadge = (event: string, status: string) => {
    const isFail = status === "FAILURE";
    if (isFail) {
      return {
        bg: "bg-rose-500/15 border-rose-500/30 text-rose-300",
        icon: <ShieldAlert className="w-3 h-3 text-rose-400" />,
      };
    }
    if (event.startsWith("AUTH_")) {
      return {
        bg: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300",
        icon: <CheckCircle className="w-3 h-3 text-emerald-400" />,
      };
    }
    if (event.startsWith("TOKEN_")) {
      return {
        bg: "bg-amber-500/15 border-amber-500/30 text-amber-300",
        icon: <Activity className="w-3 h-3 text-amber-400" />,
      };
    }
    if (event.startsWith("ADMIN_") || event.startsWith("SETTINGS_")) {
      return {
        bg: "bg-violet-500/15 border-violet-500/30 text-violet-300",
        icon: <ShieldCheck className="w-3 h-3 text-violet-400" />,
      };
    }
    return {
      bg: "bg-zinc-800/80 border-zinc-700/80 text-zinc-300",
      icon: <Shield className="w-3 h-3 text-zinc-400" />,
    };
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Header card with action buttons */}
      <div className="p-4 sm:p-5 rounded-2xl border border-zinc-800 bg-zinc-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-violet-400" />
              <span>{t("admin.auditTitle")}</span>
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700/50">
              {counts.ALL || logs.length} {t("common.entries") || "записей"}
            </span>
          </div>
          <p className="text-xs text-zinc-400">{t("admin.auditSubtitle")}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => handleExport("csv")}
            disabled={exporting !== null}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-xs font-medium text-zinc-300 hover:text-white transition-all cursor-pointer"
          >
            {exporting === "csv" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
            ) : (
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span>CSV</span>
          </button>

          <button
            type="button"
            onClick={() => handleExport("json")}
            disabled={exporting !== null}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-xs font-medium text-zinc-300 hover:text-white transition-all cursor-pointer"
          >
            {exporting === "json" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
            ) : (
              <FileJson className="w-3.5 h-3.5 text-sky-400" />
            )}
            <span>JSON</span>
          </button>

          <button
            type="button"
            onClick={handleClearLogs}
            disabled={clearing || logs.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-900/50 bg-rose-950/30 hover:bg-rose-900/40 text-xs font-medium text-rose-300 hover:text-rose-200 disabled:opacity-40 transition-all cursor-pointer"
            title={t("admin.auditClearBtn")}
          >
            {clearing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" />
            ) : (
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            )}
            <span className="hidden sm:inline">{t("admin.auditClearBtn")}</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("admin.auditSearchPlaceholder")}
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-zinc-900/70 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
          {[
            { id: "ALL", label: t("admin.auditFilterAll"), count: counts.ALL },
            { id: "AUTH", label: t("admin.auditFilterAuth"), count: counts.AUTH },
            { id: "ADMIN", label: t("admin.auditFilterAdmin"), count: counts.ADMIN },
            { id: "SECURITY", label: t("admin.auditFilterSecurity"), count: counts.SECURITY },
            { id: "FAILURE", label: t("admin.auditFilterFailure"), count: counts.FAILURE },
          ].map((cat) => {
            const active = categoryFilter === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryFilter(cat.id)}
                className={`px-3 py-1.5 rounded-xl border font-medium text-[11px] whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  active
                    ? cat.id === "FAILURE"
                      ? "bg-rose-600/20 border-rose-500/40 text-rose-200 font-semibold"
                      : "bg-violet-600/20 border-violet-500/40 text-violet-200 font-semibold"
                    : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
                }`}
              >
                <span>{cat.label}</span>
                {cat.count !== undefined && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      active
                        ? cat.id === "FAILURE"
                          ? "bg-rose-500/30 text-rose-100"
                          : "bg-violet-500/30 text-violet-100"
                        : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {cat.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Logs Feed */}
      <div className="space-y-2">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-14 text-zinc-400 space-y-2">
            <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
            <span className="text-xs">{t("common.loading") || "Загрузка..."}</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-zinc-500 space-y-2 border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/20">
            <Shield className="w-8 h-8 text-zinc-600" />
            <p className="text-xs font-medium">{t("admin.auditEmpty")}</p>
          </div>
        ) : (
          logs.map((log) => {
            const badge = getEventBadge(log.event, log.status);
            const dateObj = new Date(log.createdAt);
            const formattedTime = dateObj.toLocaleTimeString(locale === "ru" ? "ru-RU" : "en-US", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            });
            const formattedDate = dateObj.toLocaleDateString(locale === "ru" ? "ru-RU" : "en-US", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            });

            return (
              <div
                key={log.id}
                className="p-3 sm:p-3.5 rounded-xl border border-zinc-850 bg-zinc-900/50 hover:bg-zinc-900/80 transition-all space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold border ${badge.bg}`}
                    >
                      {badge.icon}
                      <span>{log.event}</span>
                    </span>

                    <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/50">
                      {log.category}
                    </span>

                    {log.status === "FAILURE" && (
                      <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-rose-950/60 text-rose-300 border border-rose-800/60">
                        FAILURE
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-mono">
                    <Clock className="w-3 h-3 text-zinc-500" />
                    <span>{formattedDate} {formattedTime}</span>
                  </div>
                </div>

                {/* Details line */}
                {log.details && (
                  <p className="text-xs text-zinc-200 leading-relaxed font-sans">{log.details}</p>
                )}

                {/* Actor, Target, IP, User Agent footer */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-zinc-400 pt-1 border-t border-zinc-800/60 font-mono">
                  {log.actorEmail ? (
                    <div className="flex items-center gap-1.5">
                      <User className="w-3 h-3 text-zinc-500" />
                      <span className="text-zinc-500">Actor:</span>
                      <span className="text-zinc-300">{log.actorEmail}</span>
                    </div>
                  ) : (
                    <span className="text-zinc-500">Actor: System</span>
                  )}

                  {log.targetEmail && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-zinc-500">Target:</span>
                      <span className="text-violet-300">{log.targetEmail}</span>
                    </div>
                  )}

                  {log.ip && (
                    <div className="flex items-center gap-1 text-zinc-500">
                      <Globe className="w-3 h-3" />
                      <span>{log.ip}</span>
                    </div>
                  )}

                  {log.userAgent && (
                    <div className="text-zinc-500 truncate max-w-[220px]" title={log.userAgent}>
                      UA: {log.userAgent}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
