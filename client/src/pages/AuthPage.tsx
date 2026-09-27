import React, { useState } from "react";
import { useLocation } from "wouter";
import { Shield, Lock, Mail, ArrowRight, AlertCircle, KeyRound, CheckCircle2 } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/authContext";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { loginWithDemo } = useAuth();
  const [tab, setTab] = useState<"login" | "register" | "recovery">("login");

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  // Status & Feedback states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const enableDemoAuth = import.meta.env.VITE_ENABLE_DEMO_AUTH === "true";

  const clearMessages = () => {
    setError(null);
    setSuccessMsg(null);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!email || !password) {
      setError("Por favor ingresa tu correo y contraseña.");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message || "Credenciales inválidas. Verifica tu correo y contraseña.");
        return;
      }

      if (data.session) {
        setSuccessMsg("¡Sesión iniciada correctamente!");
        setTimeout(() => setLocation("/dashboard"), 500);
      }
    } catch (err: any) {
      setError(err.message || "Error inesperado al iniciar sesión.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!email || !password || !fullName) {
      setError("Por favor completa todos los campos requeridos.");
      return;
    }

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        setError(error.message);
        return;
      }

      if (data.user) {
        setSuccessMsg(
          data.session
            ? "Cuenta creada exitosamente. Redirigiendo..."
            : "Registro completado. Por favor revisa tu correo electrónico para confirmar la cuenta."
        );
        if (data.session) {
          setTimeout(() => setLocation("/dashboard"), 1000);
        }
      }
    } catch (err: any) {
      setError(err.message || "Error al registrar usuario.");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!email) {
      setError("Ingresa tu correo para enviar el enlace de recuperación.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?reset=true`,
      });

      if (error) {
        setError(error.message);
      } else {
        setSuccessMsg("Hemos enviado las instrucciones de recuperación a tu correo.");
      }
    } catch (err: any) {
      setError(err.message || "Error al solicitar restablecimiento de contraseña.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleOAuth = async () => {
    clearMessages();
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (error) setError(error.message);
    } catch (err: any) {
      setError(err.message || "Error al conectar con Google OAuth.");
    }
  };

  const handleDemoLogin = async () => {
    clearMessages();
    const success = await loginWithDemo();
    if (success) {
      setLocation("/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        {/* Glow Header Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 mb-3">
            <Shield className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">AgroPulso Auth</h1>
          <p className="text-xs text-slate-400 mt-1">Monitoreo Satelital Multi-Tenant Copernicus CDSE</p>
        </div>

        {/* Auth Mode Tabs */}
        <div className="flex bg-slate-950 p-1 rounded-xl mb-6 border border-slate-800 text-xs font-medium">
          <button
            onClick={() => { setTab("login"); clearMessages(); }}
            className={`flex-1 py-2 rounded-lg transition-all ${
              tab === "login" ? "bg-emerald-600 text-white font-semibold shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            Iniciar Sesión
          </button>
          <button
            onClick={() => { setTab("register"); clearMessages(); }}
            className={`flex-1 py-2 rounded-lg transition-all ${
              tab === "register" ? "bg-emerald-600 text-white font-semibold shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            Crear Cuenta
          </button>
        </div>

        {/* Feedback Messages */}
        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Login Form */}
        {tab === "login" && (
          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Correo Electrónico</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@empresa.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-medium text-slate-300">Contraseña</label>
                <button
                  type="button"
                  onClick={() => { setTab("recovery"); clearMessages(); }}
                  className="text-[11px] text-emerald-400 hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs py-3 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 disabled:opacity-50"
            >
              {loading ? "Verificando..." : "Acceder a la Plataforma"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Register Form */}
        {tab === "register" && (
          <form onSubmit={handleSignUp} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Nombre Completo</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Juan Pérez"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Correo Electrónico Corporativo</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="juan@agricola.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Contraseña (Mínimo 8 caracteres)</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs py-3 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 disabled:opacity-50"
            >
              {loading ? "Creando cuenta..." : "Registrar Organización"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Recovery Form */}
        {tab === "recovery" && (
          <form onSubmit={handlePasswordReset} className="space-y-4">
            <p className="text-xs text-slate-400 mb-2">
              Ingresa el correo corporativo asociado a tu cuenta para recibir las instrucciones de recuperación.
            </p>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Correo Electrónico</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@empresa.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs py-3 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 disabled:opacity-50"
            >
              {loading ? "Enviando..." : "Enviar Enlace de Recuperación"}
              <KeyRound className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => { setTab("login"); clearMessages(); }}
              className="w-full text-xs text-slate-400 hover:text-white pt-2 text-center block"
            >
              Volver al inicio de sesión
            </button>
          </form>
        )}

        {/* OAuth Social Dividers */}
        <div className="mt-6 pt-6 border-t border-slate-800 space-y-3">
          <button
            type="button"
            onClick={handleGoogleOAuth}
            className="w-full bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs py-2.5 rounded-xl font-medium transition flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            Continuar con Google
          </button>

          {/* Gate Demo Auth Button */}
          {enableDemoAuth ? (
            <button
              type="button"
              onClick={handleDemoLogin}
              className="w-full bg-slate-900/80 hover:bg-slate-800 border border-emerald-500/30 text-emerald-400 text-xs py-2 rounded-xl font-medium transition flex items-center justify-center gap-2"
            >
              <KeyRound className="w-3.5 h-3.5" />
              Acceso Rápido Admin Demo (Staging)
            </button>
          ) : (
            <p className="text-[10px] text-slate-500 text-center">
              Acceso Admin Demo desactivado por configuración de entorno (`VITE_ENABLE_DEMO_AUTH`).
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
