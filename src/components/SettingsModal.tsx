"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Copy,
  Eye,
  EyeOff,
  Globe,
  KeyRound,
  Loader2,
  Lock,
  LogOut,
  QrCode,
  Save,
  Settings as SettingsIcon,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  User as UserIcon,
  X,
} from "lucide-react";
import { SUPPORTED_LANGUAGES } from "@/lib/languages";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: {
    id: string;
    email: string;
    name: string | null;
    bio: string | null;
    twoFactorEnabled: boolean;
  } | null;
  onUserUpdated?: () => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  currentUser,
  onUserUpdated,
}: SettingsModalProps) {
  const router = useRouter();

  // Active Tab: "profile" | "ai" | "general"
  const [activeTab, setActiveTab] = useState<"profile" | "ai" | "general">("profile");

  // User Profile State
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // 2FA Setup State
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [settingUp2FA, setSettingUp2FA] = useState(false);
  const [setupData, setSetupData] = useState<{
    secret: string;
    qrCode: string;
    otpauthUrl: string;
  } | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [twoFactorSuccess, setTwoFactorSuccess] = useState<string | null>(null);
  const [twoFactorError, setTwoFactorError] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);

  // AI State
  const [provider, setProvider] = useState<"openai" | "gemini" | "custom">("openai");
  const [apiKey, setApiKey] = useState("");
  const [hasApiKey, setHasApiKey] = useState(false);
  const [maskedKey, setMaskedKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("https://api.openai.com/v1");
  const [model, setModel] = useState("gpt-4o-mini");
  const [showKey, setShowKey] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSaving, setAiSaving] = useState(false);
  const [aiSuccess, setAiSuccess] = useState(false);

  // General App Preferences
  const [defaultVisibility, setDefaultVisibility] = useState<"PUBLIC" | "UNLISTED" | "PRIVATE">("PUBLIC");
  const [defaultLanguage, setDefaultLanguage] = useState("typescript");
  const [generalSaving, setGeneralSaving] = useState(false);
  const [generalSuccess, setGeneralSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadProfileAndSettings();
    }
  }, [isOpen, currentUser]);

  const loadProfileAndSettings = async () => {
    // 1. Profile
    if (currentUser) {
      setName(currentUser.name || "");
      setBio(currentUser.bio || "");
      setTwoFactorEnabled(currentUser.twoFactorEnabled);
    } else {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (data.success && data.user) {
          setName(data.user.name || "");
          setBio(data.user.bio || "");
          setTwoFactorEnabled(data.user.twoFactorEnabled);
        }
      } catch (e) {
        console.error(e);
      }
    }

    // 2. AI Settings
    try {
      setAiLoading(true);
      const res = await fetch("/api/settings");
      const data = await res.json();
      if (data.success && data.settings) {
        setProvider(data.settings.provider || "openai");
        setHasApiKey(data.settings.hasApiKey || false);
        setMaskedKey(data.settings.maskedKey || "");
        setBaseUrl(data.settings.baseUrl || "https://api.openai.com/v1");
        setModel(data.settings.model || "gpt-4o-mini");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAiLoading(false);
    }

    // 3. General preferences from localStorage
    const savedVis = localStorage.getItem("snippetvault_default_visibility") as any;
    if (savedVis) setDefaultVisibility(savedVis);
    const savedLang = localStorage.getItem("snippetvault_default_language");
    if (savedLang) setDefaultLanguage(savedLang);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileError(null);
    setProfileSuccess(null);

    try {
      const res = await fetch("/api/auth/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          bio,
          currentPassword: currentPassword || undefined,
          newPassword: newPassword || undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Не удалось обновить профиль");
      }

      setProfileSuccess("Профиль успешно обновлен!");
      setCurrentPassword("");
      setNewPassword("");
      onUserUpdated?.();
      setTimeout(() => setProfileSuccess(null), 2500);
    } catch (err: any) {
      setProfileError(err.message);
    } finally {
      setProfileSaving(false);
    }
  };

  // 2FA Handlers
  const handleStart2FASetup = async () => {
    setTwoFactorLoading(true);
    setTwoFactorError(null);
    try {
      const res = await fetch("/api/auth/2fa/setup");
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Ошибка генерации 2FA");
      setSetupData(data);
      setSettingUp2FA(true);
    } catch (e: any) {
      setTwoFactorError(e.message);
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleConfirm2FA = async () => {
    if (!setupData || verificationCode.trim().length !== 6) {
      setTwoFactorError("Введите 6-значный код из приложения");
      return;
    }
    setTwoFactorLoading(true);
    setTwoFactorError(null);
    try {
      const res = await fetch("/api/auth/2fa/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: setupData.secret,
          code: verificationCode.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Неверный код");

      setTwoFactorEnabled(true);
      setSettingUp2FA(false);
      setSetupData(null);
      setVerificationCode("");
      setTwoFactorSuccess("Двухфакторная аутентификация успешно подключена!");
      onUserUpdated?.();
      setTimeout(() => setTwoFactorSuccess(null), 3000);
    } catch (e: any) {
      setTwoFactorError(e.message);
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!disablePassword) {
      setTwoFactorError("Введите текущий пароль для подтверждения");
      return;
    }
    setTwoFactorLoading(true);
    setTwoFactorError(null);
    try {
      const res = await fetch("/api/auth/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: disablePassword }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Неверный пароль");

      setTwoFactorEnabled(false);
      setShowDisableConfirm(false);
      setDisablePassword("");
      setTwoFactorSuccess("2FA успешно отключена");
      onUserUpdated?.();
      setTimeout(() => setTwoFactorSuccess(null), 3000);
    } catch (e: any) {
      setTwoFactorError(e.message);
    } finally {
      setTwoFactorLoading(false);
    }
  };

  // AI Save
  const handleSaveAI = async (e: React.FormEvent) => {
    e.preventDefault();
    setAiSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          apiKey: apiKey.trim(),
          baseUrl: baseUrl.trim(),
          model: model.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);
      setAiSuccess(true);
      setTimeout(() => setAiSuccess(false), 2000);
    } catch (e: any) {
      alert(e.message || "Ошибка сохранения");
    } finally {
      setAiSaving(false);
    }
  };

  // General Settings Save
  const handleSaveGeneral = (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralSaving(true);
    localStorage.setItem("snippetvault_default_visibility", defaultVisibility);
    localStorage.setItem("snippetvault_default_language", defaultLanguage);
    setGeneralSuccess(true);
    setTimeout(() => {
      setGeneralSaving(false);
      setGeneralSuccess(false);
    }, 1500);
  };

  const handleLogout = async () => {
    if (confirm("Вы действительно хотите выйти из аккаунта?")) {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-modal-backdrop">
      <div className="relative w-full max-w-2xl max-h-[92vh] rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden flex flex-col animate-modal-content">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/60">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-600/20 text-violet-400 border border-violet-500/30">
              <SettingsIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">
                Параметры и Личный кабинет
              </h2>
              <p className="text-xs text-zinc-400">
                Управление профилем, безопасностью и настройками приложения
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center px-6 border-b border-zinc-800 bg-zinc-950/90 text-xs font-semibold gap-1 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={`flex items-center gap-2 py-3 px-3.5 border-b-2 transition-all whitespace-nowrap ${
              activeTab === "profile"
                ? "border-violet-500 text-white"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span>Личный кабинет & 2FA</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("ai")}
            className={`flex items-center gap-2 py-3 px-3.5 border-b-2 transition-all whitespace-nowrap ${
              activeTab === "ai"
                ? "border-violet-500 text-white"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Ассистент</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("general")}
            className={`flex items-center gap-2 py-3 px-3.5 border-b-2 transition-all whitespace-nowrap ${
              activeTab === "general"
                ? "border-violet-500 text-white"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Общие настройки</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto p-6 text-xs text-zinc-200 space-y-6">
          {/* TAB 1: PROFILE & 2FA */}
          {activeTab === "profile" && (
            <div className="space-y-6">
              {profileError && (
                <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300">
                  {profileError}
                </div>
              )}
              {profileSuccess && (
                <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  <span>{profileSuccess}</span>
                </div>
              )}

              {/* Personal Info Form */}
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="border-b border-zinc-800/80 pb-4 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <UserIcon className="w-3.5 h-3.5 text-violet-400" />
                    <span>Информация о себе</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-zinc-400 text-[11px] font-medium">
                        Имя / Псевдоним
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ваше имя"
                        className="w-full px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-100 placeholder-zinc-500 outline-none focus:border-violet-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-zinc-400 text-[11px] font-medium">
                        Email адрес (логин)
                      </label>
                      <input
                        type="email"
                        disabled
                        value={currentUser?.email || ""}
                        className="w-full px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-400 cursor-not-allowed opacity-75"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-zinc-400 text-[11px] font-medium">
                      О себе / Краткое описание
                    </label>
                    <textarea
                      rows={2}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Senior Fullstack Developer / DevOps / etc."
                      className="w-full px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-100 placeholder-zinc-500 outline-none focus:border-violet-500 resize-none"
                    />
                  </div>
                </div>

                {/* Change Password Sub-block */}
                <div className="border-b border-zinc-800/80 pb-4 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                    <span>Смена пароля</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-zinc-400 text-[11px] font-medium">
                        Текущий пароль
                      </label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-100 placeholder-zinc-500 outline-none focus:border-violet-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-zinc-400 text-[11px] font-medium">
                        Новый пароль
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Минимум 6 символов"
                        className="w-full px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-100 placeholder-zinc-500 outline-none focus:border-violet-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={profileSaving}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold text-white bg-violet-600 hover:bg-violet-500 active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    {profileSaving ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    <span>Сохранить профиль</span>
                  </button>
                </div>
              </form>

              {/* 2FA Security Section */}
              <div className="border border-zinc-800/80 rounded-2xl p-4 bg-zinc-900/40 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                        Двухфакторная аутентификация (2FA)
                      </h3>
                      {twoFactorEnabled ? (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                          <ShieldCheck className="w-3 h-3" />
                          Подключена
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-full">
                          Отключена
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      Защита аккаунта 6-значным кодом из Google Authenticator или Apple Passwords
                    </p>
                  </div>

                  {!twoFactorEnabled && !settingUp2FA && (
                    <button
                      type="button"
                      onClick={handleStart2FASetup}
                      disabled={twoFactorLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium text-white bg-violet-600 hover:bg-violet-500 active:scale-[0.98] transition-all"
                    >
                      {twoFactorLoading ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <ShieldCheck className="w-3.5 h-3.5" />
                      )}
                      <span>Подключить 2FA</span>
                    </button>
                  )}

                  {twoFactorEnabled && !showDisableConfirm && (
                    <button
                      type="button"
                      onClick={() => setShowDisableConfirm(true)}
                      className="px-3 py-1.5 rounded-xl font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 transition-all"
                    >
                      Отключить 2FA
                    </button>
                  )}
                </div>

                {twoFactorSuccess && (
                  <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    <span>{twoFactorSuccess}</span>
                  </div>
                )}
                {twoFactorError && (
                  <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300">
                    {twoFactorError}
                  </div>
                )}

                {/* 2FA Setup Flow */}
                {settingUp2FA && setupData && (
                  <div className="p-4 rounded-xl border border-violet-500/30 bg-zinc-950 space-y-4 animate-in fade-in">
                    <div className="space-y-1">
                      <div className="font-semibold text-white text-xs">
                        Шаг 1: Сканируйте QR-код приложением аутентификатором
                      </div>
                      <p className="text-[11px] text-zinc-400">
                        Откройте Google Authenticator, Яндекс Ключ, Authy или Apple Passwords и наведите камеру:
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      {/* QR Code */}
                      <div className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl flex-shrink-0">
                        <img
                          src={setupData.qrCode}
                          alt="2FA QR Code"
                          className="w-40 h-40 rounded-lg"
                        />
                      </div>

                      {/* Manual Secret Key */}
                      <div className="space-y-3 flex-1 min-w-0">
                        <div className="space-y-1">
                          <span className="text-[10px] text-zinc-400 uppercase font-medium">
                            Или введите ключ доступа вручную:
                          </span>
                          <div className="flex items-center gap-2">
                            <code className="px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg font-mono text-violet-300 select-all text-xs truncate">
                              {setupData.secret}
                            </code>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(setupData.secret);
                                setCopiedSecret(true);
                                setTimeout(() => setCopiedSecret(false), 2000);
                              }}
                              className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:text-white"
                              title="Скопировать ключ"
                            >
                              {copiedSecret ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5 text-zinc-400" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Verification Input */}
                        <div className="space-y-1.5 pt-1">
                          <label className="text-[11px] font-semibold text-white">
                            Шаг 2: Введите 6-значный проверочный код из приложения
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              maxLength={6}
                              placeholder="123456"
                              value={verificationCode}
                              onChange={(e) =>
                                setVerificationCode(
                                  e.target.value.replace(/\D/g, "").slice(0, 6)
                                )
                              }
                              className="w-36 px-3 py-2 text-center font-mono tracking-widest text-base rounded-xl border border-zinc-800 bg-zinc-900 text-white outline-none focus:border-violet-500"
                            />
                            <button
                              type="button"
                              onClick={handleConfirm2FA}
                              disabled={twoFactorLoading || verificationCode.length !== 6}
                              className="px-4 py-2 rounded-xl font-semibold text-white bg-violet-600 hover:bg-violet-500 active:scale-[0.98] transition-all disabled:opacity-50"
                            >
                              {twoFactorLoading ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                "Активировать"
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSettingUp2FA(false);
                                setSetupData(null);
                              }}
                              className="px-3 py-2 text-zinc-400 hover:text-white"
                            >
                              Отмена
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Disable Confirm Block */}
                {showDisableConfirm && (
                  <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/5 space-y-3 animate-in fade-in">
                    <div className="space-y-1">
                      <div className="font-semibold text-rose-300 text-xs flex items-center gap-1.5">
                        <ShieldAlert className="w-4 h-4" />
                        <span>Подтвердите отключение 2FA</span>
                      </div>
                      <p className="text-[11px] text-zinc-400">
                        Введите ваш текущий пароль для подтверждения отключения двухфакторной аутентификации:
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="password"
                        placeholder="Текущий пароль"
                        value={disablePassword}
                        onChange={(e) => setDisablePassword(e.target.value)}
                        className="w-64 px-3 py-1.5 rounded-xl border border-zinc-800 bg-zinc-900 text-white outline-none focus:border-rose-500 text-xs"
                      />
                      <button
                        type="button"
                        onClick={handleDisable2FA}
                        disabled={twoFactorLoading}
                        className="px-3 py-1.5 rounded-xl font-semibold text-white bg-rose-600 hover:bg-rose-500 transition-all text-xs"
                      >
                        {twoFactorLoading ? "Отключение..." : "Отключить"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowDisableConfirm(false);
                          setDisablePassword("");
                        }}
                        className="px-2.5 py-1.5 text-zinc-400 hover:text-white text-xs"
                      >
                        Отмена
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: AI ASSISTANT */}
          {activeTab === "ai" && (
            <form onSubmit={handleSaveAI} className="space-y-4">
              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-300 uppercase tracking-wider text-[11px]">
                  Провайдер AI
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setProvider("openai");
                      setBaseUrl("https://api.openai.com/v1");
                      setModel("gpt-4o-mini");
                    }}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      provider === "openai"
                        ? "border-violet-500 bg-violet-600/10 text-white font-medium"
                        : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    OpenAI
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProvider("gemini");
                      setBaseUrl("https://generativelanguage.googleapis.com");
                      setModel("gemini-1.5-flash");
                    }}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      provider === "gemini"
                        ? "border-violet-500 bg-violet-600/10 text-white font-medium"
                        : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    Google Gemini
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProvider("custom");
                      setBaseUrl("http://localhost:11434/v1");
                      setModel("llama3");
                    }}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      provider === "custom"
                        ? "border-violet-500 bg-violet-600/10 text-white font-medium"
                        : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    Ollama / Custom
                  </button>
                </div>
              </div>

              {/* API Key */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-zinc-300 uppercase tracking-wider text-[11px]">
                    API Ключ {provider === "custom" && "(Опционально)"}
                  </label>
                  {hasApiKey && !apiKey && (
                    <span className="text-[10px] text-emerald-400 font-medium">
                      ✓ Ключ сохранен ({maskedKey})
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showKey ? "text" : "password"}
                    placeholder={
                      hasApiKey
                        ? "Введите новый ключ для замены..."
                        : provider === "gemini"
                        ? "AIzaSy..."
                        : "sk-..."
                    }
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full px-3 py-2 pr-10 rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-100 placeholder-zinc-500 outline-none focus:border-violet-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-2.5 text-zinc-500 hover:text-zinc-300"
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Base URL & Model */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-semibold text-zinc-300 uppercase tracking-wider text-[11px]">
                    Base URL
                  </label>
                  <input
                    type="text"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-100 placeholder-zinc-500 outline-none focus:border-violet-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-zinc-300 uppercase tracking-wider text-[11px]">
                    Модель
                  </label>
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-100 placeholder-zinc-500 outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={aiSaving}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold text-white bg-violet-600 hover:bg-violet-500 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {aiSaving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : aiSuccess ? (
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>{aiSuccess ? "Сохранено!" : "Сохранить настройки AI"}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: GENERAL SETTINGS */}
          {activeTab === "general" && (
            <form onSubmit={handleSaveGeneral} className="space-y-5">
              <div className="space-y-2">
                <label className="font-semibold text-zinc-300 uppercase tracking-wider text-[11px]">
                  Видимость сниппетов по умолчанию
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setDefaultVisibility("PUBLIC")}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      defaultVisibility === "PUBLIC"
                        ? "border-violet-500 bg-violet-600/10 text-white font-medium"
                        : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <div className="font-semibold text-white text-xs mb-0.5">Публичный</div>
                    <div className="text-[10px] text-zinc-400">Виден всем пользователям</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDefaultVisibility("UNLISTED")}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      defaultVisibility === "UNLISTED"
                        ? "border-violet-500 bg-violet-600/10 text-white font-medium"
                        : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <div className="font-semibold text-white text-xs mb-0.5">По ссылке</div>
                    <div className="text-[10px] text-zinc-400">Доступ только по URL</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDefaultVisibility("PRIVATE")}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      defaultVisibility === "PRIVATE"
                        ? "border-violet-500 bg-violet-600/10 text-white font-medium"
                        : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <div className="font-semibold text-white text-xs mb-0.5">Приватный</div>
                    <div className="text-[10px] text-zinc-400">Только в вашем аккаунте</div>
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-300 uppercase tracking-wider text-[11px]">
                  Язык по умолчанию для новых сниппетов
                </label>
                <select
                  value={defaultLanguage}
                  onChange={(e) => setDefaultLanguage(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-100 outline-none focus:border-violet-500 cursor-pointer"
                >
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <option key={lang.id} value={lang.id}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={generalSaving}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold text-white bg-violet-600 hover:bg-violet-500 active:scale-[0.98] transition-all"
                >
                  {generalSuccess ? (
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>{generalSuccess ? "Сохранено!" : "Сохранить параметры"}</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer with Logout Button */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-zinc-800 bg-zinc-900/40">
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs font-medium text-rose-400 hover:text-rose-300 px-2.5 py-1.5 rounded-lg hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Выйти из аккаунта</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
