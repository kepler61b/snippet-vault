"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import { getCollectionBreadcrumbPath } from "@/lib/collection-utils";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertCircle,
  ArrowUpDown,
  Blocks,
  Calendar,
  Check,
  Clock,
  Copy,
  Database,
  Download,
  Edit2,
  ExternalLink,
  Eye,
  EyeOff,
  FileUp,
  Filter,
  Fingerprint,
  FolderGit2,
  Globe,
  HardDrive,
  KeyRound,
  Laptop,
  LayoutGrid,
  List,
  Loader2,
  Lock,
  LogOut,
  Plus,
  QrCode,
  RefreshCw,
  Save,
  Settings as SettingsIcon,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Terminal,
  Trash2,
  Upload,
  User as UserIcon,
  X,
} from "lucide-react";
import { startRegistration, browserSupportsWebAuthn } from "@simplewebauthn/browser";
import { ViewMode, SortOption, SORT_OPTIONS, CollectionItem } from "@/types/snippet";
import { CollectionIcon } from "@/lib/collection-icons";
import { CustomSelect, CustomSelectOption } from "@/components/ui/CustomSelect";
import { useI18n, Locale, getLocalizedSortOptions } from "@/lib/i18n";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: {
    id: string;
    email: string;
    name: string | null;
    bio: string | null;
    role?: string;
    twoFactorEnabled: boolean;
  } | null;
  onUserUpdated?: () => void;
  onSettingsChanged?: () => void;
  initialTab?: "general" | "profile" | "security" | "integrations" | "ai" | "data";
}

