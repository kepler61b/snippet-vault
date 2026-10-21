"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  Terminal,
  User,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // 2FA state
  const [require2FA, setRequire2FA] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [tempToken, setTempToken] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    try {
      if (!sessionStorage.getItem("snippetvault_tab_session")) {
        fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
      }
    } catch {}
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "login") {
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

        // Login success
        sessionStorage.setItem("snippetvault_tab_session", "active");
        window.location.href = "/";
      } else {
        // Register
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, name }),
        });
        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.error || "Ошибка регистрации");
        }

        // Register success
        sessionStorage.setItem("snippetvault_tab_session", "active");
        window.location.href = "/";
      }
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
      sessionStorage.setItem("snippetvault_tab_session", "active");
      window.location.href = "/";
    } catch (err: any) {
      setError(err.message || "Ошибка проверки двухфакторного кода");
      setLoading(false);
    }
  };

  const fillDemoCredentials = () => {
    setEmail("admin@snippetvault.local");
    setPassword("admin12345");
    setMode("login");
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col justify-center items-center p-4 relative overflow-hidden selection:bg-violet-500/30 selection:text-white">
      {/* Background glowing decorations */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-violet-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-sky-500 text-white shadow-xl shadow-indigo-500/25 mb-1">
            <Terminal className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent">
            SnippetVault
          </h1>
          <p className="text-xs text-zinc-400">
            Безопасное хранилище кода с поддержкой мульти-файлов и AI
          </p>
        </div>

        {/* Auth Card */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-xl p-6 sm:p-8 shadow-2xl animate-modal-content">
          {!require2FA ? (
            <>
              {/* Tab Switcher: Login / Register */}
              <div className="grid grid-cols-2 p-1 mb-6 rounded-xl bg-zinc-950/80 border border-zinc-800/80 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setError(null);
                  }}
                  className={`py-2 rounded-lg transition-all ${
                    mode === "login"
                      ? "bg-violet-600 text-white shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Вход
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("register");
                    setError(null);
                  }}
                  className={`py-2 rounded-lg transition-all ${
                    mode === "register"
                      ? "bg-violet-600 text-white shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Регистрация
                </button>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-4 p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs">
                  {error}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === "register" && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-300">
                      Имя пользователя
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Александр"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-zinc-800 bg-zinc-950/80 focus:bg-zinc-950 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-all"
                      />
                      <User className="w-4 h-4 text-zinc-500 absolute left-3 top-3 pointer-events-none" />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">
                    Email адрес
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      placeholder="developer@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-zinc-800 bg-zinc-950/80 focus:bg-zinc-950 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-all"
                    />
                    <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-3 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">
                    Пароль
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-zinc-800 bg-zinc-950/80 focus:bg-zinc-950 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-all"
                    />
                    <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-3 pointer-events-none" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-zinc-500 hover:text-zinc-300 transition-colors"
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
                  className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-md shadow-violet-600/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{mode === "login" ? "Войти в аккаунт" : "Создать аккаунт"}</span>
                </button>
              </form>

              {/* Demo user quick action */}
              <div className="mt-5 pt-4 border-t border-zinc-800/80 flex flex-col items-center gap-2">
                <span className="text-[11px] text-zinc-500">
                  Демо-аккаунт для быстрого тестирования:
                </span>
                <button
                  type="button"
                  onClick={fillDemoCredentials}
                  className="px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-xs text-zinc-300 hover:text-white transition-all flex items-center gap-1.5"
                >
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                  <span>admin@snippetvault.local / admin12345</span>
                </button>
              </div>
            </>
          ) : (
            /* 2FA Step */
            <form onSubmit={handleVerify2FA} className="space-y-5 animate-in fade-in duration-200">
              <div className="text-center space-y-1">
                <div className="inline-flex p-3 rounded-full bg-violet-600/15 text-violet-400 border border-violet-500/20 mb-1">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-bold text-white">
                  Двухфакторная аутентификация
                </h2>
                <p className="text-xs text-zinc-400 max-w-xs mx-auto leading-relaxed">
                  Для входа введите 6-значный код из приложения аутентификатора
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
                  placeholder="000000"
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
                  <span>Подтвердить вход</span>
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
                  <span>Назад к логину</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
