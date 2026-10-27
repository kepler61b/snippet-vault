"use client";

import React, { useState, useEffect } from "react";
import {
  Activity,
  AlertTriangle,
  Ban,
  Blocks,
  Calendar,
  Check,
  CheckCircle,
  Clock,
  Copy,
  ExternalLink,
  FileCode,
  Folder,
  KeyRound,
  Laptop,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  Trash2,
  Unlock,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  X,
  LogOut,
  Tag,
} from "lucide-react";
import { AdminAuditTab } from "./admin/AdminAuditTab";
import { AdminContentTab } from "./admin/AdminContentTab";
import { AdminTagsTab } from "./admin/AdminTagsTab";
import { AdminSystemTab } from "./admin/AdminSystemTab";
import { useI18n } from "@/lib/i18n";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";

interface UserItem {
  id: string;
  email: string;
  name: string | null;
  bio: string | null;
  role: "ADMIN" | "USER";
  isBanned: boolean;
  twoFactorEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    snippets: number;
    collections: number;
    passkeys: number;
    personalAccessTokens?: number;
  };
}

interface AdminTokenItem {
  id: string;
  name: string;
  tokenPrefix: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
    isBanned?: boolean;
  };
}

interface SystemStats {
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

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: {
    id: string;
    email: string;
    name: string | null;
    role?: string;
  } | null;
  onUserChanged?: () => void;
}

