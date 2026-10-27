"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Activity,
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock,
  Cpu,
  Database,
  Download,
  HardDrive,
  KeyRound,
  Laptop,
  Loader2,
  RefreshCw,
  Save,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  Users,
  Zap,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";

export interface SystemStats {
  totalUsers: number;
  adminUsers: number;
  bannedUsers: number;
  totalSnippets: number;
  totalCollections: number;
  totalTokens: number;
  activeTokens: number;
  expiredTokens: number;
  totalIntegrationLogs: number;
  vsCodeCalls: number;
  curlCalls: number;
  integrationErrors: number;
}

export interface SystemHealth {
  dbFileSize: number;
  dbFileSizeFormatted: string;
  freelistBytes: number;
  freelistFormatted: string;
  pageCount: number;
  pageSize: number;
  journalMode: string;
  integrity: string;
  lastModified: string | null;
  uptimeSeconds: number;
  memoryRss: number;
  memoryRssFormatted: string;
  nodeVersion: string;
  platform: string;
}

interface AdminSystemTabProps {
  stats: SystemStats | null;
  showFeedback: (text: string, type?: "success" | "error") => void;
  onRefreshData?: () => void;
}

export function AdminSystemTab({ stats, showFeedback, onRefreshData }: AdminSystemTabProps) {
  const { t } = useI18n();

  // Health state
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [runningVacuum, setRunningVacuum] = useState(false);
  const [downloadingBackup, setDownloadingBackup] = useState(false);

  // PAT Policies state
  const [patDenyNeverExpires, setPatDenyNeverExpires] = useState(false);
  const [patMaxDays, setPatMaxDays] = useState(0);
  const [savingPolicies, setSavingPolicies] = useState(false);

  // Load health & settings
  const loadHealthAndSettings = useCallback(async () => {
    setLoadingHealth(true);
    try {
      const [healthRes, settingsRes] = await Promise.all([
        fetch("/api/admin/system/health"),
        fetch("/api/admin/settings"),
      ]);

      const [healthData, settingsData] = await Promise.all([
        healthRes.json(),
        settingsRes.json(),
      ]);

      if (healthRes.ok && healthData.success) {
        setHealth(healthData.health);
      }
      if (settingsRes.ok && settingsData.success && settingsData.settings) {
        setPatDenyNeverExpires(Boolean(settingsData.settings.patDenyNeverExpires));
        setPatMaxDays(Number(settingsData.settings.patMaxDays) || 0);
      }
    } catch (err: any) {
      console.error("Load system health error:", err);
      showFeedback(err.message || t("admin.loadError"), "error");
    } finally {
      setLoadingHealth(false);
    }
  }, [showFeedback, t]);

  useEffect(() => {
    loadHealthAndSettings();
  }, [loadHealthAndSettings]);

  // Run VACUUM
  const handleRunVacuum = async () => {
    setRunningVacuum(true);
    try {
      const res = await fetch("/api/admin/system/vacuum", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "VACUUM failed");
      }
      showFeedback(t("admin.vacuumSuccess"));
      loadHealthAndSettings();
    } catch (err: any) {
      showFeedback(err.message || "VACUUM error", "error");
    } finally {
      setRunningVacuum(false);
    }
  };

  // Download Backup
  const handleDownloadBackup = async () => {
    setDownloadingBackup(true);
    try {
      const res = await fetch("/api/admin/system/backup");
      if (!res.ok) throw new Error("Backup download failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `snippetvault-backup-${new Date().toISOString().slice(0, 10)}.sqlite`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showFeedback("Бэкап базы данных успешно скачан");
    } catch (err: any) {
      showFeedback(err.message || "Backup error", "error");
    } finally {
      setDownloadingBackup(false);
    }
  };

  // Save PAT Policies
  const handleSavePolicies = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPolicies(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patDenyNeverExpires,
          patMaxDays,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save policies");
      }

      showFeedback(t("admin.policiesSaved"));
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      showFeedback(err.message || "Save error", "error");
    } finally {
      setSavingPolicies(false);
    }
  };

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0 || d > 0) parts.push(`${h}h`);
    parts.push(`${m}m`);
    return parts.join(" ");
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* CARD 1: DATABASE & SYSTEM HEALTH (ITEM 3) */}
      <div className="p-4 sm:p-5 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-400" />
              <span>{t("admin.systemHealthTitle")}</span>
            </h3>
            <p className="text-[11px] text-zinc-400">
              SQLite WAL Storage Engine • PRAGMA Integrity & Page Stats
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleRunVacuum}
              disabled={runningVacuum}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-900/50 bg-emerald-950/30 hover:bg-emerald-900/40 text-xs font-medium text-emerald-300 hover:text-emerald-200 transition-all cursor-pointer"
              title={t("admin.vacuumDesc")}
            >
              {runningVacuum ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
              ) : (
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
              )}
              <span>{t("admin.vacuumBtn")}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadBackup}
              disabled={downloadingBackup}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-sky-900/50 bg-sky-950/30 hover:bg-sky-900/40 text-xs font-medium text-sky-300 hover:text-sky-200 transition-all cursor-pointer"
              title={t("admin.backupDesc")}
            >
              {downloadingBackup ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
              ) : (
                <Download className="w-3.5 h-3.5 text-sky-400" />
              )}
              <span>{t("admin.backupBtn")}</span>
            </button>
          </div>
        </div>

        {health ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            {/* DB Size */}
            <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-0.5">
              <div className="text-zinc-500 text-[11px] font-medium flex items-center gap-1">
                <HardDrive className="w-3 h-3 text-emerald-400" />
                <span>{t("admin.dbFileSize")}</span>
              </div>
              <div className="text-lg font-bold text-white font-mono">
                {health.dbFileSizeFormatted}
              </div>
            </div>

            {/* Freelist / Reclaimable */}
            <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-0.5">
              <div className="text-zinc-500 text-[11px] font-medium flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-400" />
                <span>{t("admin.dbFreelist")}</span>
              </div>
              <div className="text-lg font-bold text-amber-300 font-mono">
                {health.freelistFormatted}
              </div>
            </div>

            {/* SQLite Integrity */}
            <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-0.5">
              <div className="text-zinc-500 text-[11px] font-medium flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-emerald-400" />
                <span>{t("admin.dbIntegrity")}</span>
              </div>
              <div className="text-lg font-bold text-emerald-400 font-mono flex items-center gap-1.5">
                <span className="capitalize">{health.integrity}</span>
              </div>
            </div>

            {/* RAM / Node Uptime */}
            <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-0.5">
              <div className="text-zinc-500 text-[11px] font-medium flex items-center gap-1">
                <Cpu className="w-3 h-3 text-sky-400" />
                <span>{t("admin.memoryUsage")}</span>
              </div>
              <div className="text-lg font-bold text-sky-400 font-mono">
                {health.memoryRssFormatted}
              </div>
            </div>
          </div>
        ) : (
          <div className="py-6 flex items-center justify-center text-zinc-500 text-xs">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-400 mr-2" />
            <span>Загрузка состояния базы данных...</span>
          </div>
        )}
      </div>

      {/* CARD 2: PAT SECURITY POLICIES (ITEM 5) */}
      <form
        onSubmit={handleSavePolicies}
        className="p-4 sm:p-5 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-4"
      >
        <div className="space-y-0.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-amber-400" />
            <span>{t("admin.patPoliciesTitle")}</span>
          </h3>
          <p className="text-[11px] text-zinc-400">{t("admin.patPoliciesSubtitle")}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {/* Policy 1: Deny never-expiring */}
          <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-white cursor-pointer select-none">
                {t("admin.denyNeverExpiresLabel")}
              </label>
              <input
                type="checkbox"
                checked={patDenyNeverExpires}
                onChange={(e) => setPatDenyNeverExpires(e.target.checked)}
                className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-amber-500 focus:ring-0 cursor-pointer"
              />
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              {t("admin.denyNeverExpiresDesc")}
            </p>
          </div>

          {/* Policy 2: Max lifetime */}
          <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-2">
            <label className="text-xs font-semibold text-white block">
              {t("admin.maxLifetimeLabel")}
            </label>
            <select
              value={patMaxDays}
              onChange={(e) => setPatMaxDays(Number(e.target.value))}
              className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="0">{t("admin.maxLifetimeNoLimit")}</option>
              <option value="30">{t("admin.maxLifetime30")}</option>
              <option value="60">{t("admin.maxLifetime60")}</option>
              <option value="90">{t("admin.maxLifetime90")}</option>
              <option value="180">{t("admin.maxLifetime180")}</option>
              <option value="365">{t("admin.maxLifetime365")}</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-zinc-900">
          <button
            type="submit"
            disabled={savingPolicies}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 disabled:opacity-50 transition-all shadow-md shadow-amber-600/20 cursor-pointer"
          >
            {savingPolicies ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>{t("admin.savePoliciesBtn")}</span>
          </button>
        </div>
      </form>

      {/* CARD 3: PLATFORM & CONTENT METRICS */}
      {stats && (
        <>
          <div className="p-4 sm:p-5 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-violet-400" />
              <span>{t("admin.statsPlatformTitle")}</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
              <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-0.5">
                <div className="text-zinc-500 text-[11px] font-medium">{t("admin.totalUsers")}</div>
                <div className="text-lg font-bold text-white">{stats.totalUsers}</div>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-0.5">
                <div className="text-zinc-500 text-[11px] font-medium">{t("admin.adminUsers")}</div>
                <div className="text-lg font-bold text-violet-400">{stats.adminUsers}</div>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-0.5">
                <div className="text-zinc-500 text-[11px] font-medium">{t("admin.bannedUsers")}</div>
                <div className="text-lg font-bold text-rose-400">{stats.bannedUsers}</div>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-0.5">
                <div className="text-zinc-500 text-[11px] font-medium">{t("admin.totalSnippets")}</div>
                <div className="text-lg font-bold text-sky-400">{stats.totalSnippets}</div>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-0.5">
                <div className="text-zinc-500 text-[11px] font-medium">{t("admin.totalCollections")}</div>
                <div className="text-lg font-bold text-emerald-400">{stats.totalCollections}</div>
              </div>
            </div>
          </div>

          {/* CARD 4: PERSONAL ACCESS TOKENS */}
          <div className="p-4 sm:p-5 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-amber-400" />
              <span>{t("admin.statsTokensTitle")}</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-0.5">
                <div className="text-zinc-500 text-[11px] font-medium">{t("admin.statsTotalTokens")}</div>
                <div className="text-lg font-bold text-white">{stats.totalTokens}</div>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-0.5">
                <div className="text-zinc-500 text-[11px] font-medium">{t("admin.statsActiveTokens")}</div>
                <div className="text-lg font-bold text-emerald-400">{stats.activeTokens}</div>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-0.5">
                <div className="text-zinc-500 text-[11px] font-medium">{t("admin.statsExpiredTokens")}</div>
                <div className="text-lg font-bold text-zinc-500">{stats.expiredTokens}</div>
              </div>
            </div>
          </div>

          {/* CARD 5: INTEGRATIONS & API ACTIVITY */}
          <div className="p-4 sm:p-5 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-sky-400" />
              <span>{t("admin.statsApiActivityTitle")}</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-0.5">
                <div className="text-zinc-500 text-[11px] font-medium">{t("admin.statsTotalApiCalls")}</div>
                <div className="text-lg font-bold text-white">{stats.totalIntegrationLogs}</div>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-0.5">
                <div className="text-zinc-500 text-[11px] font-medium flex items-center gap-1">
                  <Laptop className="w-3 h-3 text-sky-400" />
                  <span>{t("admin.statsVsCodeCalls")}</span>
                </div>
                <div className="text-lg font-bold text-sky-400">{stats.vsCodeCalls}</div>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-0.5">
                <div className="text-zinc-500 text-[11px] font-medium flex items-center gap-1">
                  <Terminal className="w-3 h-3 text-emerald-400" />
                  <span>{t("admin.statsCurlCalls")}</span>
                </div>
                <div className="text-lg font-bold text-emerald-400">{stats.curlCalls}</div>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-0.5">
                <div className="text-zinc-500 text-[11px] font-medium">{t("admin.statsApiErrors")}</div>
                <div className="text-lg font-bold text-rose-400">{stats.integrationErrors}</div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
