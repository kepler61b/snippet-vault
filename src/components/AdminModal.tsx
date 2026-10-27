"use client";

import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  Ban,
  Check,
  CheckCircle,
  FileCode,
  Folder,
  KeyRound,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Unlock,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";

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
  };
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
  const { t, locale, tSnippetsCount } = useI18n();
  const [activeTab, setActiveTab] = useState<"users" | "settings">("users");

  // Users state
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | "ADMIN" | "USER" | "BANNED">("ALL");

  // System stats state
  const [stats, setStats] = useState<{
    totalUsers: number;
    adminUsers: number;
    bannedUsers: number;
    totalSnippets: number;
    totalCollections: number;
  } | null>(null);

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

  const loadUsersAndSettings = async () => {
    setLoadingUsers(true);
    try {
      const [usersRes, settingsRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/admin/settings"),
      ]);

      const usersData = await usersRes.json();
      const settingsData = await settingsRes.json();

      if (usersRes.ok && usersData.success) {
        setUsers(usersData.users || []);
      }
      if (settingsRes.ok && settingsData.success) {
        setStats(settingsData.stats || null);
      }
    } catch (err: any) {
      showFeedback(err.message || t("admin.loadError"), "error");
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadUsersAndSettings();
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
      loadUsersAndSettings();
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
      loadUsersAndSettings();
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
      loadUsersAndSettings();
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
      loadUsersAndSettings();
    } catch (err: any) {
      showFeedback(err.message || t("common.error"), "error");
    } finally {
      setDeletingUser(false);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 lg:p-6 bg-black/80 backdrop-blur-sm animate-modal-backdrop">
      <div className="relative w-full max-w-4xl h-[100dvh] sm:h-[90vh] rounded-none sm:rounded-2xl border-0 sm:border border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden flex flex-col animate-modal-content safe-top">
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
              onClick={loadUsersAndSettings}
              disabled={loadingUsers}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
              title={t("admin.refreshData")}
              aria-label={t("admin.refreshData")}
            >
              <RefreshCw className={`w-4 h-4 ${loadingUsers ? "animate-spin text-violet-400" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors shrink-0 min-w-[36px] min-h-[36px] flex items-center justify-center"
              aria-label={t("common.close")}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center px-4 sm:px-6 border-b border-zinc-800 bg-zinc-950/90 text-xs font-semibold gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("users")}
            className={`flex items-center gap-2 py-3 px-3.5 border-b-2 text-[11px] sm:text-xs transition-all whitespace-nowrap ${
              activeTab === "users"
                ? "border-violet-500 text-white"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>{t("admin.usersTab")} ({users.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("settings")}
            className={`flex items-center gap-2 py-3 px-3.5 border-b-2 text-[11px] sm:text-xs transition-all whitespace-nowrap ${
              activeTab === "settings"
                ? "border-violet-500 text-white"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
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
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-4">
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
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-violet-600/20 shrink-0"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{t("admin.createAccountBtn")}</span>
                </button>
              </div>

              {/* Users List */}
              <div className="space-y-2">
                {filteredUsers.length === 0 ? (
                  <div className="py-12 text-center text-xs text-zinc-500 border border-zinc-800/80 rounded-2xl bg-zinc-900/30">
                    {searchQuery ? t("admin.noUsersFound") : t("admin.noUsersYet")}
                  </div>
                ) : (
                  filteredUsers.map((user) => {
                    const isSelf = user.id === currentUser?.id;
                    const isLocalAdmin = user.email.toLowerCase() === "admin@snippetvault.local";
                    const initial = (user.name || user.email || "U")[0].toUpperCase();
                    const formattedDate = new Date(user.createdAt).toLocaleDateString(
                      locale === "ru" ? "ru-RU" : "en-US",
                      {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      }
                    );

                    return (
                      <div
                        key={user.id}
                        className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          user.isBanned
                            ? "bg-rose-950/20 border-rose-900/40"
                            : "bg-zinc-900/40 border-zinc-800 hover:border-zinc-700/80"
                        }`}
                      >
                        {/* User info */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0 ${
                              user.role === "ADMIN"
                                ? "bg-gradient-to-tr from-violet-600 to-indigo-600 shadow-md shadow-violet-600/30"
                                : "bg-zinc-800 border border-zinc-700 text-zinc-300"
                            }`}
                          >
                            {initial}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-xs text-white truncate">
                                {user.name || t("admin.noName")}
                              </span>

                              {/* Role Badge */}
                              {user.role === "ADMIN" ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-600/20 text-violet-300 border border-violet-500/30 shrink-0">
                                  <ShieldCheck className="w-3 h-3 text-violet-400" />
                                  <span>{t("admin.roleAdmin")}</span>
                                </span>
                              ) : (
                                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700/60 shrink-0">
                                  {t("admin.roleUser")}
                                </span>
                              )}

                              {isLocalAdmin && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0">
                                  <KeyRound className="w-2.5 h-2.5 text-amber-400" />
                                  <span>{t("admin.localAdminBadge")}</span>
                                </span>
                              )}

                              {/* Ban Badge */}
                              {user.isBanned && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-600/20 text-rose-300 border border-rose-500/30 shrink-0">
                                  <Ban className="w-3 h-3 text-rose-400" />
                                  <span>{t("admin.bannedBadge")}</span>
                                </span>
                              )}

                              {isSelf && (
                                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 shrink-0">
                                  {t("admin.youBadge")}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-3 text-[11px] text-zinc-400 mt-0.5 flex-wrap">
                              <span className="truncate">{user.email}</span>
                              <span className="text-zinc-600">•</span>
                              <span className="flex items-center gap-1 text-zinc-500">
                                <FileCode className="w-3 h-3" />
                                {tSnippetsCount(user._count?.snippets || 0)}
                              </span>
                              <span className="text-zinc-600 hidden xs:inline">•</span>
                              <span className="text-zinc-500 hidden xs:inline">
                                {t("admin.registeredAt", { date: formattedDate })}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions buttons */}
                        <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-zinc-800/80 w-full sm:w-auto justify-end">
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
                            className={`p-2 sm:px-2.5 sm:py-1 rounded-lg text-xs font-medium border transition-colors flex items-center justify-center gap-1 min-w-[34px] min-h-[34px] ${
                              user.role === "ADMIN"
                                ? "border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800"
                                : "border-violet-500/30 bg-violet-600/10 text-violet-300 hover:bg-violet-600/20"
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
                            <Shield className="w-3.5 h-3.5" />
                            <span className="hidden md:inline">
                              {user.role === "ADMIN" ? t("admin.removeAdmin") : t("admin.makeAdmin")}
                            </span>
                          </button>

                          {/* Reset password button */}
                          <button
                            type="button"
                            onClick={() => {
                              setResetTargetUser(user);
                              setResetPasswordVal("");
                              setResetError(null);
                            }}
                            className="p-2 sm:px-2.5 sm:py-1 rounded-lg text-xs font-medium border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors flex items-center justify-center gap-1 min-w-[34px] min-h-[34px]"
                            title={t("admin.resetPasswordTitle")}
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            <span className="hidden md:inline">{t("admin.passwordBtn")}</span>
                          </button>

                          {/* Ban / Unban button */}
                          <button
                            type="button"
                            disabled={isSelf}
                            onClick={() => handleToggleBan(user)}
                            className={`p-2 sm:px-2.5 sm:py-1 rounded-lg text-xs font-medium border transition-colors flex items-center justify-center gap-1 min-w-[34px] min-h-[34px] ${
                              user.isBanned
                                ? "border-emerald-500/30 bg-emerald-600/10 text-emerald-300 hover:bg-emerald-600/20"
                                : "border-rose-500/30 bg-rose-600/10 text-rose-300 hover:bg-rose-600/20"
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
                                <Unlock className="w-3.5 h-3.5" />
                                <span className="hidden md:inline">{t("admin.unbanBtn")}</span>
                              </>
                            ) : (
                              <>
                                <Ban className="w-3.5 h-3.5" />
                                <span className="hidden md:inline">{t("admin.banBtn")}</span>
                              </>
                            )}
                          </button>

                          {/* Delete button */}
                          <button
                            type="button"
                            disabled={isSelf || isLocalAdmin}
                            onClick={() => setDeleteTargetUser(user)}
                            className={`p-2 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-zinc-800 transition-colors min-w-[34px] min-h-[34px] flex items-center justify-center ${
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
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 2: SYSTEM SETTINGS & STATS */}
          {activeTab === "settings" && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* System Stats Card */}
              {stats && (
                <div className="p-4 sm:p-5 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-3">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Shield className="w-4 h-4 text-violet-400" />
                    <span>{t("admin.systemSummary")}</span>
                  </h3>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                    <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80">
                      <div className="text-zinc-500 text-[11px] font-medium">{t("admin.totalUsers")}</div>
                      <div className="text-lg font-bold text-white mt-1">{stats.totalUsers}</div>
                    </div>

                    <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80">
                      <div className="text-zinc-500 text-[11px] font-medium">{t("admin.adminUsers")}</div>
                      <div className="text-lg font-bold text-violet-400 mt-1">{stats.adminUsers}</div>
                    </div>

                    <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80">
                      <div className="text-zinc-500 text-[11px] font-medium">{t("admin.bannedUsers")}</div>
                      <div className="text-lg font-bold text-rose-400 mt-1">{stats.bannedUsers}</div>
                    </div>

                    <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80">
                      <div className="text-zinc-500 text-[11px] font-medium">{t("admin.totalSnippets")}</div>
                      <div className="text-lg font-bold text-sky-400 mt-1">{stats.totalSnippets}</div>
                    </div>
                  </div>
                </div>
              )}

            </div>
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
            className="px-4 py-1.5 sm:py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            {t("common.close")}
          </button>
        </div>
      </div>

      {/* MODAL: CREATE USER */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-modal-backdrop">
          <div className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-5 sm:p-6 shadow-2xl flex flex-col gap-4 animate-modal-content">
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
                className="p-1 rounded-lg text-zinc-400 hover:text-white"
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
                    className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
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
                    className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
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
                  className="px-3 py-1.5 rounded-xl text-xs font-medium text-zinc-400 hover:text-white"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={creatingUser}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 disabled:opacity-50 transition-all shadow-md shadow-violet-600/20"
                >
                  {creatingUser && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{t("admin.createUserBtn")}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RESET PASSWORD */}
      {resetTargetUser && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-modal-backdrop">
          <div className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-5 sm:p-6 shadow-2xl flex flex-col gap-4 animate-modal-content">
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
                className="p-1 rounded-lg text-zinc-400 hover:text-white"
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
                  className="px-3 py-1.5 rounded-xl text-xs font-medium text-zinc-400 hover:text-white"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={resettingPassword || resetPasswordVal.length < 6}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 disabled:opacity-50 transition-all shadow-md shadow-amber-600/20"
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-modal-backdrop">
          <div className="relative w-full max-w-md rounded-2xl border border-rose-500/30 bg-zinc-950 p-5 sm:p-6 shadow-2xl flex flex-col gap-4 animate-modal-content">
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
                className="px-3.5 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white"
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                disabled={deletingUser}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-50 transition-all shadow-lg shadow-rose-600/20"
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