export function AdminModal({
  isOpen,
  onClose,
  currentUser,
  onUserChanged,
}: AdminModalProps) {
  const { t, locale, tSnippetsCount, tTokensCount } = useI18n();

  // Prevent background scrolling while modal is open
  useLockBodyScroll(isOpen);

  const [activeTab, setActiveTab] = useState<"users" | "tokens" | "audit" | "content" | "tags" | "settings">("users");

  // Revoke sessions state (Item 2)
  const [revokingSessionsUserId, setRevokingSessionsUserId] = useState<string | null>(null);

  const handleRevokeSessions = async (user: UserItem) => {
    const confirmMsg = t("admin.revokeSessionsConfirm", { email: user.email });
    if (!confirm(confirmMsg)) return;

    setRevokingSessionsUserId(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/revoke-sessions`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to revoke sessions");
      }
      showFeedback(t("admin.revokeSessionsSuccess", { email: user.email }));
      loadAllData();
    } catch (err: any) {
      showFeedback(err.message || "Failed to revoke sessions", "error");
    } finally {
      setRevokingSessionsUserId(null);
    }
  };

  // Users state
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | "ADMIN" | "USER" | "BANNED">("ALL");

  // Tokens state
  const [tokens, setTokens] = useState<AdminTokenItem[]>([]);
  const [loadingTokens, setLoadingTokens] = useState(false);
  const [tokenSearchQuery, setTokenSearchQuery] = useState("");
  const [tokenFilter, setTokenFilter] = useState<"ALL" | "ACTIVE" | "EXPIRED">("ALL");
  const [revokingTokenId, setRevokingTokenId] = useState<string | null>(null);

  // Issue Token state
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueUserId, setIssueUserId] = useState<string>("");
  const [issueTokenName, setIssueTokenName] = useState("");
  const [issueExpiresIn, setIssueExpiresIn] = useState<number | null>(30);
  const [issuingToken, setIssuingToken] = useState(false);
  const [issueError, setIssueError] = useState<string | null>(null);
  const [justIssuedToken, setJustIssuedToken] = useState<{
    token: string;
    userEmail: string;
    name: string;
  } | null>(null);
  const [copiedIssuedToken, setCopiedIssuedToken] = useState(false);

  // System stats state
  const [stats, setStats] = useState<SystemStats | null>(null);

  // New user modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"USER" | "ADMIN">("USER");
  const [creatingUser, setCreatingUser] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Reset password modal state
  const [resetTargetUser, setResetTargetUser] = useState<UserItem | null>(null);
  const [resetPasswordVal, setResetPasswordVal] = useState("");
  const [resettingPassword, setResettingPassword] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  // Delete user confirm state
  const [deleteTargetUser, setDeleteTargetUser] = useState<UserItem | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);

  // Feedback notifications
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showFeedback = (text: string, type: "success" | "error" = "success") => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 3500);
  };

  const loadAllData = async () => {
    setLoadingUsers(true);
    setLoadingTokens(true);
    try {
      const [usersRes, settingsRes, tokensRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/admin/settings"),
        fetch("/api/admin/tokens"),
      ]);

      const [usersData, settingsData, tokensData] = await Promise.all([
        usersRes.json(),
        settingsRes.json(),
        tokensRes.json(),
      ]);

      if (usersRes.ok && usersData.success) {
        setUsers(usersData.users || []);
      }
      if (settingsRes.ok && settingsData.success) {
        setStats(settingsData.stats || null);
      }
      if (tokensRes.ok && tokensData.success) {
        setTokens(tokensData.tokens || []);
      }
    } catch (err: any) {
      showFeedback(err.message || t("admin.loadError"), "error");
    } finally {
      setLoadingUsers(false);
      setLoadingTokens(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadAllData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Toggle user ban status
  const handleToggleBan = async (user: UserItem) => {
    if (user.id === currentUser?.id) {
      showFeedback(t("admin.cannotBanSelfFeedback"), "error");
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/${user.id}/ban`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isBanned: !user.isBanned }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || t("common.error"));
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, isBanned: !user.isBanned } : u))
      );
      showFeedback(
        user.isBanned
          ? t("admin.userUnbannedFeedback", { email: user.email })
          : t("admin.userBannedFeedback", { email: user.email })
      );
      loadAllData();
    } catch (err: any) {
      showFeedback(err.message || t("common.error"), "error");
    }
  };

  // Change user role
  const handleChangeRole = async (user: UserItem, newRole: "ADMIN" | "USER") => {
    if (user.id === currentUser?.id && newRole === "USER") {
      showFeedback(t("admin.cannotDemoteSelfFeedback"), "error");
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || t("common.error"));
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, role: newRole } : u))
      );
      showFeedback(
        t("admin.roleChangedFeedback", {
          email: user.email,
          role: newRole === "ADMIN" ? t("admin.roleAdmin") : t("admin.roleUser"),
        })
      );
      loadAllData();
    } catch (err: any) {
      showFeedback(err.message || t("common.error"), "error");
    }
  };

  // Create new user
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreatingUser(true);

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newEmail.trim(),
          name: newName.trim(),
          password: newPassword,
          role: newRole,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || t("common.error"));
      }

      showFeedback(t("admin.userCreatedFeedback", { email: data.user.email }));
      setShowCreateModal(false);
      setNewEmail("");
      setNewName("");
      setNewPassword("");
      setNewRole("USER");
      loadAllData();
    } catch (err: any) {
      setCreateError(err.message || t("common.error"));
    } finally {
      setCreatingUser(false);
    }
  };

  // Reset password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTargetUser) return;
    setResetError(null);
    setResettingPassword(true);

    try {
      const res = await fetch(`/api/admin/users/${resetTargetUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: resetPasswordVal }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || t("common.error"));
      }

      showFeedback(t("admin.passwordUpdatedFeedback", { email: resetTargetUser.email }));
      setResetTargetUser(null);
      setResetPasswordVal("");
    } catch (err: any) {
      setResetError(err.message || t("common.error"));
    } finally {
      setResettingPassword(false);
    }
  };

  // Delete user
  const handleDeleteUser = async () => {
    if (!deleteTargetUser) return;
    setDeletingUser(true);

    try {
      const res = await fetch(`/api/admin/users/${deleteTargetUser.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || t("common.error"));
      }

      showFeedback(t("admin.userDeletedFeedback", { email: deleteTargetUser.email }));
      setDeleteTargetUser(null);
      loadAllData();
    } catch (err: any) {
      showFeedback(err.message || t("common.error"), "error");
    } finally {
      setDeletingUser(false);
    }
  };

  // Issue token for specific user
  const handleIssueToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueUserId) {
      setIssueError(t("admin.selectUserLabel"));
      return;
    }
    if (!issueTokenName.trim()) {
      setIssueError(t("settings.tokens.nameRequired"));
      return;
    }

    try {
      setIssuingToken(true);
      setIssueError(null);
      const res = await fetch("/api/admin/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: issueUserId,
          name: issueTokenName.trim(),
          expiresInDays: issueExpiresIn,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to generate token");
      }

      const targetUser = users.find((u) => u.id === issueUserId);
      setJustIssuedToken({
        token: data.token,
        userEmail: targetUser?.email || "User",
        name: data.pat?.name || issueTokenName,
      });

      setShowIssueModal(false);
      setIssueTokenName("");
      showFeedback(t("admin.tokenIssuedSuccess"));
      loadAllData();
    } catch (err: any) {
      setIssueError(err.message || "Failed to issue token");
    } finally {
      setIssuingToken(false);
    }
  };

  // Revoke token
  const handleRevokeToken = async (token: AdminTokenItem) => {
    const confirmMsg = t("admin.revokeTokenConfirm", {
      name: token.name,
      email: token.user?.email || "Unknown",
    });
    if (!confirm(confirmMsg)) return;

    try {
      setRevokingTokenId(token.id);
      const res = await fetch(`/api/admin/tokens/${token.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to revoke token");
      }

      setTokens((prev) => prev.filter((t) => t.id !== token.id));
      showFeedback(t("admin.tokenRevokedFeedback", { name: token.name }));
      loadAllData();
    } catch (err: any) {
      showFeedback(err.message || "Failed to revoke token", "error");
    } finally {
      setRevokingTokenId(null);
    }
  };

  // Filtered users list
  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase().trim();
    const matchQuery =
      !q ||
      u.email.toLowerCase().includes(q) ||
      (u.name && u.name.toLowerCase().includes(q));

    if (!matchQuery) return false;

    if (roleFilter === "ADMIN") return u.role === "ADMIN";
    if (roleFilter === "USER") return u.role === "USER" && !u.isBanned;
    if (roleFilter === "BANNED") return u.isBanned;

    return true;
  });

  // Filtered tokens list
  const filteredTokens = tokens.filter((tok) => {
    const q = tokenSearchQuery.toLowerCase().trim();
    const matchQuery =
      !q ||
      tok.name.toLowerCase().includes(q) ||
      tok.tokenPrefix.toLowerCase().includes(q) ||
      tok.user?.email?.toLowerCase().includes(q) ||
      (tok.user?.name && tok.user.name.toLowerCase().includes(q));

    if (!matchQuery) return false;

    const isExpired = tok.expiresAt && new Date(tok.expiresAt).getTime() < Date.now();
    if (tokenFilter === "ACTIVE") return !isExpired;
    if (tokenFilter === "EXPIRED") return Boolean(isExpired);

    return true;
  });

  const activeTokensCount = tokens.filter(
    (t) => !t.expiresAt || new Date(t.expiresAt).getTime() >= Date.now()
  ).length;
  const expiredTokensCount = tokens.length - activeTokensCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 lg:p-6 bg-black/80 backdrop-blur-sm animate-modal-backdrop touch-none">
      <div className="relative w-full max-w-4xl h-[100dvh] sm:h-[90vh] rounded-none sm:rounded-2xl border-0 sm:border border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden flex flex-col animate-modal-content safe-top touch-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-zinc-800 bg-zinc-900/60 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-600/20 text-violet-400 border border-violet-500/30 shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="truncate">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white truncate">
                  {t("admin.title")}
                </h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                  Root
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-zinc-400 truncate hidden sm:block">
                {t("admin.subtitle")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={loadAllData}
              disabled={loadingUsers || loadingTokens}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer"
              title={t("admin.refreshData")}
              aria-label={t("admin.refreshData")}
            >
              <RefreshCw
                className={`w-4 h-4 ${
                  loadingUsers || loadingTokens ? "animate-spin text-violet-400" : ""
                }`}
              />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors shrink-0 min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer"
              aria-label={t("common.close")}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center px-4 sm:px-6 border-b border-zinc-800 bg-zinc-950/90 text-xs font-semibold gap-1 shrink-0 overflow-x-auto">
          {/* Tab 1: Users */}
          <button
            type="button"
            onClick={() => setActiveTab("users")}
            className={`flex items-center gap-2 py-3 px-3.5 border-b-2 text-[11px] sm:text-xs transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "users"
                ? "border-violet-500 text-white font-semibold"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>
              {t("admin.usersTab")} ({users.length})
            </span>
          </button>

          {/* Tab 2: API Tokens */}
          <button
            type="button"
            onClick={() => setActiveTab("tokens")}
            className={`flex items-center gap-2 py-3 px-3.5 border-b-2 text-[11px] sm:text-xs transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "tokens"
                ? "border-violet-500 text-white font-semibold"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <KeyRound className="w-3.5 h-3.5 text-amber-400" />
            <span>
              {t("admin.tokensTab")} ({tokens.length})
            </span>
          </button>

          {/* Tab 3: Audit (Item 1) */}
          <button
            type="button"
            onClick={() => setActiveTab("audit")}
            className={`flex items-center gap-2 py-3 px-3.5 border-b-2 text-[11px] sm:text-xs transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "audit"
                ? "border-violet-500 text-white font-semibold"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>{t("admin.auditTab")}</span>
          </button>

          {/* Tab 4: Content (Item 4) */}
          <button
            type="button"
            onClick={() => setActiveTab("content")}
            className={`flex items-center gap-2 py-3 px-3.5 border-b-2 text-[11px] sm:text-xs transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "content"
                ? "border-violet-500 text-white font-semibold"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <FileCode className="w-3.5 h-3.5 text-sky-400" />
            <span>{t("admin.contentTab")}</span>
          </button>

          {/* Tab 5: Tags (Item 6) */}
          <button
            type="button"
            onClick={() => setActiveTab("tags")}
            className={`flex items-center gap-2 py-3 px-3.5 border-b-2 text-[11px] sm:text-xs transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "tags"
                ? "border-violet-500 text-white font-semibold"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Tag className="w-3.5 h-3.5 text-teal-400" />
            <span>{t("admin.tagsTab")}</span>
          </button>

          {/* Tab 6: System (was System Settings) */}
          <button
            type="button"
            onClick={() => setActiveTab("settings")}
            className={`flex items-center gap-2 py-3 px-3.5 border-b-2 text-[11px] sm:text-xs transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "settings"
                ? "border-violet-500 text-white font-semibold"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-sky-400" />
            <span>{t("admin.settingsTab")}</span>
          </button>
        </div>

        {/* Notification Banner */}
        {feedback && (
          <div
            className={`px-4 py-2 text-xs flex items-center justify-between animate-in fade-in slide-in-from-top-1 ${
              feedback.type === "success"
                ? "bg-emerald-950/50 border-b border-emerald-800/40 text-emerald-300"
                : "bg-rose-950/50 border-b border-rose-800/40 text-rose-300"
            }`}
          >
            <div className="flex items-center gap-2 truncate">
              {feedback.type === "success" ? (
                <CheckCircle className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              )}
              <span className="truncate">{feedback.text}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="text-zinc-400 hover:text-white p-0.5 rounded ml-2"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-3.5 sm:p-6 space-y-4">
          {/* TAB 1: USERS */}
          {activeTab === "users" && (
            <div className="space-y-4">
              {/* Controls bar: Search + Filter + Add Button */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder={t("admin.userSearchPlaceholder")}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-200 placeholder-zinc-500 outline-none focus:border-violet-500"
                    />
                  </div>

                  {/* Filter tabs */}
                  <div className="flex items-center p-0.5 bg-zinc-900 border border-zinc-800 rounded-xl text-[10px] sm:text-[11px] shrink-0">
                    <button
                      type="button"
                      onClick={() => setRoleFilter("ALL")}
                      className={`px-2 sm:px-2.5 py-1 rounded-lg transition-all ${
                        roleFilter === "ALL"
                          ? "bg-violet-600 text-white font-medium"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      {t("admin.filterAll")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setRoleFilter("ADMIN")}
                      className={`px-2 sm:px-2.5 py-1 rounded-lg transition-all ${
                        roleFilter === "ADMIN"
                          ? "bg-violet-600 text-white font-medium"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      {t("admin.filterAdmins")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setRoleFilter("BANNED")}
                      className={`px-2 sm:px-2.5 py-1 rounded-lg transition-all ${
                        roleFilter === "BANNED"
                          ? "bg-rose-600 text-white font-medium"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      {t("admin.filterBanned")}
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setNewEmail("");
                    setNewName("");
                    setNewPassword("");
                    setNewRole("USER");
                    setCreateError(null);
                    setShowCreateModal(true);
                  }}
                  className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 active:scale-[0.98] text-white text-xs font-semibold shadow-sm transition-all shrink-0 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{t("admin.createAccountBtn")}</span>
                </button>
              </div>

              {/* Users List */}
              <div className="space-y-2">
                {loadingUsers && users.length === 0 ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-2 text-zinc-500 text-xs">
                    <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
                    <span>{t("common.loading")}</span>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="py-12 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-2xl bg-zinc-950/40">
                    {searchQuery || roleFilter !== "ALL"
                      ? t("admin.noUsersFound")
                      : t("admin.noUsersYet")}
                  </div>
                ) : (
                  filteredUsers.map((user) => {
                    const isSelf = user.id === currentUser?.id;
                    const isLocalAdmin = user.email === "admin@snippetvault.local";
                    const formattedDate = new Date(user.createdAt).toLocaleDateString(
                      locale === "ru" ? "ru-RU" : "en-US",
                      { year: "numeric", month: "short", day: "numeric" }
                    );

                    return (
                      <div
                        key={user.id}
                        className={`px-3.5 py-2.5 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-2.5 text-xs ${
                          user.isBanned
                            ? "bg-rose-950/15 border-rose-900/40 opacity-80"
                            : "bg-zinc-900/40 border-zinc-800/80 hover:border-zinc-700/80 hover:bg-zinc-900/60"
                        }`}
                      >
                        {/* User Identity & Info */}
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {/* Avatar */}
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs uppercase shrink-0 border shadow-inner ${
                              user.role === "ADMIN"
                                ? "bg-violet-600/20 text-violet-300 border-violet-500/30"
                                : "bg-zinc-800 text-zinc-300 border-zinc-700"
                            }`}
                          >
                            {user.name ? user.name[0] : user.email[0]}
                          </div>

                          {/* Info in 2 compact rows */}
                          <div className="min-w-0 flex-1 space-y-0.5">
                            {/* Row 1: Name + Role Badge + (Вы) + LocalAdmin + Banned */}
                            <div className="flex items-center gap-2 overflow-hidden">
                              <span className="font-semibold text-white text-xs sm:text-sm truncate max-w-[160px] sm:max-w-[220px]">
                                {user.name || t("admin.noName")}
                              </span>

                              {/* Role Badge */}
                              <span
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap shrink-0 ${
                                  user.role === "ADMIN"
                                    ? "bg-violet-500/15 text-violet-300 border-violet-500/30"
                                    : "bg-zinc-800/90 text-zinc-400 border-zinc-700/80"
                                }`}
                              >
                                {user.role === "ADMIN" ? t("admin.roleAdmin") : t("admin.roleUser")}
                              </span>

                              {isLocalAdmin && (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 whitespace-nowrap shrink-0">
                                  {t("admin.localAdminBadge")}
                                </span>
                              )}

                              {user.isBanned && (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 whitespace-nowrap shrink-0">
                                  {t("admin.bannedBadge")}
                                </span>
                              )}

                              {isSelf && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 whitespace-nowrap shrink-0">
                                  {t("admin.youBadge")}
                                </span>
                              )}
                            </div>

                            {/* Row 2: Email • Snippets • Tokens • Date */}
                            <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-mono overflow-hidden">
                              <span className="truncate max-w-[170px] sm:max-w-[220px] text-zinc-300" title={user.email}>
                                {user.email}
                              </span>
                              <span className="text-zinc-600 shrink-0">•</span>
                              <span className="flex items-center gap-1 text-zinc-400 shrink-0">
                                <FileCode className="w-3 h-3 text-sky-400" />
                                <span>{tSnippetsCount(user._count?.snippets || 0)}</span>
                              </span>
                              <span className="text-zinc-600 shrink-0">•</span>
                              <span className="flex items-center gap-1 text-zinc-400 shrink-0">
                                <KeyRound className="w-3 h-3 text-amber-400" />
                                <span>{tTokensCount(user._count?.personalAccessTokens || 0)}</span>
                              </span>
                              <span className="text-zinc-600 shrink-0 hidden lg:inline">•</span>
                              <span className="text-zinc-500 shrink-0 hidden lg:inline font-sans">
                                {formattedDate}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions buttons */}
                        <div className="flex items-center gap-1.5 shrink-0 self-end md:self-center">
                          {/* Issue token button */}
                          <button
                            type="button"
                            onClick={() => {
                              setIssueUserId(user.id);
                              setIssueTokenName("");
                              setIssueError(null);
                              setShowIssueModal(true);
                            }}
                            className="h-8 px-2.5 rounded-lg text-xs font-medium border border-zinc-800 bg-zinc-900/80 hover:bg-amber-500/10 hover:border-amber-500/40 text-zinc-300 hover:text-amber-300 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                            title={t("admin.issueTokenBtn")}
                          >
                            <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                            <span>{t("admin.userTokensBtn")}</span>
                          </button>

                          {/* Role switch button */}
                          <button
                            type="button"
                            disabled={isSelf || isLocalAdmin}
                            onClick={() =>
                              handleChangeRole(
                                user,
                                user.role === "ADMIN" ? "USER" : "ADMIN"
                              )
                            }
                            className={`h-8 px-2.5 rounded-lg text-xs font-medium border transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm ${
                              user.role === "ADMIN"
                                ? "border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:text-white hover:bg-zinc-800"
                                : "border-violet-500/30 bg-violet-600/10 text-violet-300 hover:bg-violet-600/20 hover:border-violet-500/50"
                            } ${isSelf || isLocalAdmin ? "opacity-30 cursor-not-allowed" : ""}`}
                            title={
                              isSelf
                                ? t("admin.cannotChangeSelfRole")
                                : isLocalAdmin
                                ? t("admin.cannotChangeLocalAdminRole")
                                : user.role === "ADMIN"
                                ? t("admin.removeAdmin")
                                : t("admin.makeAdmin")
                            }
                          >
                            <Shield className="w-3.5 h-3.5 text-violet-400" />
                            <span>
                              {user.role === "ADMIN" ? t("admin.removeAdmin") : t("admin.makeAdmin")}
                            </span>
                          </button>

                          {/* Session Kill Switch (Item 2) */}
                          <button
                            type="button"
                            onClick={() => handleRevokeSessions(user)}
                            disabled={revokingSessionsUserId === user.id}
                            className="h-8 px-2.5 rounded-lg text-xs font-medium border border-zinc-800 bg-zinc-900/80 hover:bg-rose-500/10 hover:border-rose-500/40 text-zinc-400 hover:text-rose-300 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                            title={t("admin.revokeSessionsConfirm", { email: user.email })}
                          >
                            {revokingSessionsUserId === user.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" />
                            ) : (
                              <LogOut className="w-3.5 h-3.5 text-zinc-400" />
                            )}
                            <span>{t("admin.revokeSessionsBtn")}</span>
                          </button>

                          {/* Reset password button */}
                          <button
                            type="button"
                            onClick={() => {
                              setResetTargetUser(user);
                              setResetPasswordVal("");
                              setResetError(null);
                            }}
                            className="h-8 px-2.5 rounded-lg text-xs font-medium border border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:text-white hover:bg-zinc-800 hover:border-zinc-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                            title={t("admin.resetPasswordTitle")}
                          >
                            <Lock className="w-3.5 h-3.5" />
                            <span>{t("admin.passwordBtn")}</span>
                          </button>

                          {/* Ban / Unban button */}
                          <button
                            type="button"
                            disabled={isSelf}
                            onClick={() => handleToggleBan(user)}
                            className={`h-8 px-2.5 rounded-lg text-xs font-medium border transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm ${
                              user.isBanned
                                ? "border-emerald-500/30 bg-emerald-600/10 text-emerald-300 hover:bg-emerald-600/20"
                                : "border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:border-rose-500/40 hover:text-rose-300 hover:bg-rose-500/10"
                            } ${isSelf ? "opacity-30 cursor-not-allowed" : ""}`}
                            title={
                              isSelf
                                ? t("admin.cannotBanSelf")
                                : user.isBanned
                                ? t("admin.unbanBtn")
                                : t("admin.banBtn")
                            }
                          >
                            {user.isBanned ? (
                              <>
                                <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                                <span>{t("admin.unbanBtn")}</span>
                              </>
                            ) : (
                              <>
                                <Ban className="w-3.5 h-3.5 text-rose-400" />
                                <span>{t("admin.banBtn")}</span>
                              </>
                            )}
                          </button>

                          {/* Delete button */}
                          <button
                            type="button"
                            disabled={isSelf || isLocalAdmin}
                            onClick={() => setDeleteTargetUser(user)}
                            className={`h-8 w-8 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/40 border border-zinc-800 bg-zinc-900/80 transition-all flex items-center justify-center cursor-pointer shadow-sm ${
                              isSelf || isLocalAdmin ? "opacity-30 cursor-not-allowed" : ""
                            }`}
                            title={
                              isSelf
                                ? t("admin.cannotDeleteSelf")
                                : isLocalAdmin
                                ? t("admin.cannotDeleteLocalAdmin")
                                : t("admin.deleteUserBtn")
                            }
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })                )}
              </div>
            </div>
          )}

          {/* TAB 2: API TOKENS */}
          {activeTab === "tokens" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Controls bar: Search + Filter + Issue Token Button */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder={t("admin.tokensSearchPlaceholder")}
                      value={tokenSearchQuery}
                      onChange={(e) => setTokenSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-200 placeholder-zinc-500 outline-none focus:border-violet-500"
                    />
                  </div>

                  {/* Filter tabs */}
                  <div className="flex items-center p-0.5 bg-zinc-900 border border-zinc-800 rounded-xl text-[10px] sm:text-[11px] shrink-0">
                    <button
                      type="button"
                      onClick={() => setTokenFilter("ALL")}
                      className={`px-2 sm:px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        tokenFilter === "ALL"
                          ? "bg-violet-600 text-white font-medium"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      {t("admin.tokensFilterAll")} ({tokens.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setTokenFilter("ACTIVE")}
                      className={`px-2 sm:px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        tokenFilter === "ACTIVE"
                          ? "bg-emerald-600 text-white font-medium"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      {t("admin.tokensFilterActive")} ({activeTokensCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setTokenFilter("EXPIRED")}
                      className={`px-2 sm:px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        tokenFilter === "EXPIRED"
                          ? "bg-rose-600 text-white font-medium"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      {t("admin.tokensFilterExpired")} ({expiredTokensCount})
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIssueUserId(users[0]?.id || "");
                    setIssueTokenName("");
                    setIssueExpiresIn(30);
                    setIssueError(null);
                    setShowIssueModal(true);
                  }}
                  className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 active:scale-[0.98] text-white text-xs font-semibold shadow-sm transition-all shrink-0 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t("admin.issueTokenBtn")}</span>
                </button>
              </div>

              {/* Tokens List */}
              <div className="space-y-2">
                {loadingTokens && tokens.length === 0 ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-2 text-zinc-500 text-xs">
                    <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
                    <span>{t("common.loading")}</span>
                  </div>
                ) : filteredTokens.length === 0 ? (
                  <div className="py-12 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-2xl bg-zinc-950/40">
                    {t("admin.tokensEmpty")}
                  </div>
                ) : (
                  filteredTokens.map((tok) => {
                    const isExpired =
                      tok.expiresAt && new Date(tok.expiresAt).getTime() < Date.now();
                    const createdFormatted = new Date(tok.createdAt).toLocaleDateString(
                      locale === "ru" ? "ru-RU" : "en-US",
                      { year: "numeric", month: "short", day: "numeric" }
                    );
                    const lastUsedFormatted = tok.lastUsedAt
                      ? new Date(tok.lastUsedAt).toLocaleDateString(
                          locale === "ru" ? "ru-RU" : "en-US",
                          { year: "numeric", month: "short", day: "numeric" }
                        )
                      : t("settings.tokens.neverUsed");
                    const expiresFormatted = tok.expiresAt
                      ? new Date(tok.expiresAt).toLocaleDateString(
                          locale === "ru" ? "ru-RU" : "en-US",
                          { year: "numeric", month: "short", day: "numeric" }
                        )
                      : t("settings.tokens.noExpiration");

                    return (
                      <div
                        key={tok.id}
                        className="p-3.5 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700/80 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-start sm:items-center gap-3 min-w-0">
                          {/* Key Icon */}
                          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                            <KeyRound className="w-4 h-4" />
                          </div>

                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-white text-xs truncate">
                                {tok.name}
                              </span>
                              <code className="text-[11px] px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 font-mono text-zinc-300">
                                {tok.tokenPrefix}
                              </code>

                              {/* Owner pill */}
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-800/80 border border-zinc-700 text-zinc-300">
                                <Users className="w-3 h-3 text-zinc-400" />
                                <span>{tok.user?.email || "Unknown"}</span>
                                {tok.user?.role === "ADMIN" && (
                                  <span className="text-violet-400 font-semibold">(Admin)</span>
                                )}
                              </span>

                              {/* Status badge */}
                              {isExpired ? (
                                <span className="inline-flex items-center justify-center text-center text-[10px] px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 font-semibold leading-none">
                                  {t("admin.tokenExpired")}
                                </span>
                              ) : (
                                <span className="inline-flex items-center justify-center text-center text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold leading-none">
                                  {t("admin.tokenActive")}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-3 text-[11px] text-zinc-500 flex-wrap">
                              <span>
                                {t("settings.tokens.tableCreated")}: {createdFormatted}
                              </span>
                              <span>•</span>
                              <span>
                                {t("settings.tokens.tableLastUsed")}: {lastUsedFormatted}
                              </span>
                              <span>•</span>
                              <span>
                                {t("settings.tokens.tableExpires")}: {expiresFormatted}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          <button
                            type="button"
                            disabled={revokingTokenId === tok.id}
                            onClick={() => handleRevokeToken(tok)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-800 hover:border-rose-500/30 bg-zinc-900 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 text-xs font-medium transition-all shrink-0 cursor-pointer disabled:opacity-50"
                            title={t("admin.revokeTokenBtn")}
                          >
                            {revokingTokenId === tok.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                            <span>{t("admin.revokeTokenBtn")}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 3: AUDIT & SECURITY (ITEM 1) */}
          {activeTab === "audit" && (
            <AdminAuditTab showFeedback={showFeedback} />
          )}

          {/* TAB 4: CONTENT MODERATION & TRANSFER (ITEM 4) */}
          {activeTab === "content" && (
            <AdminContentTab
              users={users}
              showFeedback={showFeedback}
              onRefreshData={loadAllData}
            />
          )}

          {/* TAB 5: TAG HYGIENE & MERGE (ITEM 6) */}
          {activeTab === "tags" && (
            <AdminTagsTab
              showFeedback={showFeedback}
              onRefreshData={loadAllData}
            />
          )}

          {/* TAB 6: SYSTEM HEALTH, VACUUM, BACKUP & PAT POLICIES (ITEM 3 & ITEM 5) */}
          {activeTab === "settings" && (
            <AdminSystemTab
              stats={stats}
              showFeedback={showFeedback}
              onRefreshData={loadAllData}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 sm:px-6 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:py-3.5 border-t border-zinc-800 bg-zinc-900/80 shrink-0">
          <span className="text-[11px] text-zinc-500">
            SnippetVault Server Administration
          </span>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 sm:py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            {t("common.close")}
          </button>
        </div>
      </div>

      {/* MODAL: CREATE USER */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-modal-backdrop touch-none">
          <div className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-5 sm:p-6 shadow-2xl flex flex-col gap-4 animate-modal-content touch-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-violet-600/20 text-violet-400 flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-white">
                  {t("admin.newUserTitle")}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {createError && (
              <div className="p-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs text-zinc-200">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  {t("admin.emailLabel")} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="user@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-100 placeholder-zinc-500 outline-none focus:border-violet-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  {t("admin.nameLabel")}
                </label>
                <input
                  type="text"
                  placeholder={t("admin.namePlaceholder")}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-100 placeholder-zinc-500 outline-none focus:border-violet-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  {t("admin.passwordMinChars")} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-100 placeholder-zinc-500 outline-none focus:border-violet-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  {t("admin.accountRole")}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewRole("USER")}
                    className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                      newRole === "USER"
                        ? "border-violet-500 bg-violet-600/20 text-white shadow-sm"
                        : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white"
                    }`}
                  >
                    {t("admin.roleUser")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewRole("ADMIN")}
                    className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      newRole === "ADMIN"
                        ? "border-violet-500 bg-violet-600/20 text-white shadow-sm"
                        : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white"
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-violet-400" />
                    <span>{t("admin.roleAdmin")}</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium text-zinc-400 hover:text-white cursor-pointer"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={creatingUser}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 disabled:opacity-50 transition-all shadow-md shadow-violet-600/20 cursor-pointer"
                >
                  {creatingUser && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{t("admin.createUserBtn")}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ISSUE TOKEN FOR USER */}
      {showIssueModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-modal-backdrop touch-none">
          <div className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-5 sm:p-6 shadow-2xl flex flex-col gap-4 animate-modal-content touch-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {t("admin.createTokenModalTitle")}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIssueModal(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {issueError && (
              <div className="p-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs">
                {issueError}
              </div>
            )}

            <form onSubmit={handleIssueToken} className="space-y-3.5 text-xs text-zinc-200">
              {/* User select */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  {t("admin.selectUserLabel")} <span className="text-rose-500">*</span>
                </label>
                <select
                  value={issueUserId}
                  onChange={(e) => setIssueUserId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-100 outline-none focus:border-violet-500"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.email} {u.name ? `(${u.name})` : ""} {u.role === "ADMIN" ? "[Admin]" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Token Name */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  {t("admin.tokenNameLabel")} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={t("admin.tokenNamePlaceholder")}
                  value={issueTokenName}
                  onChange={(e) => setIssueTokenName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-100 placeholder-zinc-500 outline-none focus:border-violet-500"
                />
              </div>

              {/* Expiration */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  {t("admin.tokenExpiresLabel")}
                </label>
                <select
                  value={issueExpiresIn === null ? "never" : String(issueExpiresIn)}
                  onChange={(e) => {
                    const v = e.target.value;
                    setIssueExpiresIn(v === "never" ? null : Number(v));
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-100 outline-none focus:border-violet-500"
                >
                  <option value="30">{t("admin.tokenExpires30")}</option>
                  <option value="60">{t("admin.tokenExpires60")}</option>
                  <option value="90">{t("admin.tokenExpires90")}</option>
                  <option value="365">{t("admin.tokenExpires365")}</option>
                  <option value="never">{t("admin.tokenExpiresNever")}</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowIssueModal(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium text-zinc-400 hover:text-white cursor-pointer"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={issuingToken || !issueTokenName.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 disabled:opacity-50 transition-all shadow-md shadow-violet-600/20 cursor-pointer"
                >
                  {issuingToken && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{t("admin.submitIssueToken")}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: JUST ISSUED TOKEN BANNER */}
      {justIssuedToken && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-modal-backdrop touch-none">
          <div className="relative w-full max-w-lg rounded-2xl border border-emerald-500/40 bg-zinc-950 p-5 sm:p-6 shadow-2xl flex flex-col gap-4 animate-modal-content touch-auto">
            <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                  <Check className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {t("admin.tokenIssuedSuccess")}
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    {justIssuedToken.name} • {justIssuedToken.userEmail}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setJustIssuedToken(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-amber-300 font-medium leading-relaxed bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl">
              {t("admin.tokenIssuedWarning")}
            </p>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={justIssuedToken.token}
                onClick={(e) => (e.target as HTMLInputElement).select()}
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-emerald-500/40 text-emerald-200 font-mono text-xs select-all outline-none"
              />
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(justIssuedToken.token);
                  setCopiedIssuedToken(true);
                  setTimeout(() => setCopiedIssuedToken(false), 2000);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shrink-0 transition-all shadow-sm shadow-emerald-600/30 cursor-pointer"
              >
                {copiedIssuedToken ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>{t("common.copied")}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>{t("common.copy")}</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-zinc-300 overflow-x-auto select-all">
              curl -sL -H &quot;Authorization: Bearer {justIssuedToken.token}&quot; {typeof window !== "undefined" ? window.location.origin : ""}/api/snippets
            </div>

            <div className="flex justify-end pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setJustIssuedToken(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-white transition-all cursor-pointer"
              >
                {t("common.close")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: RESET PASSWORD */}
      {resetTargetUser && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-modal-backdrop touch-none">
          <div className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-5 sm:p-6 shadow-2xl flex flex-col gap-4 animate-modal-content touch-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{t("admin.resetPasswordTitle")}</h3>
                  <p className="text-[11px] text-zinc-400 truncate max-w-[240px]">
                    {resetTargetUser.email}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setResetTargetUser(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {resetError && (
              <div className="p-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs">
                {resetError}
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-4 text-xs text-zinc-200">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  {t("admin.newPasswordLabel")}
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder={t("admin.newPasswordPlaceholder")}
                  value={resetPasswordVal}
                  onChange={(e) => setResetPasswordVal(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-100 placeholder-zinc-500 outline-none focus:border-violet-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setResetTargetUser(null)}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium text-zinc-400 hover:text-white cursor-pointer"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={resettingPassword || resetPasswordVal.length < 6}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 disabled:opacity-50 transition-all shadow-md shadow-amber-600/20 cursor-pointer"
                >
                  {resettingPassword && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{t("admin.setPasswordBtn")}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DELETE CONFIRMATION */}
      {deleteTargetUser && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-modal-backdrop touch-none">
          <div className="relative w-full max-w-md rounded-2xl border border-rose-500/30 bg-zinc-950 p-5 sm:p-6 shadow-2xl flex flex-col gap-4 animate-modal-content touch-auto">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center shrink-0 text-rose-400">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1 flex-1 min-w-0">
                <h3 className="text-base font-bold text-white">{t("admin.deleteUserTitle")}</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {t("admin.deleteUserConfirmText", { email: deleteTargetUser.email })}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setDeleteTargetUser(null)}
                disabled={deletingUser}
                className="px-3.5 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white cursor-pointer"
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                disabled={deletingUser}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-50 transition-all shadow-lg shadow-rose-600/20 cursor-pointer"
              >
                {deletingUser && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{t("admin.deleteConfirmBtn")}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
