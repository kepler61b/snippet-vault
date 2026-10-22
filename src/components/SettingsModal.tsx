"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpDown,
  Check,
  Copy,
  Database,
  Download,
  Edit2,
  Eye,
  EyeOff,
  FileUp,
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
  Save,
  Settings as SettingsIcon,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Trash2,
  Upload,
  User as UserIcon,
  X,
} from "lucide-react";
import { startRegistration, browserSupportsWebAuthn } from "@simplewebauthn/browser";
import { ViewMode, SortOption, SORT_OPTIONS, CollectionItem } from "@/types/snippet";
import { CollectionIcon } from "@/lib/collection-icons";
import { CustomSelect, CustomSelectOption } from "@/components/ui/CustomSelect";

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
  initialTab?: "general" | "profile" | "security" | "ai" | "data";
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

  // Active Tab: "general" | "profile" | "security" | "ai" | "data"
  const [activeTab, setActiveTab] = useState<"general" | "profile" | "security" | "ai" | "data">(
    initialTab || "general"
  );

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

  const handleTabChange = (tab: "general" | "profile" | "security" | "ai" | "data") => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    if (tab === "data") {
      loadCollectionsList();
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
  const [showKey, setShowKey] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSaving, setAiSaving] = useState(false);
  const [aiSuccess, setAiSuccess] = useState(false);

  // General App Preferences
  const [defaultViewMode, setDefaultViewMode] = useState<ViewMode>("grid");
  const [defaultSortBy, setDefaultSortBy] = useState<SortOption>("CREATED_DESC");
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
    const savedView = localStorage.getItem("snippetvault_view_mode") as ViewMode;
    if (savedView === "grid" || savedView === "list") setDefaultViewMode(savedView);
    const savedSort = localStorage.getItem("snippetvault_sort_by") as SortOption;
    if (savedSort && SORT_OPTIONS.some((o) => o.id === savedSort)) setDefaultSortBy(savedSort);

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
        throw new Error(data.error || "Не удалось получить параметры регистрации Passkey");
      }

      // 2. Prompt browser authenticator (Windows Hello, Touch ID, Security Key)
      const regResp = await startRegistration({ optionsJSON: data.options });

      // 3. Ask for optional friendly name
      const defaultName = "Passkey (" + new Date().toLocaleDateString("ru-RU") + ")";
      const chosenName = window.prompt("Введите название для этого устройства:", defaultName) || defaultName;

      // 4. Verify with server
      const verifyRes = await fetch("/api/auth/passkey/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: regResp, name: chosenName }),
      });
      const verifyData = await verifyRes.json();

      if (!verifyRes.ok || !verifyData.success) {
        throw new Error(verifyData.error || "Ошибка подтверждения ключа Passkey");
      }

      setPasskeySuccess("Ключ доступа успешно добавлен!");
      setTimeout(() => setPasskeySuccess(null), 4000);
      await loadPasskeys();
    } catch (err: any) {
      console.warn("Passkey add error:", err);
      if (
        err.name === "NotAllowedError" ||
        err.message?.includes("cancelled") ||
        err.message?.includes("aborted")
      ) {
        setPasskeyError("Добавление ключа доступа было отменено");
      } else {
        setPasskeyError(err.message || "Ошибка добавления Passkey");
      }
    } finally {
      setPasskeyCreating(false);
    }
  };

  const handleDeletePasskey = async (id: string, name: string) => {
    if (!confirm(`Вы действительно хотите удалить ключ доступа "${name}"?`)) {
      return;
    }
    setPasskeyError(null);
    try {
      const res = await fetch(`/api/auth/passkey/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Ошибка при удалении ключа");
      }
      setPasskeySuccess("Ключ доступа успешно удален");
      setTimeout(() => setPasskeySuccess(null), 3000);
      await loadPasskeys();
    } catch (err: any) {
      setPasskeyError(err.message);
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
    localStorage.setItem("snippetvault_view_mode", defaultViewMode);
    localStorage.setItem("snippetvault_sort_by", defaultSortBy);
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

  const handleLogout = async () => {
    if (confirm("Вы действительно хотите выйти из аккаунта?")) {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
      onClose();
    }
  };

  const exportCollectionOptions: CustomSelectOption[] = userCollections.map((col) => ({
    value: col.id,
    label: col.name,
    icon: (
      <CollectionIcon
        iconType={col.iconType}
        iconValue={col.iconValue}
        color={col.color}
        className="w-4 h-4"
      />
    ),
    badge: col._count?.snippets !== undefined ? `${col._count.snippets}` : undefined,
    description: col.description || undefined,
  }));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-0 sm:p-4 lg:p-6 bg-black/80 backdrop-blur-sm animate-modal-backdrop">
      <div
        ref={dialogRef}
        style={{
          height: modalHeight ? `${modalHeight}px` : undefined,
          transition: hasTransition
            ? "height 0.32s cubic-bezier(0.16, 1, 0.3, 1)"
            : undefined,
        }}
        className="relative w-full max-w-2xl h-[100dvh] sm:h-auto max-h-[100dvh] sm:max-h-[92vh] rounded-none sm:rounded-2xl border-0 sm:border border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden flex flex-col animate-modal-content will-change-[height] safe-top"
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
                Параметры и Личный кабинет
              </h2>
              <p className="text-[11px] sm:text-xs text-zinc-400 truncate hidden sm:block">
                Управление профилем, безопасностью и настройками приложения
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors shrink-0 ml-2 min-w-[36px] min-h-[36px] flex items-center justify-center"
            aria-label="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          ref={tabsRef}
          className="flex items-center px-2 sm:px-6 border-b border-zinc-800 bg-zinc-950/90 text-xs font-semibold gap-0.5 sm:gap-1 overflow-x-auto scrollbar-none shrink-0"
        >
          <button
            type="button"
            onClick={() => handleTabChange("general")}
            className={`flex items-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 px-2 sm:px-3.5 border-b-2 text-[11px] sm:text-xs transition-all whitespace-nowrap ${
              activeTab === "general"
                ? "border-violet-500 text-white"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Общие настройки</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("profile")}
            className={`flex items-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 px-2 sm:px-3.5 border-b-2 text-[11px] sm:text-xs transition-all whitespace-nowrap ${
              activeTab === "profile"
                ? "border-violet-500 text-white"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span>Профиль</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("security")}
            className={`flex items-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 px-2 sm:px-3.5 border-b-2 text-[11px] sm:text-xs transition-all whitespace-nowrap ${
              activeTab === "security"
                ? "border-violet-500 text-white"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Безопасность</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("ai")}
            className={`flex items-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 px-2 sm:px-3.5 border-b-2 text-[11px] sm:text-xs transition-all whitespace-nowrap ${
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
            onClick={() => handleTabChange("data")}
            className={`flex items-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 px-2 sm:px-3.5 border-b-2 text-[11px] sm:text-xs transition-all whitespace-nowrap ${
              activeTab === "data"
                ? "border-violet-500 text-white"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Данные</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto overflow-x-hidden min-h-0"
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
                    Отображение списка сниппетов по умолчанию
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
                        <div className="font-semibold text-white text-xs mb-0.5">Сетка карточек</div>
                        <div className="text-[10px] text-zinc-400">С подсветкой кода и вкладками</div>
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
                        <div className="font-semibold text-white text-xs mb-0.5">Компактный список</div>
                        <div className="text-[10px] text-zinc-400">Табличные строки для быстрой навигации</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Default Sort Order */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-zinc-300 uppercase tracking-wider text-[11px]">
                    Сортировка сниппетов по умолчанию
                  </label>
                  <CustomSelect
                    value={defaultSortBy}
                    onChange={(val) => setDefaultSortBy(val as SortOption)}
                    options={SORT_OPTIONS.map((opt) => ({
                      value: opt.id,
                      label: opt.label,
                    }))}
                  />
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
                    <span>{generalSuccess ? "Сохранено!" : "Сохранить параметры"}</span>
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
                        <span>Информация о себе</span>
                      </h3>
                      <p className="text-[11px] text-zinc-400">
                        Персональные данные вашего профиля
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div className="space-y-1">
                        <label className="text-zinc-400 text-[11px] font-medium">
                          Имя / Псевдоним
                        </label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Ваше имя"
                          className="w-full px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-100 placeholder-zinc-500 outline-none focus:border-violet-500 text-xs"
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
                          className="w-full px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-400 cursor-not-allowed opacity-75 text-xs"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-zinc-400 text-[11px] font-medium">
                        О себе / Краткое описание
                      </label>
                      <textarea
                        rows={3}
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Senior Fullstack Developer / DevOps / etc."
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
                        <span>Сохранить профиль</span>
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
                        Смена пароля
                      </h3>
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      Обновите ваш пароль для входа в аккаунт
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
                          Текущий пароль
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
                          Новый пароль
                        </label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Минимум 6 символов"
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
                        <span>Обновить пароль</span>
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

                {/* Passkeys Security Section */}
                <div className="border border-zinc-800/80 rounded-2xl p-5 bg-zinc-900/40 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Fingerprint className="w-4 h-4 text-violet-400" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                        Ключи доступа (Passkeys / WebAuthn)
                      </h3>
                      {passkeys.length > 0 && (
                        <span className="text-[10px] font-semibold text-violet-300 bg-violet-600/20 border border-violet-500/30 px-2 py-0.5 rounded-full">
                          {passkeys.length} {passkeys.length === 1 ? "ключ" : passkeys.length < 5 ? "ключа" : "ключей"}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      Вход без пароля по биометрии (Touch ID, Windows Hello, Face ID) или аппаратному ключу
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
                    <span>Добавить Passkey</span>
                  </button>
                </div>

                {!passkeySupported && (
                  <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs space-y-1">
                    <div className="font-semibold flex items-center gap-1.5">
                      <span>⚠️ Стандарт WebAuthn / Passkeys недоступен в этом окружении</span>
                    </div>
                    <p className="text-[11px] text-amber-300/80 leading-relaxed">
                      Браузеры разрешают использование биометрии и ключей доступа только в защищенном контексте: через <strong>HTTPS</strong> или <strong>localhost</strong>. При доступе по обычному локальному HTTP (IP-адресу) браузер автоматически отключает WebAuthn API в целях безопасности.
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
                    У вас пока нет добавленных Passkey-ключей. Нажмите &laquo;Добавить Passkey&raquo; для настройки быстрого входа.
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
                                  title="Переименовать"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                            <div className="flex items-center gap-2 text-[10px] text-zinc-500 mt-0.5">
                              <span>
                                Добавлен: {new Date(pk.createdAt).toLocaleDateString("ru-RU")}
                              </span>
                              {pk.lastUsedAt && (
                                <>
                                  <span>•</span>
                                  <span>
                                    Использован: {new Date(pk.lastUsedAt).toLocaleDateString("ru-RU")}
                                  </span>
                                </>
                              )}
                              {pk.backedUp && (
                                <span className="px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                  Синхронизирован
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeletePasskey(pk.id, pk.name)}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0 ml-2"
                          title="Удалить ключ доступа"
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

          {/* TAB 2: AI ASSISTANT */}
          {activeTab === "ai" && (
            <form onSubmit={handleSaveAI} className="space-y-4 animate-in fade-in duration-200">
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
                      Экспорт данных (Резервное копирование)
                    </h3>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Скачивайте структурированный JSON файл со сниппетами, многофайловым кодом, тегами и коллекциями для сохранения или переноса на другой сервер.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Full Backup */}
                  <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/60 flex flex-col justify-between gap-3">
                    <div className="space-y-1">
                      <div className="font-semibold text-white text-xs flex items-center gap-1.5">
                        <HardDrive className="w-3.5 h-3.5 text-violet-400" />
                        <span>Вся база сниппетов</span>
                      </div>
                      <p className="text-[11px] text-zinc-400">
                        Полная резервная копия всех сниппетов, коллекций и метаданных аккаунта в одном файле.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleExportFull}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium text-xs transition-all active:scale-[0.98] shadow-sm shadow-violet-600/20"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Экспортировать всю базу (.json)</span>
                    </button>
                  </div>

                  {/* Collection Export */}
                  <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/60 flex flex-col justify-between gap-3">
                    <div className="space-y-1">
                      <div className="font-semibold text-white text-xs flex items-center gap-1.5">
                        <FolderGit2 className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Отдельная коллекция</span>
                      </div>
                      <p className="text-[11px] text-zinc-400">
                        Экспорт только выбранной коллекции со всеми входящими в неё сниппетами.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <CustomSelect
                        value={selectedExportColId}
                        onChange={setSelectedExportColId}
                        options={exportCollectionOptions}
                        placeholder={
                          userCollections.length === 0
                            ? "Нет доступных коллекций"
                            : "Выберите коллекцию..."
                        }
                        disabled={userCollections.length === 0}
                        searchable={userCollections.length > 5}
                        searchPlaceholder="Поиск коллекции..."
                      />

                      <button
                        type="button"
                        onClick={handleExportSelectedCollection}
                        disabled={!selectedExportColId || userCollections.length === 0}
                        className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/60 text-zinc-200 hover:text-white font-medium text-xs transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Скачать коллекцию (.json)</span>
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
                      Импорт и восстановление данных
                    </h3>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Загрузите файл резервной копии SnippetVault (`.json`). Все коллекции и сниппеты с их файлами, тегами и свойствами будут автоматически восстановлены.
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
                      {importing ? "Импортирование данных..." : "Выберите файл резервной копии для восстановления"}
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      Поддерживаются файлы `.json` полной базы, отдельной коллекции или одиночного сниппета
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
                      <span>{importing ? "Обработка файла..." : "Выбрать файл резервной копии (.json)"}</span>
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
                        Очистить всю базу сниппетов
                      </h3>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed max-w-xl">
                      Безвозвратно удаляет все сохраненные сниппеты, файлы кода и коллекции из базы данных. Если необходимо сохранить наработки, предварительно скачайте резервную копию выше.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleOpenClearConfirm}
                    disabled={clearingDb}
                    className="flex items-center gap-2 py-2 px-3.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs transition-all active:scale-[0.98] shadow-sm shadow-rose-600/25 shrink-0 disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Очистить базу сниппетов</span>
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
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs font-medium text-rose-400 hover:text-rose-300 px-2 sm:px-2.5 py-1.5 rounded-lg hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Выйти из аккаунта</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>

      {/* Confirmation Modal for Clearing Database */}
      {showClearConfirm && (
        <div
          className={`fixed inset-0 z-[70] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm ${
            isClosingClearConfirm ? "animate-modal-backdrop-out" : "animate-modal-backdrop"
          }`}
          onClick={handleCloseClearConfirm}
        >
          <div
            className={`relative w-full max-w-md rounded-xl sm:rounded-2xl border border-rose-500/30 bg-zinc-950 p-4 sm:p-6 shadow-2xl flex flex-col gap-4 sm:gap-5 ${
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
                  Очистить базу сниппетов и коллекций?
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Вы уверены, что хотите удалить <span className="text-rose-300 font-semibold">все сниппеты и коллекции</span> из базы данных? Все файлы кода, теги и персональные заметки будут удалены навсегда.
                </p>
                <div className="p-2 sm:p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-300 font-medium">
                  ⚠️ Это действие необратимо. Рекомендуем предварительно сделать экспорт в JSON.
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
                Отменить
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
                <span>{clearingDb ? "Удаление..." : "Удалить"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