export function SettingsModal({
  isOpen,
  onClose,
  currentUser,
  onUserUpdated,
  onSettingsChanged,
  initialTab,
}: SettingsModalProps) {
  const router = useRouter();
  const { t, locale, setLocale } = useI18n();

  // Prevent background scrolling while modal is open
  useLockBodyScroll(isOpen);

  // Active Tab: "general" | "profile" | "security" | "integrations" | "ai" | "data"
  const [activeTab, setActiveTab] = useState<
    "general" | "profile" | "security" | "integrations" | "ai" | "data"
  >(initialTab || "general");

  // Modal Smooth Height Animation State & Refs
  const dialogRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const innerContentRef = useRef<HTMLDivElement>(null);

  const [modalHeight, setModalHeight] = useState<number | undefined>(undefined);
  const [hasTransition, setHasTransition] = useState(false);
  const isReadyForTransitionRef = useRef(false);

  const updateModalHeight = () => {
    if (!headerRef.current || !tabsRef.current || !innerContentRef.current) return;
    const headerH = headerRef.current.offsetHeight;
    const tabsH = tabsRef.current.offsetHeight;
    const footerH = footerRef.current ? footerRef.current.offsetHeight : 0;
    const contentH = innerContentRef.current.offsetHeight;
    if (contentH === 0) return;
    const targetH = headerH + tabsH + contentH + footerH;
    const viewportH = window.visualViewport?.height || window.innerHeight;
    const maxH = window.innerWidth < 640 ? viewportH : viewportH * 0.92;
    const finalH = Math.min(targetH, maxH);
    setModalHeight(Math.round(finalH));
  };

  useEffect(() => {
    if (!isOpen) {
      isReadyForTransitionRef.current = false;
      setHasTransition(false);
      setModalHeight(undefined);
      return;
    }

    setActiveTab(initialTab || "general");
    if ((initialTab || activeTab) === "integrations") {
      loadTokensList();
      loadIntegrationLogs();
    }

    // Initial measurement
    updateModalHeight();

    // Enable smooth height transitions after entrance animation (0.28s) completes
    const timer = setTimeout(() => {
      isReadyForTransitionRef.current = true;
      setHasTransition(true);
      updateModalHeight();
    }, 280);

    let observer: ResizeObserver | null = null;
    if (innerContentRef.current && typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(() => {
        updateModalHeight();
      });
      observer.observe(innerContentRef.current);
    }

    const handleResize = () => {
      updateModalHeight();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      clearTimeout(timer);
      if (observer) observer.disconnect();
      window.removeEventListener("resize", handleResize);
    };
  }, [isOpen]);

  const handleTabChange = (
    tab: "general" | "profile" | "security" | "integrations" | "ai" | "data",
    e?: React.MouseEvent<HTMLButtonElement>
  ) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    if (tab === "data") {
      loadCollectionsList();
    }
    if (tab === "integrations") {
      loadTokensList();
      loadIntegrationLogs();
    }
    if (e?.currentTarget) {
      e.currentTarget.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: "instant" });
    requestAnimationFrame(() => {
      updateModalHeight();
    });
  };

  // Data Export & Import State
  const [userCollections, setUserCollections] = useState<CollectionItem[]>([]);
  const [selectedExportColId, setSelectedExportColId] = useState<string>("");
  const [importing, setImporting] = useState(false);
  const [clearingDb, setClearingDb] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isClosingClearConfirm, setIsClosingClearConfirm] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isClosingLogoutConfirm, setIsClosingLogoutConfirm] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  // User Profile State
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Security & Password State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

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

  // Passkey State
  const [passkeys, setPasskeys] = useState<{
    id: string;
    name: string;
    deviceType: string | null;
    backedUp: boolean;
    createdAt: string;
    lastUsedAt: string | null;
  }[]>([]);
  const [passkeysLoading, setPasskeysLoading] = useState(false);
  const [passkeyCreating, setPasskeyCreating] = useState(false);
  const [passkeySuccess, setPasskeySuccess] = useState<string | null>(null);
  const [passkeyError, setPasskeyError] = useState<string | null>(null);
  const [passkeySupported, setPasskeySupported] = useState(true);
  const [editingPasskeyId, setEditingPasskeyId] = useState<string | null>(null);
  const [editingPasskeyName, setEditingPasskeyName] = useState("");

  // AI State
  const [provider, setProvider] = useState<"openai" | "gemini" | "custom">("openai");
  const [apiKey, setApiKey] = useState("");
  const [hasApiKey, setHasApiKey] = useState(false);
  const [maskedKey, setMaskedKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("https://api.openai.com/v1");
  const [model, setModel] = useState("gpt-4o-mini");
  const [proxyUrl, setProxyUrl] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSaving, setAiSaving] = useState(false);
  const [aiSuccess, setAiSuccess] = useState(false);
  const [aiTesting, setAiTesting] = useState(false);
  const [aiTestResult, setAiTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [availableModels, setAvailableModels] = useState<{ id: string; name: string; description?: string }[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [isManualModelInput, setIsManualModelInput] = useState(false);
  const modelFetchTimerRef = useRef<NodeJS.Timeout | null>(null);

  // General App Preferences
  const [defaultViewMode, setDefaultViewMode] = useState<ViewMode>("grid");
  const [defaultSortBy, setDefaultSortBy] = useState<SortOption>("CREATED_DESC");
  const [selectedLang, setSelectedLang] = useState<Locale>(locale);
  const [generalSaving, setGeneralSaving] = useState(false);
  const [generalSuccess, setGeneralSuccess] = useState(false);

  useEffect(() => {
    setSelectedLang(locale);
  }, [locale, isOpen]);

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
        setProxyUrl(data.settings.proxyUrl || "");

        if (data.settings.hasApiKey || data.settings.provider === "custom") {
          loadAvailableModels("", data.settings.provider, data.settings.baseUrl, data.settings.proxyUrl);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAiLoading(false);
    }

    // 3. General preferences from localStorage
    const savedView = localStorage.getItem("snippetvault_view_mode") as ViewMode;
    if (savedView === "grid" || savedView === "list") setDefaultViewMode(savedView);
    const savedSort = localStorage.getItem("snippetvault_sort_by") as SortOption;
    if (savedSort && SORT_OPTIONS.some((o) => o.id === savedSort)) setDefaultSortBy(savedSort);
    const savedLang = (localStorage.getItem("snippetvault_lang") as Locale) || locale;
    if (savedLang === "ru" || savedLang === "en") setSelectedLang(savedLang);

    // 4. Passkeys
    setPasskeySupported(browserSupportsWebAuthn());
    loadPasskeys();

    // 5. Collections for export
    loadCollectionsList();
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
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Не удалось сохранить профиль");
      }

      setProfileSuccess("Профиль успешно сохранен!");
      onUserUpdated?.();
      setTimeout(() => setProfileSuccess(null), 2500);
    } catch (err: any) {
      setProfileError(err.message);
    } finally {
      setProfileSaving(false);
    }
  };

  // Personal Access Tokens (PAT) State
  const [tokens, setTokens] = useState<
    Array<{
      id: string;
      name: string;
      tokenPrefix: string;
      lastUsedAt: string | null;
      expiresAt: string | null;
      createdAt: string;
    }>
  >([]);
  const [tokensLoading, setTokensLoading] = useState(false);
  const [newTokenName, setNewTokenName] = useState("");
  const [newTokenExpiresIn, setNewTokenExpiresIn] = useState<number | null>(30);
  const [isCreatingToken, setIsCreatingToken] = useState(false);
  const [isTokenFormOpen, setIsTokenFormOpen] = useState(false);
  const [justGeneratedToken, setJustGeneratedToken] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [tokenSuccess, setTokenSuccess] = useState<string | null>(null);
  const [deletingTokenId, setDeletingTokenId] = useState<string | null>(null);

  const loadTokensList = async () => {
    try {
      setTokensLoading(true);
      const res = await fetch("/api/tokens");
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.tokens)) {
          setTokens(data.tokens);
        }
      }
    } catch (err) {
      console.error("Failed to load tokens:", err);
    } finally {
      setTokensLoading(false);
      requestAnimationFrame(() => updateModalHeight());
    }
  };

  const handleCreateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTokenName.trim()) {
      setTokenError(t("settings.tokens.nameRequired"));
      return;
    }
    try {
      setIsCreatingToken(true);
      setTokenError(null);
      setTokenSuccess(null);
      const res = await fetch("/api/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTokenName.trim(),
          expiresInDays: newTokenExpiresIn,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create token");
      }
      setJustGeneratedToken(data.token);
      setNewTokenName("");
      setIsTokenFormOpen(false);
      if (data.pat) {
        setTokens((prev) => [data.pat, ...prev]);
      }
      setTokenSuccess(t("settings.tokens.createdSuccess"));
    } catch (err: any) {
      setTokenError(err.message || "Failed to create token");
    } finally {
      setIsCreatingToken(false);
      requestAnimationFrame(() => updateModalHeight());
    }
  };

  const handleRevokeToken = async (tokenId: string) => {
    if (!confirm(t("settings.tokens.revokeConfirm"))) return;
    try {
      setDeletingTokenId(tokenId);
      const res = await fetch(`/api/tokens/${tokenId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to revoke token");
      }
      setTokens((prev) => prev.filter((t) => t.id !== tokenId));
    } catch (err: any) {
      alert(err.message || "Failed to revoke token");
    } finally {
      setDeletingTokenId(null);
      requestAnimationFrame(() => updateModalHeight());
    }
  };

  const handleCopyGeneratedToken = async () => {
    if (!justGeneratedToken) return;
    try {
      await navigator.clipboard.writeText(justGeneratedToken);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  // Integration Logs & Stats State
  const [integrationLogs, setIntegrationLogs] = useState<
    Array<{
      id: string;
      client: string;
      action: string;
      method: string;
      path: string;
      status: number;
      details: string | null;
      tokenPrefix: string | null;
      ip: string | null;
      userAgent: string | null;
      createdAt: string;
    }>
  >([]);
  const [integrationLogsLoading, setIntegrationLogsLoading] = useState(false);
  const [logsFilter, setLogsFilter] = useState<"all" | "success" | "error">("all");
  const [integrationStats, setIntegrationStats] = useState<{
    total: number;
    vsCodeCount: number;
    curlCount: number;
    errorsCount: number;
    lastActive: string | null;
  } | null>(null);

  const loadIntegrationLogs = async (silent = false) => {
    try {
      if (!silent) setIntegrationLogsLoading(true);
      const res = await fetch("/api/integrations/logs");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setIntegrationLogs(data.logs || []);
          setIntegrationStats(data.stats || null);
        }
      }
    } catch (err) {
      console.error("Failed to load integration logs:", err);
    } finally {
      if (!silent) setIntegrationLogsLoading(false);
      requestAnimationFrame(() => updateModalHeight());
    }
  };

  // Auto-refresh integration logs and activity stats while Integrations tab is active
  useEffect(() => {
    if (!isOpen || activeTab !== "integrations") return;

    loadIntegrationLogs(false);

    const interval = setInterval(() => {
      loadIntegrationLogs(true);
    }, 3000);

    const handleFocus = () => {
      loadIntegrationLogs(true);
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [isOpen, activeTab]);

  const handleClearIntegrationLogs = async () => {
    if (!confirm(t("settings.integrations.confirmClearLogs"))) return;
    try {
      const res = await fetch("/api/integrations/logs", { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.success) {
        setIntegrationLogs([]);
        setIntegrationStats((prev) =>
          prev
            ? { ...prev, total: 0, vsCodeCount: 0, curlCount: 0, errorsCount: 0, lastActive: null }
            : null
        );
      }
    } catch (err) {
      console.error("Failed to clear logs:", err);
    } finally {
      requestAnimationFrame(() => updateModalHeight());
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword) {
      setPasswordError("Введите текущий пароль");
      return;
    }
    if (!newPassword) {
      setPasswordError("Введите новый пароль");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("Новый пароль должен содержать минимум 6 символов");
      return;
    }

    setPasswordSaving(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Не удалось изменить пароль");
      }

      setPasswordSuccess("Пароль успешно обновлен!");
      setCurrentPassword("");
      setNewPassword("");
      setTimeout(() => setPasswordSuccess(null), 2500);
    } catch (err: any) {
      setPasswordError(err.message);
    } finally {
      setPasswordSaving(false);
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

  // Passkey Handlers
  const loadPasskeys = async () => {
    try {
      setPasskeysLoading(true);
      const res = await fetch("/api/auth/passkey/list");
      const data = await res.json();
      if (data.success && data.passkeys) {
        setPasskeys(data.passkeys);
      }
    } catch (e) {
      console.error("loadPasskeys error:", e);
    } finally {
      setPasskeysLoading(false);
    }
  };

  const handleAddPasskey = async () => {
    setPasskeyError(null);
    setPasskeySuccess(null);
    setPasskeyCreating(true);

    try {
      // 1. Fetch registration options
      const res = await fetch("/api/auth/passkey/register/options", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || t("settings.security.passkeyAddError"));
      }

      // 2. Prompt browser authenticator (Windows Hello, Touch ID, Security Key)
      const regResp = await startRegistration({ optionsJSON: data.options });

      // 3. Ask for optional friendly name
      const formattedDate = new Date().toLocaleDateString(locale === "ru" ? "ru-RU" : "en-US");
      const defaultName = t("settings.security.passkeyDefaultName", { date: formattedDate });
      const chosenName = window.prompt(t("settings.security.passkeyPromptName"), defaultName) || defaultName;

      // 4. Verify with server
      const verifyRes = await fetch("/api/auth/passkey/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: regResp, name: chosenName }),
      });
      const verifyData = await verifyRes.json();

      if (!verifyRes.ok || !verifyData.success) {
        throw new Error(verifyData.error || t("settings.security.passkeyAddError"));
      }

      setPasskeySuccess(t("settings.security.passkeySuccessAdded"));
      setTimeout(() => setPasskeySuccess(null), 4000);
      await loadPasskeys();
    } catch (err: any) {
      console.warn("Passkey add error:", err);
      if (
        err.name === "NotAllowedError" ||
        err.message?.includes("cancelled") ||
        err.message?.includes("aborted")
      ) {
        setPasskeyError(t("settings.security.passkeyCancelled"));
      } else {
        setPasskeyError(err.message || t("settings.security.passkeyAddError"));
      }
    } finally {
      setPasskeyCreating(false);
    }
  };

  const handleDeletePasskey = async (id: string, name: string) => {
    if (!confirm(t("settings.security.deletePasskeyConfirm", { name }))) {
      return;
    }
    setPasskeyError(null);
    try {
      const res = await fetch(`/api/auth/passkey/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || t("common.error"));
      }
      setPasskeySuccess(t("settings.security.passkeySuccessDeleted"));
      setTimeout(() => setPasskeySuccess(null), 3000);
      await loadPasskeys();
    } catch (err: any) {
      setPasskeyError(err.message || t("common.error"));
    }
  };

  const handleSavePasskeyName = async (id: string) => {
    if (!editingPasskeyName.trim()) return;
    try {
      const res = await fetch(`/api/auth/passkey/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingPasskeyName.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Ошибка переименования");
      }
      setEditingPasskeyId(null);
      await loadPasskeys();
    } catch (err: any) {
      setPasskeyError(err.message);
    }
  };

  // Load Available AI Models
  const loadAvailableModels = async (
    keyOverride?: string,
    providerOverride?: "openai" | "gemini" | "custom",
    baseUrlOverride?: string,
    proxyOverride?: string
  ) => {
    const curKey = keyOverride !== undefined ? keyOverride : apiKey;
    const curProv = providerOverride || provider;
    const curBase = baseUrlOverride !== undefined ? baseUrlOverride : baseUrl;
    const curProxy = proxyOverride !== undefined ? proxyOverride : proxyUrl;

    if (!curKey && !hasApiKey && curProv !== "custom") {
      return;
    }

    setModelsLoading(true);
    setModelsError(null);
    try {
      const res = await fetch("/api/settings/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: curProv,
          apiKey: curKey.trim(),
          baseUrl: curBase.trim(),
          proxyUrl: curProxy.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Не удалось загрузить список моделей");
      }
      if (Array.isArray(data.models) && data.models.length > 0) {
        setAvailableModels(data.models);
        // If current model is empty, default to the first model
        if (!model) {
          setModel(data.models[0].id);
        }
      } else {
        setAvailableModels([]);
      }
    } catch (err: any) {
      console.warn("Failed to load models:", err);
      setModelsError(err.message || "Не удалось загрузить модели");
    } finally {
      setModelsLoading(false);
    }
  };

  // AI Test Connection
  const handleTestAIConnection = async () => {
    setAiTesting(true);
    setAiTestResult(null);
    try {
      const res = await fetch("/api/settings/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          apiKey: apiKey.trim(),
          baseUrl: baseUrl.trim(),
          model: model.trim(),
          proxyUrl: proxyUrl.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setAiTestResult({
          success: false,
          message: data.error || (locale === "ru" ? "Ошибка соединения" : "Connection failed"),
        });
      } else {
        setAiTestResult({
          success: true,
          message:
            locale === "ru"
              ? `Подключение успешно! Ответ получен за ${data.latency} мс.`
              : `Connection successful! Response in ${data.latency} ms.`,
        });
      }
    } catch (err: any) {
      setAiTestResult({
        success: false,
        message: err.message || (locale === "ru" ? "Ошибка сети" : "Network error"),
      });
    } finally {
      setAiTesting(false);
    }
  };

  // AI Save
  const handleSaveAI = async (e: React.FormEvent) => {
    e.preventDefault();
    setAiSaving(true);
    setAiTestResult(null);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          apiKey: apiKey.trim(),
          baseUrl: baseUrl.trim(),
          model: model.trim(),
          proxyUrl: proxyUrl.trim(),
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

  const handleLanguageSelect = (lang: Locale) => {
    setSelectedLang(lang);
    setLocale(lang);
  };

  // General Settings Save
  const handleSaveGeneral = (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralSaving(true);
    localStorage.setItem("snippetvault_view_mode", defaultViewMode);
    localStorage.setItem("snippetvault_sort_by", defaultSortBy);
    setLocale(selectedLang);
    onSettingsChanged?.();
    setGeneralSuccess(true);
    setTimeout(() => {
      setGeneralSaving(false);
      setGeneralSuccess(false);
    }, 1500);
  };

  // Data Export & Import Handlers
  const loadCollectionsList = async () => {
    try {
      const res = await fetch("/api/collections");
      const data = await res.json();
      if (data.success && data.collections) {
        setUserCollections(data.collections);
        setSelectedExportColId((prev) => {
          if (prev && data.collections.some((c: CollectionItem) => c.id === prev)) {
            return prev;
          }
          return data.collections[0]?.id || "";
        });
      }
    } catch {}
  };

  const handleExportFull = () => {
    const a = document.createElement("a");
    a.href = "/api/export?type=all";
    a.download = `snippetvault-backup-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleExportSelectedCollection = () => {
    if (!selectedExportColId) return;
    const a = document.createElement("a");
    a.href = `/api/export?type=collection&id=${selectedExportColId}`;
    const colName =
      userCollections.find((c) => c.id === selectedExportColId)?.name || "collection";
    a.download = `${colName}.collection.snippetvault.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    setImportSuccess(null);
    setImporting(true);

    try {
      const text = await file.text();
      let jsonPayload;
      try {
        jsonPayload = JSON.parse(text);
      } catch {
        throw new Error("Выбранный файл не является валидным JSON");
      }

      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(jsonPayload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Ошибка импорта данных");
      }

      setImportSuccess(data.message || `Импортировано сниппетов: ${data.importedSnippets}`);
      await loadCollectionsList();
      onSettingsChanged?.();
      onUserUpdated?.();
      e.target.value = "";
    } catch (err: any) {
      setImportError(err.message || "Не удалось импортировать файл");
    } finally {
      setImporting(false);
    }
  };

  const handleOpenClearConfirm = () => {
    setShowClearConfirm(true);
    setIsClosingClearConfirm(false);
  };

  const handleCloseClearConfirm = () => {
    if (clearingDb) return;
    setIsClosingClearConfirm(true);
    setTimeout(() => {
      setShowClearConfirm(false);
      setIsClosingClearConfirm(false);
    }, 200);
  };

  const handleConfirmClearAllSnippets = async () => {
    setImportError(null);
    setImportSuccess(null);
    setClearingDb(true);

    try {
      const res = await fetch("/api/snippets", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Не удалось очистить базу сниппетов");
      }
      setImportSuccess(data.message || "Все сниппеты успешно удалены");
      onSettingsChanged?.();
      await loadCollectionsList();
      handleCloseClearConfirm();
    } catch (err: any) {
      setImportError(err.message || "Ошибка при очистке базы сниппетов");
      handleCloseClearConfirm();
    } finally {
      setClearingDb(false);
    }
  };

  useEffect(() => {
    if (!showClearConfirm) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !clearingDb) {
        handleCloseClearConfirm();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showClearConfirm, clearingDb]);

  const handleOpenLogoutConfirm = () => {
    setIsClosingLogoutConfirm(false);
    setShowLogoutConfirm(true);
  };

  const handleCloseLogoutConfirm = () => {
    if (loggingOut) return;
    setIsClosingLogoutConfirm(true);
    setTimeout(() => {
      setShowLogoutConfirm(false);
      setIsClosingLogoutConfirm(false);
    }, 200);
  };

  const handleConfirmLogout = async () => {
    try {
      setLoggingOut(true);
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
      onClose();
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setLoggingOut(false);
      setShowLogoutConfirm(false);
      setIsClosingLogoutConfirm(false);
    }
  };

  useEffect(() => {
    if (!showLogoutConfirm) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loggingOut) {
        handleCloseLogoutConfirm();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showLogoutConfirm, loggingOut]);

  const userColMap = useMemo(() => {
    return new Map(userCollections.map((c) => [c.id, c]));
  }, [userCollections]);

  const exportCollectionOptions: CustomSelectOption[] = useMemo(() => {
    return userCollections.map((col) => {
      const fullPath = getCollectionBreadcrumbPath(col.id, userColMap);
      return {
        value: col.id,
        label: fullPath,
        icon: (
          <CollectionIcon
            iconType={col.iconType}
            iconValue={col.iconValue}
            color={col.color}
            className="w-4 h-4"
          />
        ),
        badge: col._count?.snippets !== undefined ? `${col._count.snippets}` : undefined,
        description: col.description || (col.parentId ? fullPath : undefined),
      };
    });
  }, [userCollections, userColMap]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-0 sm:p-4 lg:p-6 bg-black/80 backdrop-blur-sm animate-modal-backdrop touch-none">
      <div
        ref={dialogRef}
        style={{
          height: modalHeight ? `${modalHeight}px` : undefined,
          transition: hasTransition
            ? "height 0.32s cubic-bezier(0.16, 1, 0.3, 1)"
            : undefined,
        }}
        className="relative w-full max-w-3xl h-[100dvh] sm:h-auto max-h-[100dvh] sm:max-h-[92vh] rounded-none sm:rounded-2xl border-0 sm:border border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden flex flex-col animate-modal-content will-change-[height] safe-top touch-auto"
      >
        {/* Header */}
        <div
          ref={headerRef}
          className="flex items-center justify-between px-3.5 sm:px-6 py-3 sm:py-4 border-b border-zinc-800 bg-zinc-900/60 shrink-0"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-600/20 text-violet-400 border border-violet-500/30 shrink-0">
              <SettingsIcon className="w-4 h-4" />
            </div>
            <div className="truncate">
              <h2 className="text-sm sm:text-base font-semibold text-white truncate">
                {t("settings.modalTitle")}
              </h2>
              <p className="text-[11px] sm:text-xs text-zinc-400 truncate hidden sm:block">
                {t("settings.modalSubtitle")}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors shrink-0 ml-2 min-w-[36px] min-h-[36px] flex items-center justify-center"
            aria-label={t("common.close")}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          ref={tabsRef}
          className="flex items-center px-2 sm:px-6 border-b border-zinc-800 bg-zinc-950/90 text-xs font-semibold gap-0.5 sm:gap-1 overflow-x-auto scrollbar-thin scrollbar-thumb-zinc-800 shrink-0"
        >
          <button
            type="button"
            data-active={activeTab === "general" ? "true" : undefined}
            onClick={(e) => handleTabChange("general", e)}
            className={`flex items-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 px-2 sm:px-3 border-b-2 text-[11px] sm:text-xs transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "general"
                ? "border-violet-500 text-white"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{t("settings.tabs.general")}</span>
          </button>

          <button
            type="button"
            data-active={activeTab === "profile" ? "true" : undefined}
            onClick={(e) => handleTabChange("profile", e)}
            className={`flex items-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 px-2 sm:px-3 border-b-2 text-[11px] sm:text-xs transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "profile"
                ? "border-violet-500 text-white"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span>{t("settings.tabs.profile")}</span>
          </button>

          <button
            type="button"
            data-active={activeTab === "security" ? "true" : undefined}
            onClick={(e) => handleTabChange("security", e)}
            className={`flex items-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 px-2 sm:px-3 border-b-2 text-[11px] sm:text-xs transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "security"
                ? "border-violet-500 text-white"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{t("settings.tabs.security")}</span>
          </button>

          <button
            type="button"
            data-active={activeTab === "integrations" ? "true" : undefined}
            onClick={(e) => handleTabChange("integrations", e)}
            className={`flex items-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 px-2 sm:px-3 border-b-2 text-[11px] sm:text-xs transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "integrations"
                ? "border-violet-500 text-white"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Blocks className="w-3.5 h-3.5" />
            <span>{t("settings.tabs.integrations")}</span>
          </button>

          <button
            type="button"
            data-active={activeTab === "ai" ? "true" : undefined}
            onClick={(e) => handleTabChange("ai", e)}
            className={`flex items-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 px-2 sm:px-3 border-b-2 text-[11px] sm:text-xs transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "ai"
                ? "border-violet-500 text-white"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t("settings.tabs.ai")}</span>
          </button>

          <button
            type="button"
            data-active={activeTab === "data" ? "true" : undefined}
            onClick={(e) => handleTabChange("data", e)}
            className={`flex items-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 px-2 sm:px-3 border-b-2 text-[11px] sm:text-xs transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "data"
                ? "border-violet-500 text-white"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>{t("settings.tabs.data")}</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 overscroll-contain"
        >
          <div
            ref={innerContentRef}
            className="p-3.5 sm:p-6 text-xs text-zinc-200 space-y-5 sm:space-y-6"
          >
            {/* TAB: GENERAL SETTINGS */}
            {activeTab === "general" && (
              <form onSubmit={handleSaveGeneral} className="space-y-5 animate-in fade-in duration-200">
                {/* Default View Mode */}
                <div className="space-y-2">
                  <label className="font-semibold text-zinc-300 uppercase tracking-wider text-[11px]">
                    {t("settings.general.viewModeTitle")}
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setDefaultViewMode("grid")}
                      className={`p-3 rounded-xl border text-left transition-all flex items-start gap-3 ${
                        defaultViewMode === "grid"
                          ? "border-violet-500 bg-violet-600/10 text-white font-medium"
                          : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      <div className="p-2 rounded-lg bg-zinc-800/80 text-violet-400 shrink-0">
                        <LayoutGrid className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-white text-xs mb-0.5">{t("settings.general.gridTitle")}</div>
                        <div className="text-[10px] text-zinc-400">{t("settings.general.gridDesc")}</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDefaultViewMode("list")}
                      className={`p-3 rounded-xl border text-left transition-all flex items-start gap-3 ${
                        defaultViewMode === "list"
                          ? "border-violet-500 bg-violet-600/10 text-white font-medium"
                          : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      <div className="p-2 rounded-lg bg-zinc-800/80 text-violet-400 shrink-0">
                        <List className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-white text-xs mb-0.5">{t("settings.general.listTitle")}</div>
                        <div className="text-[10px] text-zinc-400">{t("settings.general.listDesc")}</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Default Sort Order */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-zinc-300 uppercase tracking-wider text-[11px]">
                    {t("settings.general.sortTitle")}
                  </label>
                  <CustomSelect
                    value={defaultSortBy}
                    onChange={(val) => setDefaultSortBy(val as SortOption)}
                    options={getLocalizedSortOptions(t).map((opt) => ({
                      value: opt.id,
                      label: opt.label,
                    }))}
                  />
                </div>

                {/* Interface Language */}
                <div className="space-y-2">
                  <label className="font-semibold text-zinc-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-violet-400" />
                    <span>{t("settings.general.languageTitle")}</span>
                  </label>
                  <p className="text-[11px] text-zinc-400">
                    {t("settings.general.languageDesc")}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleLanguageSelect("ru")}
                      className={`p-3 rounded-xl border text-left transition-all flex items-start gap-3 ${
                        selectedLang === "ru"
                          ? "border-violet-500 bg-violet-600/10 text-white font-medium"
                          : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-zinc-800/80 flex items-center justify-center font-bold text-xs text-violet-400 shrink-0">
                        RU
                      </div>
                      <div>
                        <div className="font-semibold text-white text-xs mb-0.5">{t("settings.general.langRu")}</div>
                        <div className="text-[10px] text-zinc-400">{t("settings.general.langRuDesc")}</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleLanguageSelect("en")}
                      className={`p-3 rounded-xl border text-left transition-all flex items-start gap-3 ${
                        selectedLang === "en"
                          ? "border-violet-500 bg-violet-600/10 text-white font-medium"
                          : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-zinc-800/80 flex items-center justify-center font-bold text-xs text-violet-400 shrink-0">
                        EN
                      </div>
                      <div>
                        <div className="font-semibold text-white text-xs mb-0.5">{t("settings.general.langEn")}</div>
                        <div className="text-[10px] text-zinc-400">{t("settings.general.langEnDesc")}</div>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={generalSaving}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold text-white bg-violet-600 hover:bg-violet-500 active:scale-[0.98] transition-all text-xs"
                  >
                    {generalSuccess ? (
                      <Check className="w-3.5 h-3.5 text-emerald-300" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    <span>{generalSuccess ? t("settings.general.savedBtn") : t("settings.general.saveBtn")}</span>
                  </button>
                </div>
              </form>
            )}

            {/* TAB: PROFILE */}
            {activeTab === "profile" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                {profileError && (
                  <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs">
                    {profileError}
                  </div>
                )}
                {profileSuccess && (
                  <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 flex items-center gap-2 text-xs">
                    <Check className="w-4 h-4 flex-shrink-0" />
                    <span>{profileSuccess}</span>
                  </div>
                )}

                {/* Personal Info Form */}
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="border border-zinc-800/80 rounded-2xl p-5 bg-zinc-900/40 space-y-4">
                    <div className="space-y-1">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                        <UserIcon className="w-4 h-4 text-violet-400" />
                        <span>{t("settings.profile.title")}</span>
                      </h3>
                      <p className="text-[11px] text-zinc-400">
                        {t("settings.profile.subtitle")}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div className="space-y-1">
                        <label className="text-zinc-400 text-[11px] font-medium">
                          {t("settings.profile.nameLabel")}
                        </label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder={t("settings.profile.namePlaceholder")}
                          className="w-full px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-100 placeholder-zinc-500 outline-none focus:border-violet-500 text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-zinc-400 text-[11px] font-medium">
                          {t("settings.profile.emailLabel")}
                        </label>
                        <input
                          type="email"
                          disabled
                          value={currentUser?.email || ""}
                          className="w-full px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-400 cursor-not-allowed opacity-75 text-xs"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-zinc-400 text-[11px] font-medium">
                        {t("settings.profile.bioLabel")}
                      </label>
                      <textarea
                        rows={3}
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder={t("settings.profile.bioPlaceholder")}
                        className="w-full px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-100 placeholder-zinc-500 outline-none focus:border-violet-500 resize-none text-xs"
                      />
                    </div>

                    <div className="flex justify-end pt-2 border-t border-zinc-800/60">
                      <button
                        type="submit"
                        disabled={profileSaving}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold text-white bg-violet-600 hover:bg-violet-500 active:scale-[0.98] transition-all disabled:opacity-50 text-xs shadow-sm shadow-violet-600/20"
                      >
                        {profileSaving ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Save className="w-3.5 h-3.5" />
                        )}
                        <span>{t("settings.profile.saveBtn")}</span>
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}

            {/* TAB: SECURITY */}
            {activeTab === "security" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* 1. Change Password Block */}
                <div className="border border-zinc-800/80 rounded-2xl p-5 bg-zinc-900/40 space-y-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-amber-400" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                        {t("settings.security.passwordTitle")}
                      </h3>
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      {locale === "ru" ? "Обновите ваш пароль для входа в аккаунт" : "Update your account login password"}
                    </p>
                  </div>

                  {passwordSuccess && (
                    <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 flex items-center gap-2 text-xs">
                      <Check className="w-4 h-4 flex-shrink-0" />
                      <span>{passwordSuccess}</span>
                    </div>
                  )}
                  {passwordError && (
                    <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs">
                      {passwordError}
                    </div>
                  )}

                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div className="space-y-1">
                        <label className="text-zinc-400 text-[11px] font-medium">
                          {t("settings.security.currentPasswordLabel")}
                        </label>
                        <input
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-100 placeholder-zinc-500 outline-none focus:border-violet-500 text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-zinc-400 text-[11px] font-medium">
                          {t("settings.security.newPasswordLabel")}
                        </label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder={locale === "ru" ? "Минимум 6 символов" : "Minimum 6 characters"}
                          className="w-full px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-100 placeholder-zinc-500 outline-none focus:border-violet-500 text-xs"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="submit"
                        disabled={passwordSaving || !currentPassword || !newPassword}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold text-white bg-violet-600 hover:bg-violet-500 active:scale-[0.98] transition-all disabled:opacity-50 text-xs shadow-sm shadow-violet-600/20"
                      >
                        {passwordSaving ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Save className="w-3.5 h-3.5" />
                        )}
                        <span>{t("settings.security.savePasswordBtn")}</span>
                      </button>
                    </div>
                  </form>
                </div>

                {/* 2FA Security Section */}
                <div className="border border-zinc-800/80 rounded-2xl p-5 bg-zinc-900/40 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                        {t("settings.security.twoFactorTitle")}
                      </h3>
                      {twoFactorEnabled ? (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                          <ShieldCheck className="w-3 h-3" />
                          {t("settings.security.twoFactorEnabledBadge")}
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-full">
                          {t("settings.security.twoFactorDisabledBadge")}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      {t("settings.security.twoFactorDesc")}
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
                      <span>{t("settings.security.enable2faBtn")}</span>
                    </button>
                  )}

                  {twoFactorEnabled && !showDisableConfirm && (
                    <button
                      type="button"
                      onClick={() => setShowDisableConfirm(true)}
                      className="px-3 py-1.5 rounded-xl font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 transition-all"
                    >
                      {t("settings.security.disable2faBtn")}
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

                {/* Passkeys Security Section */}
                <div className="border border-zinc-800/80 rounded-2xl p-5 bg-zinc-900/40 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Fingerprint className="w-4 h-4 text-violet-400" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                        {t("settings.security.passkeysTitle")}
                      </h3>
                      {passkeys.length > 0 && (
                        <span className="text-[10px] font-semibold text-violet-300 bg-violet-600/20 border border-violet-500/30 px-2 py-0.5 rounded-full">
                          {passkeys.length} {locale === "ru" ? (passkeys.length === 1 ? "ключ" : passkeys.length < 5 ? "ключа" : "ключей") : (passkeys.length === 1 ? "key" : "keys")}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      {t("settings.security.passkeysDesc")}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddPasskey}
                    disabled={passkeyCreating || !passkeySupported}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium text-xs text-white bg-violet-600 hover:bg-violet-500 active:scale-[0.98] transition-all disabled:opacity-50 self-start sm:self-auto"
                  >
                    {passkeyCreating ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                    <span>{t("settings.security.addPasskeyBtn")}</span>
                  </button>
                </div>

                {!passkeySupported && (
                  <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs space-y-1">
                    <div className="font-semibold flex items-center gap-1.5">
                      <span>{t("settings.security.passkeyNotSupportedTitle")}</span>
                    </div>
                    <p className="text-[11px] text-amber-300/80 leading-relaxed">
                      {t("settings.security.passkeyNotSupportedDesc")}
                    </p>
                  </div>
                )}

                {passkeySuccess && (
                  <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs flex items-center gap-2">
                    <Check className="w-4 h-4 flex-shrink-0" />
                    <span>{passkeySuccess}</span>
                  </div>
                )}

                {passkeyError && (
                  <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs">
                    {passkeyError}
                  </div>
                )}

                {/* Passkeys List */}
                {passkeysLoading ? (
                  <div className="py-6 flex justify-center">
                    <Loader2 className="w-5 h-5 text-violet-500 animate-spin" />
                  </div>
                ) : passkeys.length === 0 ? (
                  <div className="py-4 px-3 text-center rounded-xl bg-zinc-950/40 border border-zinc-800/60 text-xs text-zinc-500">
                    {t("settings.security.passkeysNoKeysNotice")}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {passkeys.map((pk) => (
                      <div
                        key={pk.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/80 hover:border-zinc-700/80 transition-all text-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-violet-600/10 border border-violet-500/20 text-violet-400 flex items-center justify-center shrink-0">
                            {pk.deviceType === "singleDevice" ? (
                              <Laptop className="w-4 h-4" />
                            ) : pk.backedUp ? (
                              <Smartphone className="w-4 h-4" />
                            ) : (
                              <KeyRound className="w-4 h-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            {editingPasskeyId === pk.id ? (
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="text"
                                  autoFocus
                                  value={editingPasskeyName}
                                  onChange={(e) => setEditingPasskeyName(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") handleSavePasskeyName(pk.id);
                                    if (e.key === "Escape") setEditingPasskeyId(null);
                                  }}
                                  className="px-2 py-0.5 rounded bg-zinc-900 border border-violet-500 text-white text-xs outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSavePasskeyName(pk.id)}
                                  className="text-violet-400 hover:text-white"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingPasskeyId(null)}
                                  className="text-zinc-500 hover:text-white"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-zinc-100 truncate">
                                  {pk.name}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingPasskeyId(pk.id);
                                    setEditingPasskeyName(pk.name);
                                  }}
                                  className="text-zinc-500 hover:text-zinc-300 transition-colors"
                                  title={t("settings.security.passkeyRenameTooltip")}
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                            <div className="flex items-center gap-2 text-[10px] text-zinc-500 mt-0.5">
                              <span>
                                {t("settings.security.passkeyAddedAt", {
                                  date: new Date(pk.createdAt).toLocaleDateString(locale === "ru" ? "ru-RU" : "en-US"),
                                })}
                              </span>
                              {pk.lastUsedAt && (
                                <>
                                  <span>•</span>
                                  <span>
                                    {t("settings.security.passkeyUsedAt", {
                                      date: new Date(pk.lastUsedAt).toLocaleDateString(locale === "ru" ? "ru-RU" : "en-US"),
                                    })}
                                  </span>
                                </>
                              )}
                              {pk.backedUp && (
                                <span className="px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                  {t("settings.security.passkeySyncedBadge")}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeletePasskey(pk.id, pk.name)}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0 ml-2"
                          title={t("settings.security.passkeyDeleteTooltip")}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: INTEGRATIONS */}
          {activeTab === "integrations" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* 1. Header & Connected Apps Cards */}
              <div className="border border-zinc-800/80 rounded-2xl p-5 bg-zinc-900/40 space-y-4">
                <div className="space-y-1">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                    <Blocks className="w-4 h-4 text-violet-400" />
                    <span>{t("settings.integrations.title")}</span>
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    {t("settings.integrations.subtitle")}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  {/* VS Code Card */}
                  <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/70 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shrink-0">
                          <Laptop className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span>{t("settings.integrations.vscodeTitle")}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 font-mono">v0.1.0</span>
                          </div>
                          <div className="text-[10px] text-zinc-400 font-mono">vscode-snippetvault</div>
                        </div>
                      </div>

                      <span
                        className={`inline-flex items-center justify-center text-center text-[10px] px-2.5 py-1 rounded-full border font-semibold leading-none shrink-0 ${
                          integrationStats && integrationStats.vsCodeCount > 0
                            ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                            : "bg-sky-500/15 text-sky-300 border-sky-500/30"
                        }`}
                      >
                        {integrationStats && integrationStats.vsCodeCount > 0
                          ? t("settings.integrations.vscodeActiveBadge")
                          : t("settings.integrations.vscodeReadyBadge")}
                      </span>
                    </div>

                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      {t("settings.integrations.vscodeDesc")}
                    </p>

                    <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800/80 text-[11px] font-mono text-zinc-300">
                      {t("settings.integrations.vscodeHotkeys")}
                    </div>
                  </div>

                  {/* cURL & CLI Card */}
                  <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/70 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                          <Terminal className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">
                            {t("settings.integrations.cliTitle")}
                          </div>
                          <div className="text-[10px] text-zinc-400 font-mono">cURL • Bash • Wget • Scripts</div>
                        </div>
                      </div>

                      <span
                        className={`inline-flex items-center justify-center text-center text-[10px] px-2.5 py-1 rounded-full border font-semibold leading-none shrink-0 ${
                          integrationStats && integrationStats.curlCount > 0
                            ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                            : "bg-amber-500/15 text-amber-300 border-amber-500/30"
                        }`}
                      >
                        {integrationStats && integrationStats.curlCount > 0
                          ? t("settings.integrations.vscodeActiveBadge")
                          : t("settings.integrations.vscodeReadyBadge")}
                      </span>
                    </div>

                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      {t("settings.integrations.cliDesc")}
                    </p>

                    <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800/80 text-[11px] font-mono text-zinc-300 overflow-x-auto select-all">
                      curl -sL {typeof window !== "undefined" ? window.location.origin : ""}/s/TOKEN/raw | bash
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Personal Access Tokens (PAT) Block */}
              <div className="border border-zinc-800/80 rounded-2xl p-5 bg-zinc-900/40 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-violet-400" />
                      <span>{t("settings.tokens.title")}</span>
                    </h3>
                    <p className="text-[11px] text-zinc-400">
                      {t("settings.tokens.subtitle")}
                    </p>
                  </div>

                  {!isTokenFormOpen && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsTokenFormOpen(true);
                        setTokenError(null);
                        setTokenSuccess(null);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium text-xs bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/30 transition-all shrink-0 self-start sm:self-auto cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{t("settings.tokens.createBtn")}</span>
                    </button>
                  )}
                </div>

                {tokenError && (
                  <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{tokenError}</span>
                  </div>
                )}

                {/* Just generated token banner */}
                {justGeneratedToken && (
                  <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 space-y-3 animate-in fade-in">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-emerald-300 text-xs font-semibold">
                        <Check className="w-4 h-4 shrink-0" />
                        <span>{t("settings.tokens.createdSuccess")}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setJustGeneratedToken(null)}
                        className="text-zinc-400 hover:text-white p-1 text-xs cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className="text-[11px] text-emerald-400/90 leading-relaxed font-medium">
                      {t("settings.tokens.justGeneratedWarning")}
                    </p>

                    <div className="flex items-center gap-2 pt-0.5">
                      <input
                        type="text"
                        readOnly
                        value={justGeneratedToken}
                        onClick={(e) => (e.target as HTMLInputElement).select()}
                        className="w-full px-3 py-2 rounded-xl bg-zinc-950/80 border border-emerald-500/40 text-emerald-200 font-mono text-xs select-all outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleCopyGeneratedToken}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shrink-0 transition-all shadow-sm shadow-emerald-600/30 cursor-pointer"
                      >
                        {copiedToken ? (
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

                    {/* Quick Usage snippet */}
                    <div className="pt-2 border-t border-emerald-500/20 text-[11px] text-zinc-400 space-y-1">
                      <span className="font-semibold text-zinc-300">
                        {t("settings.tokens.usageExampleTitle")}
                      </span>
                      <div className="p-2 rounded-lg bg-zinc-950 font-mono text-[10px] text-zinc-300 overflow-x-auto select-all">
                        curl -sL -H &quot;Authorization: Bearer {justGeneratedToken}&quot; {typeof window !== "undefined" ? window.location.origin : ""}/api/snippets
                      </div>
                    </div>
                  </div>
                )}

                {/* Create Token Inline Form */}
                {isTokenFormOpen && (
                  <form
                    onSubmit={handleCreateToken}
                    className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/60 space-y-3.5 animate-in fade-in"
                  >
                    <div className="space-y-1">
                      <label className="text-zinc-400 text-[11px] font-medium">
                        {t("settings.tokens.nameLabel")}
                      </label>
                      <input
                        type="text"
                        autoFocus
                        value={newTokenName}
                        onChange={(e) => setNewTokenName(e.target.value)}
                        placeholder={t("settings.tokens.namePlaceholder")}
                        className="w-full px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-100 placeholder-zinc-500 outline-none focus:border-violet-500 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-zinc-400 text-[11px] font-medium">
                        {t("settings.tokens.expiresLabel")}
                      </label>
                      <select
                        value={newTokenExpiresIn === null ? "never" : String(newTokenExpiresIn)}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewTokenExpiresIn(val === "never" ? null : Number(val));
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-200 outline-none focus:border-violet-500 text-xs"
                      >
                        <option value="30">{t("settings.tokens.expires30")}</option>
                        <option value="60">{t("settings.tokens.expires60")}</option>
                        <option value="90">{t("settings.tokens.expires90")}</option>
                        <option value="365">{t("settings.tokens.expires365")}</option>
                        <option value="never">{t("settings.tokens.expiresNever")}</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800/80">
                      <button
                        type="button"
                        onClick={() => {
                          setIsTokenFormOpen(false);
                          setNewTokenName("");
                        }}
                        className="px-3 py-1.5 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer"
                      >
                        {t("common.cancel")}
                      </button>
                      <button
                        type="submit"
                        disabled={isCreatingToken || !newTokenName.trim()}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl font-semibold text-white bg-violet-600 hover:bg-violet-500 active:scale-[0.98] transition-all disabled:opacity-50 text-xs shadow-sm shadow-violet-600/20 cursor-pointer"
                      >
                        {isCreatingToken ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Plus className="w-3.5 h-3.5" />
                        )}
                        <span>{t("settings.tokens.submitCreate")}</span>
                      </button>
                    </div>
                  </form>
                )}

                {/* Active Tokens List */}
                <div className="space-y-2">
                  {tokensLoading && tokens.length === 0 ? (
                    <div className="py-6 flex items-center justify-center text-zinc-500 text-xs gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
                      <span>{t("common.loading")}</span>
                    </div>
                  ) : tokens.length === 0 ? (
                    <div className="py-6 text-center border border-dashed border-zinc-800/80 rounded-xl">
                      <p className="text-zinc-500 text-xs">
                        {t("settings.tokens.emptyList")}
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-zinc-800/60 border border-zinc-800/80 rounded-xl overflow-hidden bg-zinc-950/40">
                      {tokens.map((token) => {
                        const isExpired =
                          token.expiresAt &&
                          new Date(token.expiresAt).getTime() < Date.now();
                        const createdFormatted = new Date(token.createdAt).toLocaleDateString(
                          locale === "ru" ? "ru-RU" : "en-US",
                          { year: "numeric", month: "short", day: "numeric" }
                        );
                        const lastUsedFormatted = token.lastUsedAt
                          ? new Date(token.lastUsedAt).toLocaleDateString(
                              locale === "ru" ? "ru-RU" : "en-US",
                              { year: "numeric", month: "short", day: "numeric" }
                            )
                          : t("settings.tokens.neverUsed");
                        const expiresFormatted = token.expiresAt
                          ? new Date(token.expiresAt).toLocaleDateString(
                              locale === "ru" ? "ru-RU" : "en-US",
                              { year: "numeric", month: "short", day: "numeric" }
                            )
                          : t("settings.tokens.noExpiration");

                        return (
                          <div
                            key={token.id}
                            className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-zinc-900/40 transition-colors"
                          >
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-xs text-white">
                                  {token.name}
                                </span>
                                <code className="text-[11px] px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 font-mono text-zinc-400">
                                  {token.tokenPrefix}
                                </code>
                                {isExpired && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30">
                                    {locale === "ru" ? "Истёк" : "Expired"}
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

                            <button
                              type="button"
                              disabled={deletingTokenId === token.id}
                              onClick={() => handleRevokeToken(token.id)}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-zinc-800 hover:border-rose-500/30 bg-zinc-900 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 text-xs font-medium transition-all self-end sm:self-auto shrink-0 disabled:opacity-50 cursor-pointer"
                              title={t("settings.tokens.revokeBtn")}
                            >
                              {deletingTokenId === token.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                              <span>{t("settings.tokens.revokeBtn")}</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* 3. Integration Activity & Error Logs */}
              <div className="border border-zinc-800/80 rounded-2xl p-5 bg-zinc-900/40 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                      <Activity className="w-4 h-4 text-emerald-400" />
                      <span>{t("settings.integrations.logsTitle")}</span>
                      {integrationLogs.length > 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-mono">
                          {integrationLogs.length}
                        </span>
                      )}
                    </h3>
                    <p className="text-[11px] text-zinc-400">
                      {t("settings.integrations.logsSubtitle")}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <button
                      type="button"
                      disabled={integrationLogsLoading}
                      onClick={() => loadIntegrationLogs()}
                      className="p-1.5 rounded-xl border border-zinc-800 hover:border-zinc-700 bg-zinc-900 text-zinc-400 hover:text-white transition-all cursor-pointer min-w-[32px] min-h-[32px] flex items-center justify-center"
                      title={t("settings.integrations.refreshLogsBtn")}
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${
                          integrationLogsLoading ? "animate-spin text-violet-400" : ""
                        }`}
                      />
                    </button>
                    {integrationLogs.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearIntegrationLogs}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-800 hover:border-rose-500/30 bg-zinc-900 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 text-xs font-medium transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{t("settings.integrations.clearLogsBtn")}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Filter buttons */}
                <div className="flex items-center gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setLogsFilter("all")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      logsFilter === "all"
                        ? "bg-violet-600/30 border border-violet-500/40 text-violet-200"
                        : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {t("settings.integrations.filterAll")} ({integrationLogs.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setLogsFilter("success")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      logsFilter === "success"
                        ? "bg-emerald-600/30 border border-emerald-500/40 text-emerald-200"
                        : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {t("settings.integrations.filterSuccess")} (
                    {integrationLogs.filter((l) => l.status < 400).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setLogsFilter("error")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      logsFilter === "error"
                        ? "bg-rose-600/30 border border-rose-500/40 text-rose-200"
                        : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {t("settings.integrations.filterErrors")} (
                    {integrationLogs.filter((l) => l.status >= 400).length})
                  </button>
                </div>

                {/* Logs Feed */}
                <div className="space-y-2">
                  {integrationLogsLoading && integrationLogs.length === 0 ? (
                    <div className="py-8 flex items-center justify-center text-zinc-500 text-xs gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
                      <span>{t("common.loading")}</span>
                    </div>
                  ) : integrationLogs.length === 0 ? (
                    <div className="py-8 text-center border border-dashed border-zinc-800/80 rounded-xl space-y-1">
                      <p className="text-zinc-400 text-xs font-medium">
                        {t("settings.integrations.emptyLogs")}
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-zinc-800/60 border border-zinc-800/80 rounded-xl overflow-hidden bg-zinc-950/60 max-h-96 overflow-y-auto">
                      {integrationLogs
                        .filter((log) => {
                          if (logsFilter === "success") return log.status < 400;
                          if (logsFilter === "error") return log.status >= 400;
                          return true;
                        })
                        .map((log) => {
                          const dateObj = new Date(log.createdAt);
                          const timeStr = dateObj.toLocaleTimeString(
                            locale === "ru" ? "ru-RU" : "en-US",
                            { hour: "2-digit", minute: "2-digit", second: "2-digit" }
                          );
                          const dateStr = dateObj.toLocaleDateString(
                            locale === "ru" ? "ru-RU" : "en-US",
                            { day: "numeric", month: "short" }
                          );
                          const isOk = log.status < 400;

                          return (
                            <div
                              key={log.id}
                              className="p-3 text-xs hover:bg-zinc-900/40 transition-colors space-y-1.5"
                            >
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-2">
                                  {/* Status badge */}
                                  <span
                                    className={`inline-flex items-center justify-center text-center text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold border leading-none ${
                                      isOk
                                        ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                                        : "bg-rose-500/10 text-rose-300 border-rose-500/30"
                                    }`}
                                  >
                                    {log.status} {log.status === 201 ? "Created" : isOk ? "OK" : "Error"}
                                  </span>

                                  {/* Client pill */}
                                  {log.client.includes("VS Code") ? (
                                    <span className="flex items-center gap-1 text-[10px] font-medium text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                                      <Laptop className="w-3 h-3" />
                                      <span>{log.client}</span>
                                    </span>
                                  ) : log.client.includes("cURL") || log.client.includes("Terminal") ? (
                                    <span className="flex items-center gap-1 text-[10px] font-medium text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                                      <Terminal className="w-3 h-3" />
                                      <span>{log.client}</span>
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1 text-[10px] font-medium text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
                                      <Blocks className="w-3 h-3 text-zinc-400" />
                                      <span>{log.client}</span>
                                    </span>
                                  )}

                                  <span className="font-semibold text-white">
                                    {log.action}
                                  </span>
                                </div>

                                <div className="text-[11px] text-zinc-500 font-mono">
                                  {dateStr}, {timeStr}
                                </div>
                              </div>

                              <div className="flex items-center justify-between text-[11px] text-zinc-400 gap-2 flex-wrap pl-1">
                                <div className="flex items-center gap-2 font-mono">
                                  <span className="text-zinc-500 uppercase">{log.method}</span>
                                  <span className="text-zinc-300">{log.path}</span>
                                  {log.tokenPrefix && (
                                    <span className="text-violet-400">({log.tokenPrefix})</span>
                                  )}
                                </div>
                                {log.details && (
                                  <div className={`truncate max-w-sm ${isOk ? "text-zinc-400" : "text-rose-300"}`}>
                                    {log.details}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AI ASSISTANT */}
          {activeTab === "ai" && (
            <form onSubmit={handleSaveAI} className="space-y-4 animate-in fade-in duration-200">
              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-300 uppercase tracking-wider text-[11px]">
                  {locale === "ru" ? "Провайдер AI" : "AI Provider"}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setProvider("openai");
                      setBaseUrl("https://api.openai.com/v1");
                      setModel("gpt-4o-mini");
                      setAvailableModels([]);
                      loadAvailableModels(apiKey, "openai", "https://api.openai.com/v1");
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
                      setModel("gemini-3.5-flash");
                      setAvailableModels([]);
                      loadAvailableModels(apiKey, "gemini", "https://generativelanguage.googleapis.com");
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
                      setAvailableModels([]);
                      loadAvailableModels(apiKey, "custom", "http://localhost:11434/v1");
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
                    {t("settings.ai.keyLabel")} {provider === "custom" && (locale === "ru" ? "(Опционально)" : "(Optional)")}
                  </label>
                  {hasApiKey && !apiKey && (
                    <span className="text-[10px] text-emerald-400 font-medium">
                      ✓ {locale === "ru" ? `Ключ сохранен (${maskedKey})` : `Key saved (${maskedKey})`}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showKey ? "text" : "password"}
                    placeholder={
                      hasApiKey
                        ? (locale === "ru" ? "Введите новый ключ для замены..." : "Enter new key to replace...")
                        : provider === "gemini"
                        ? "AIzaSy..."
                        : "sk-..."
                    }
                    value={apiKey}
                    onChange={(e) => {
                      const val = e.target.value;
                      setApiKey(val);
                      let newProv = provider;
                      let newBase = baseUrl;
                      if (val.trim().startsWith("AIzaSy") && provider === "openai") {
                        newProv = "gemini";
                        setProvider("gemini");
                        newBase = "https://generativelanguage.googleapis.com";
                        setBaseUrl(newBase);
                        if (!model || model === "gpt-4o-mini") {
                          setModel("gemini-3.5-flash");
                        }
                      }
                      if (modelFetchTimerRef.current) clearTimeout(modelFetchTimerRef.current);
                      if (val.trim().length >= 15 || newProv === "custom") {
                        modelFetchTimerRef.current = setTimeout(() => {
                          loadAvailableModels(val, newProv, newBase);
                        }, 700);
                      }
                    }}
                    onBlur={() => {
                      if (apiKey.trim().length >= 10) {
                        loadAvailableModels(apiKey);
                      }
                    }}
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
                    {t("settings.ai.baseUrlLabel")}
                  </label>
                  <input
                    type="text"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-100 placeholder-zinc-500 outline-none focus:border-violet-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-zinc-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <span>{t("settings.ai.modelLabel")}</span>
                      {availableModels.length > 0 && !modelsLoading && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-violet-600/20 text-violet-300 border border-violet-500/30 normal-case font-normal">
                          {t("settings.ai.modelsCount", { count: availableModels.length })}
                        </span>
                      )}
                    </label>
                    <div className="flex items-center gap-2">
                      {availableModels.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setIsManualModelInput(!isManualModelInput)}
                          className="text-[10px] text-zinc-400 hover:text-zinc-200 transition-colors"
                        >
                          {isManualModelInput ? t("settings.ai.selectModelToggle") : t("settings.ai.manualModelToggle")}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => loadAvailableModels()}
                        disabled={modelsLoading || (!apiKey && !hasApiKey && provider !== "custom")}
                        title={t("settings.ai.refreshModelsBtn")}
                        className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 px-1.5 py-0.5 rounded transition-colors disabled:opacity-40"
                      >
                        <RefreshCw className={`w-3 h-3 ${modelsLoading ? "animate-spin text-violet-400" : ""}`} />
                        <span>{modelsLoading ? t("settings.ai.modelsLoading") : t("settings.ai.loadModelsBtn")}</span>
                      </button>
                    </div>
                  </div>

                  {availableModels.length > 0 && !isManualModelInput ? (
                    <CustomSelect
                      value={model}
                      onChange={(val) => setModel(val)}
                      options={(() => {
                        const list = [...availableModels];
                        if (model && !list.some((m) => m.id === model)) {
                          list.unshift({ id: model, name: model });
                        }
                        return list.map((m) => ({
                          value: m.id,
                          label: m.name || m.id,
                          description: m.description ? (m.description.length > 70 ? m.description.slice(0, 70) + "..." : m.description) : undefined,
                          badge: m.id.includes("flash") ? "Flash" : m.id.includes("pro") ? "Pro" : undefined,
                        }));
                      })()}
                      searchable={true}
                      searchPlaceholder={t("settings.ai.searchModelPlaceholder")}
                      className="w-full"
                      triggerClassName="text-xs font-mono"
                    />
                  ) : (
                    <input
                      type="text"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      placeholder={provider === "gemini" ? "gemini-3.5-flash" : "gpt-4o-mini"}
                      className="w-full px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-100 placeholder-zinc-500 outline-none focus:border-violet-500 text-xs font-mono"
                    />
                  )}

                  {modelsError && (
                    <p className="text-[11px] text-rose-400/90 leading-tight">
                      {modelsError}
                    </p>
                  )}
                </div>
              </div>

              {/* Proxy Server (HTTP / HTTPS / SOCKS5) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-zinc-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{t("settings.ai.proxyLabel")}</span>
                  </label>
                  {proxyUrl && (
                    <button
                      type="button"
                      onClick={() => setProxyUrl("")}
                      className="text-[10px] text-zinc-500 hover:text-rose-400 transition-colors"
                    >
                      {locale === "ru" ? "Очистить" : "Clear"}
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  placeholder={t("settings.ai.proxyPlaceholder")}
                  value={proxyUrl}
                  onChange={(e) => setProxyUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-100 placeholder-zinc-500 outline-none focus:border-violet-500 text-xs font-mono"
                />
                <p className="text-[10px] text-zinc-500 pt-0.5">
                  {t("settings.ai.proxyHint")}
                </p>
              </div>

              {/* Network Warning Note */}
              <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 text-[11px] text-zinc-400 space-y-1">
                <p className="font-semibold text-zinc-300 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>{locale === "ru" ? "Сетевое подключение (РФ и блокировки)" : "Network connection note"}</span>
                </p>
                <p className="leading-relaxed">
                  {locale === "ru"
                    ? "Запросы к AI выполняет сервер Node.js (бэкенд). Если сервер находится в РФ, прямые подключения к Google Gemini и OpenAI блокируются. Укажите ваш локальный SOCKS5 (например, Xray/VLESS на 10808) или HTTP-прокси в поле выше, либо используйте VPN на хосте."
                    : "Requests to AI are executed by the Node.js backend. If your server is in Russia or restricted regions, direct connections to Google Gemini/OpenAI are blocked. Specify your SOCKS5/HTTP proxy in the field above or configure VPN on the host."}
                </p>
              </div>

              {/* Test Connection Result */}
              {aiTestResult && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-start gap-2 animate-in fade-in duration-150 ${
                    aiTestResult.success
                      ? "bg-emerald-950/20 text-emerald-300 border-emerald-900/40"
                      : "bg-rose-950/20 text-rose-300 border-rose-900/40"
                  }`}
                >
                  {aiTestResult.success ? (
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <span className="leading-relaxed break-words">{aiTestResult.message}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleTestAIConnection}
                  disabled={aiTesting || aiSaving || (!apiKey && !hasApiKey && provider !== "custom")}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-700 transition-colors disabled:opacity-40"
                >
                  {aiTesting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                  )}
                  <span>
                    {locale === "ru"
                      ? aiTesting
                        ? "Проверка..."
                        : "Проверить подключение"
                      : aiTesting
                      ? "Testing..."
                      : "Test Connection"}
                  </span>
                </button>

                <button
                  type="submit"
                  disabled={aiSaving}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {aiSaving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : aiSuccess ? (
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>{aiSuccess ? t("settings.ai.savedBtn") : t("settings.ai.saveBtn")}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB: DATA */}
          {activeTab === "data" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {importSuccess && (
                <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 flex items-center gap-2.5 text-xs">
                  <Check className="w-4 h-4 flex-shrink-0 text-emerald-400" />
                  <span>{importSuccess}</span>
                </div>
              )}

              {importError && (
                <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs">
                  {importError}
                </div>
              )}

              {/* Export Section */}
              <div className="border border-zinc-800/80 rounded-2xl p-5 bg-zinc-900/40 space-y-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Download className="w-4 h-4 text-violet-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                      {t("settings.data.exportTitle")}
                    </h3>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    {t("settings.data.exportDesc")}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Full Backup */}
                  <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/60 flex flex-col justify-between gap-3">
                    <div className="space-y-1">
                      <div className="font-semibold text-white text-xs flex items-center gap-1.5">
                        <HardDrive className="w-3.5 h-3.5 text-violet-400" />
                        <span>{locale === "ru" ? "Вся база сниппетов" : "Entire snippet database"}</span>
                      </div>
                      <p className="text-[11px] text-zinc-400">
                        {locale === "ru" ? "Полная резервная копия всей базы: сохраняет структуру папок любой вложенности, умные коллекции и сниппеты." : "Full backup: preserves full folder hierarchy with all nested subcollections, smart collections, and snippets."}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleExportFull}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium text-xs transition-all active:scale-[0.98] shadow-sm shadow-violet-600/20"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{t("settings.data.exportAllBtn")}</span>
                    </button>
                  </div>

                  {/* Collection Export */}
                  <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/60 flex flex-col justify-between gap-3">
                    <div className="space-y-1">
                      <div className="font-semibold text-white text-xs flex items-center gap-1.5">
                        <FolderGit2 className="w-3.5 h-3.5 text-indigo-400" />
                        <span>{locale === "ru" ? "Отдельная коллекция" : "Specific collection"}</span>
                      </div>
                      <p className="text-[11px] text-zinc-400">
                        {locale === "ru" ? "Экспорт выбранной коллекции со всеми вложенными подпапками, структурой и входящими сниппетами." : "Export the selected collection with all nested subcollections, folder structure, and snippets."}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <CustomSelect
                        value={selectedExportColId}
                        onChange={setSelectedExportColId}
                        options={exportCollectionOptions}
                        placeholder={
                          userCollections.length === 0
                            ? (locale === "ru" ? "Нет доступных коллекций" : "No available collections")
                            : (locale === "ru" ? "Выберите коллекцию..." : "Select collection...")
                        }
                        disabled={userCollections.length === 0}
                        searchable={userCollections.length > 5}
                        searchPlaceholder={locale === "ru" ? "Поиск коллекции..." : "Search collection..."}
                      />

                      <button
                        type="button"
                        onClick={handleExportSelectedCollection}
                        disabled={!selectedExportColId || userCollections.length === 0}
                        className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/60 text-zinc-200 hover:text-white font-medium text-xs transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>{t("settings.data.exportCollectionBtn")}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Import Section */}
              <div className="border border-zinc-800/80 rounded-2xl p-5 bg-zinc-900/40 space-y-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Upload className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                      {t("settings.data.importTitle")}
                    </h3>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    {t("settings.data.importDesc")}
                  </p>
                </div>

                <div className="p-6 rounded-2xl border-2 border-dashed border-zinc-800 hover:border-violet-500/50 bg-zinc-950/40 transition-colors flex flex-col items-center justify-center text-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-violet-600/10 border border-violet-500/20 text-violet-400 flex items-center justify-center">
                    {importing ? (
                      <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
                    ) : (
                      <FileUp className="w-6 h-6" />
                    )}
                  </div>

                  <div className="space-y-1 max-w-sm">
                    <p className="font-semibold text-white text-xs">
                      {importing
                        ? (locale === "ru" ? "Импортирование данных..." : "Importing data...")
                        : (locale === "ru" ? "Выберите файл резервной копии для восстановления" : "Choose backup file to restore")}
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      {locale === "ru"
                        ? "Поддерживаются файлы .json полной базы, отдельной коллекции или одиночного сниппета"
                        : "Supports JSON files of entire database, collection, or individual snippet"}
                    </p>
                  </div>

                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept=".json,application/json"
                      disabled={importing}
                      onChange={handleImportFile}
                      className="hidden"
                    />
                    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium text-xs transition-all active:scale-[0.98] shadow-sm shadow-violet-600/20">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{importing ? (locale === "ru" ? "Обработка файла..." : "Processing file...") : t("settings.data.importFileBtn")}</span>
                    </span>
                  </label>
                </div>
              </div>

              {/* Danger Zone: Clear Snippets Database */}
              <div className="border border-rose-500/30 rounded-2xl p-5 bg-rose-500/5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Trash2 className="w-4 h-4 text-rose-400" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-rose-300">
                        {t("settings.data.clearTitle")}
                      </h3>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed max-w-xl">
                      {t("settings.data.clearDesc")}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleOpenClearConfirm}
                    disabled={clearingDb}
                    className="flex items-center gap-2 py-2 px-3.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs transition-all active:scale-[0.98] shadow-sm shadow-rose-600/25 shrink-0 disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t("settings.data.clearBtn")}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

                    </div>
        </div>

        {/* Footer with Logout Button */}
        <div
          ref={footerRef}
          className="flex items-center justify-between px-3.5 sm:px-6 py-2.5 sm:py-3.5 border-t border-zinc-800 bg-zinc-900/40 shrink-0"
        >
          <button
            type="button"
            onClick={handleOpenLogoutConfirm}
            className="flex items-center gap-1.5 text-xs font-medium text-rose-400 hover:text-rose-300 px-2 sm:px-2.5 py-1.5 rounded-lg hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{t("settings.logout.button")}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            {t("common.close")}
          </button>
        </div>
      </div>

      {/* Confirmation Modal for Clearing Database */}
      {showClearConfirm && (
        <div
          className={`fixed inset-0 z-[70] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm touch-none ${
            isClosingClearConfirm ? "animate-modal-backdrop-out" : "animate-modal-backdrop"
          }`}
          onClick={handleCloseClearConfirm}
        >
          <div
            className={`relative w-full max-w-md rounded-xl sm:rounded-2xl border border-rose-500/30 bg-zinc-950 p-4 sm:p-6 shadow-2xl flex flex-col gap-4 sm:gap-5 touch-auto ${
              isClosingClearConfirm ? "animate-modal-content-out" : "animate-modal-content"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 sm:gap-3.5">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center shrink-0 text-rose-400">
                <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="space-y-1 sm:space-y-1.5 flex-1 min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-white">
                  {t("settings.clearConfirm.title")}
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {t("settings.clearConfirm.desc")}
                </p>
                <div className="p-2 sm:p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-300 font-medium">
                  {t("settings.clearConfirm.warning")}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 sm:gap-2.5 pt-2 border-t border-zinc-800/80">
              <button
                type="button"
                onClick={handleCloseClearConfirm}
                disabled={clearingDb}
                className="px-3.5 sm:px-4 py-2 rounded-xl text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors disabled:opacity-50"
              >
                {t("settings.clearConfirm.cancel")}
              </button>
              <button
                type="button"
                onClick={handleConfirmClearAllSnippets}
                disabled={clearingDb}
                className="flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-[0.98] text-white font-semibold text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-rose-600/20"
              >
                {clearingDb ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>{clearingDb ? t("settings.clearConfirm.deleting") : t("settings.clearConfirm.confirm")}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Logout */}
      {showLogoutConfirm && (
        <div
          className={`fixed inset-0 z-[75] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm touch-none ${
            isClosingLogoutConfirm ? "animate-modal-backdrop-out" : "animate-modal-backdrop"
          }`}
          onClick={handleCloseLogoutConfirm}
        >
          <div
            className={`relative w-full max-w-md rounded-xl sm:rounded-2xl border border-zinc-800 bg-zinc-950 p-4 sm:p-6 shadow-2xl flex flex-col gap-4 sm:gap-5 touch-auto ${
              isClosingLogoutConfirm ? "animate-modal-content-out" : "animate-modal-content"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 sm:gap-3.5">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-400">
                <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="space-y-1 sm:space-y-1.5 flex-1 min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-white">
                  {t("settings.logout.confirmTitle")}
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {t("settings.logout.confirmDesc")}
                </p>
                <div className="p-2 sm:p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] sm:text-xs text-amber-300 font-medium leading-relaxed">
                  {t("settings.logout.warningNote")}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 sm:gap-2.5 pt-2 border-t border-zinc-800/80">
              <button
                type="button"
                onClick={handleCloseLogoutConfirm}
                disabled={loggingOut}
                className="px-3.5 sm:px-4 py-2 rounded-xl text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors disabled:opacity-50"
              >
                {t("settings.logout.cancel")}
              </button>
              <button
                type="button"
                onClick={handleConfirmLogout}
                disabled={loggingOut}
                className="flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-[0.98] text-white font-semibold text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-rose-600/20"
              >
                {loggingOut ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <LogOut className="w-3.5 h-3.5" />
                )}
                <span>{loggingOut ? t("settings.logout.loggingOut") : t("settings.logout.confirm")}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
