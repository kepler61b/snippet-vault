"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Fingerprint,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { startAuthentication, browserSupportsWebAuthn } from "@simplewebauthn/browser";
import { APP_CONFIG } from "@/lib/version";
import { useI18n } from "@/lib/i18n";

export default function LoginPage() {
  const router = useRouter();
  const { t, locale } = useI18n();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // 2FA state
  const [require2FA, setRequire2FA] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [tempToken, setTempToken] = useState("");

  const [loading, setLoading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [passkeySupported, setPasskeySupported] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // System auth status
  const [authStatus, setAuthStatus] = useState<{
    showLocalAdminPrompt: boolean;
    otherUsersCount: number;
    totalUsers: number;
    localAdminEmail?: string;
  } | null>(null);

  useEffect(() => {
    setPasskeySupported(browserSupportsWebAuthn());

    // Load auth status
    fetch("/api/auth/status")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setAuthStatus({
            showLocalAdminPrompt: Boolean(data.showLocalAdminPrompt),
            otherUsersCount: data.otherUsersCount || 0,
            totalUsers: data.totalUsers || 0,
            localAdminEmail: data.localAdminEmail || "admin@snippetvault.local",
          });
        }
      })
      .catch((err) => console.error("Error loading auth status:", err));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Неверный email или пароль");
      }

      if (data.require2FA) {
        setRequire2FA(true);
        setTempToken(data.tempToken);
        setLoading(false);
        return;
      }

      // Login success -> redirect to main app
      window.location.href = "/";
    } catch (err: any) {
      setError(err.message || "Произошла ошибка при отправке запроса");
      setLoading(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (twoFactorCode.trim().length !== 6) {
      setError("Введите 6-значный код подтверждения");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tempToken,
          code: twoFactorCode.trim(),
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Неверный код доступа");
      }

      // 2FA Success -> redirect to dashboard
      window.location.href = "/";
    } catch (err: any) {
      setError(err.message || "Ошибка проверки двухфакторного кода");
      setLoading(false);
    }
  };

  const handlePasskeyLogin = async () => {
    setError(null);
    setPasskeyLoading(true);

    try {
      // 1. Fetch challenge & authentication options from server
      const res = await fetch("/api/auth/passkey/login/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() || undefined }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Не удалось получить параметры для Passkey");
      }

      // 2. Prompt browser WebAuthn authenticator (Touch ID, Windows Hello, Security Key)
      const authResp = await startAuthentication({ optionsJSON: data.options });

      // 3. Verify assertion with server
      const verifyRes = await fetch("/api/auth/passkey/login/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: authResp }),
      });
      const verifyData = await verifyRes.json();

      if (!verifyRes.ok || !verifyData.success) {
        throw new Error(verifyData.error || "Ошибка верификации Passkey");
      }

      // Success -> redirect to dashboard
      window.location.href = "/";
    } catch (err: any) {
      console.warn("Passkey login error:", err);
      if (
        err.name === "NotAllowedError" ||
        err.message?.includes("cancelled") ||
        err.message?.includes("aborted")
      ) {
        setError("Вход через Passkey был отменен пользователем");
      } else {
        setError(err.message || "Ошибка входа через Passkey");
      }
    } finally {
      setPasskeyLoading(false);
    }
  };

  const fillLocalAdminCredentials = () => {
    setEmail("admin@snippetvault.local");
    setPassword("admin12345");
  };

  return (
    <div className="min-h-[100dvh] bg-zinc-950 flex flex-col justify-center items-center p-3 sm:p-6 relative overflow-hidden selection:bg-violet-500/30 selection:text-white safe-top safe-bottom">
      {/* Background glowing decorations */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-violet-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-5 sm:space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-block mb-1">
            <img
              src="/logo.png"
              alt="SnippetVault"
              className="w-14 h-14 sm:w-16 sm:h-16 object-contain mx-auto select-none drop-shadow-[0_4px_16px_rgba(56,189,248,0.3)]"
            />
          </div>
          <div className="flex items-center justify-center gap-1.5 sm:gap-2">
            <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent">
              {APP_CONFIG.name}
            </h1>
            {APP_CONFIG.env === "prod" ? (
              <span className="inline-flex items-center gap-1 text-[9px] sm:text-[11px] font-bold px-1.5 sm:px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Prod {APP_CONFIG.version}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[9px] sm:text-[11px] font-bold px-1.5 sm:px-2 py-0.5 rounded-md bg-yellow-500/20 text-yellow-300 border border-yellow-500/40">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                <span>Dev {APP_CONFIG.version}</span>
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-400">
            {t("sidebar.footerDesc")}
          </p>
        </div>

        {/* Auth Card */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-xl p-5 sm:p-8 shadow-2xl animate-modal-content">
          {!require2FA ? (
            <>
              {/* Header inside card */}
              <div className="mb-5 sm:mb-6 text-center">
                <h2 className="text-sm sm:text-base font-semibold text-white">{t("login.title")}</h2>
                <p className="text-xs text-zinc-400 mt-0.5 sm:mt-1">
                  {t("login.subtitle")}
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-4 p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs">
                  {error}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">
                    {t("login.emailLabel")}
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      placeholder="developer@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-zinc-800 bg-zinc-950/80 focus:bg-zinc-950 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 text-base sm:text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-all min-h-[44px]"
                    />
                    <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-3.5 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">
                    {t("login.passwordLabel")}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-zinc-800 bg-zinc-950/80 focus:bg-zinc-950 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 text-base sm:text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-all min-h-[44px]"
                    />
                    <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-3.5 pointer-events-none" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-zinc-500 hover:text-zinc-300 p-1 transition-colors"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-md shadow-violet-600/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 min-h-[44px]"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{t("login.signInBtn")}</span>
                </button>
              </form>

              {/* Passkey 1-click login */}
              {passkeySupported && (
                <>
                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-zinc-800/80" />
                    </div>
                    <div className="relative flex justify-center text-[11px] uppercase">
                      <span className="bg-zinc-900/90 px-2 text-zinc-500 font-medium">{t("login.or")}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handlePasskeyLogin}
                    disabled={passkeyLoading || loading}
                    className="w-full py-2.5 px-4 rounded-xl text-sm font-medium text-zinc-200 bg-zinc-950/80 hover:bg-zinc-800/80 hover:text-white border border-zinc-800 hover:border-zinc-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 min-h-[44px] group"
                  >
                    {passkeyLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
                    ) : (
                      <Fingerprint className="w-4 h-4 text-violet-400 group-hover:text-violet-300 transition-colors" />
                    )}
                    <span>{t("login.passkeyBtn")}</span>
                  </button>
                </>
              )}

              {/* Local Admin Prompt: displayed ONLY if there are no other accounts besides the local administrator */}
              {authStatus?.showLocalAdminPrompt && (
                <div className="mt-5 p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-200 text-xs space-y-2 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 font-semibold text-amber-300">
                    <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Первый вход в систему</span>
                  </div>
                  <p className="text-[11px] text-amber-200/80 leading-relaxed">
                    В системе еще нет зарегистрированных пользователей. Войдите под локальным администратором, чтобы создать учетные записи и управлять системой.
                  </p>
                  <button
                    type="button"
                    onClick={fillLocalAdminCredentials}
                    className="w-full py-2.5 px-3 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 min-h-[40px] active:scale-[0.98]"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Заполнить: admin@snippetvault.local / admin12345</span>
                  </button>
                </div>
              )}
            </>
          ) : (
            /* 2FA Step */
            <form onSubmit={handleVerify2FA} className="space-y-5 animate-in fade-in duration-200">
              <div className="text-center space-y-1">
                <div className="inline-flex p-3 rounded-full bg-violet-600/15 text-violet-400 border border-violet-500/20 mb-1">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-bold text-white">
                  {t("login.twoFactorTitle")}
                </h2>
                <p className="text-xs text-zinc-400 max-w-xs mx-auto leading-relaxed">
                  {t("login.twoFactorDesc")}
                </p>
              </div>

              {error && (
                <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs text-center">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <input
                  type="text"
                  autoFocus
                  maxLength={6}
                  placeholder={t("login.twoFactorPlaceholder")}
                  value={twoFactorCode}
                  onChange={(e) =>
                    setTwoFactorCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  className="w-full text-center tracking-[0.5em] text-2xl font-mono py-3 rounded-xl border border-zinc-800 bg-zinc-950 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 text-white placeholder-zinc-700 outline-none transition-all"
                />
              </div>

              <div className="space-y-2">
                <button
                  type="submit"
                  disabled={loading || twoFactorCode.length !== 6}
                  className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-md shadow-violet-600/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{t("login.verifyBtn")}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRequire2FA(false);
                    setTwoFactorCode("");
                    setError(null);
                  }}
                  className="w-full py-2 text-xs font-medium text-zinc-400 hover:text-white transition-colors flex items-center justify-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>{t("login.backToLogin")}</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer author credit */}
        <div className="text-center">
          <a
            href="https://github.com/scfmcdck"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-zinc-500 hover:text-violet-400 transition-colors inline-flex items-center gap-1 group"
          >
            <span>made by</span>
            <span className="font-semibold text-zinc-400 group-hover:text-violet-300">scfmcdck</span>
          </a>
        </div>
      </div>
    </div>
  );
}
