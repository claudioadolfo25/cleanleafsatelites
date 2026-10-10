import { useState } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Satellite, Mail, Phone, ShieldCheck, AlertCircle, CheckCircle2, ArrowLeft, KeyRound } from "lucide-react";

export default function AuthPage() {
  const [, setLocation] = useLocation();

  // Email state
  const [emailMode, setEmailMode] = useState<"login" | "register" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Phone SMS state
  const [phone, setPhone] = useState("");
  const [otpToken, setOtpToken] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  // Status feedback
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const clearMessages = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  // 1. Correo + Contraseña
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setLoading(true);

    try {
      if (emailMode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        setLocation("/dashboard");
      } else if (emailMode === "register") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setSuccessMsg("Registro exitoso. Si la confirmación por correo está activa, revisa tu bandeja de entrada.");
      } else if (emailMode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth?reset=true`,
        });
        if (error) throw error;
        setSuccessMsg("Instrucciones de recuperación enviadas a tu correo.");
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Ocurrió un error en la autenticación por correo.");
    } finally {
      setLoading(false);
    }
  };

  // 2. Teléfono + SMS OTP
  const handleSendSmsOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setLoading(true);

    try {
      const formattedPhone = phone.startsWith("+") ? phone : `+${phone}`;
      const { error } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
      });
      if (error) throw error;
      setOtpSent(true);
      setSuccessMsg(`Código OTP enviado por SMS a ${formattedPhone}.`);
    } catch (err: any) {
      setErrorMsg(
        err?.message ||
          "Error al enviar SMS. Si el servicio de SMS no está configurado en Supabase/Twilio, contacta al administrador."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySmsOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setLoading(true);

    try {
      const formattedPhone = phone.startsWith("+") ? phone : `+${phone}`;
      const { error } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token: otpToken,
        type: "sms",
      });
      if (error) throw error;
      setLocation("/dashboard");
    } catch (err: any) {
      setErrorMsg(err?.message || "Código OTP inválido o expirado.");
    } finally {
      setLoading(false);
    }
  };

  // 3. Google OAuth
  const handleGoogleAuth = async () => {
    clearMessages();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setErrorMsg(err?.message || "Error al iniciar sesión con Google.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f7f2] flex flex-col justify-between p-4 sm:p-6">
      {/* Top bar navigation */}
      <div className="max-w-md w-full mx-auto flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          onClick={() => setLocation("/")}
          className="text-slate-600 hover:text-emerald-950 text-sm gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> Volver al inicio
        </Button>
        <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-semibold bg-emerald-100/80 px-2.5 py-1 rounded-full border border-emerald-200">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" /> Supabase RLS
        </div>
      </div>

      <div className="max-w-md w-full mx-auto my-auto">
        <Card className="border border-slate-200 shadow-lg bg-white">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-2 bg-emerald-700 text-white p-3 rounded-xl w-fit flex items-center justify-center">
              <Satellite className="h-7 w-7" />
            </div>
            <CardTitle className="text-2xl font-bold text-slate-900">Acceso a Cleanleaf</CardTitle>
            <CardDescription className="text-sm text-slate-600 mt-1">
              Ingresa a la plataforma de monitoreo satelital Copernicus
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {errorMsg && (
              <Alert variant="destructive" className="py-2.5">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle className="text-xs font-semibold">Error</AlertTitle>
                <AlertDescription className="text-xs">{errorMsg}</AlertDescription>
              </Alert>
            )}

            {successMsg && (
              <Alert className="py-2.5 border-emerald-300 bg-emerald-50 text-emerald-900">
                <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                <AlertTitle className="text-xs font-semibold">Confirmación</AlertTitle>
                <AlertDescription className="text-xs">{successMsg}</AlertDescription>
              </Alert>
            )}

            {/* Google OAuth Button */}
            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleAuth}
              disabled={loading}
              className="w-full bg-white hover:bg-slate-50 border-slate-300 text-slate-800 font-medium py-5 gap-2 text-sm shadow-sm"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              Continuar con Google
            </Button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-500 font-medium">O elige un método</span>
              </div>
            </div>

            {/* Methods Tabs: Email vs Phone */}
            <Tabs defaultValue="email" className="w-full">
              <TabsList className="grid grid-cols-2 w-full bg-slate-100">
                <TabsTrigger value="email" className="text-xs font-semibold gap-1.5">
                  <Mail className="h-3.5 w-3.5" /> Correo
                </TabsTrigger>
                <TabsTrigger value="phone" className="text-xs font-semibold gap-1.5">
                  <Phone className="h-3.5 w-3.5" /> Teléfono (SMS)
                </TabsTrigger>
              </TabsList>

              {/* Email + Password Tab */}
              <TabsContent value="email" className="pt-3">
                <form onSubmit={handleEmailAuth} className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Correo electrónico
                    </label>
                    <Input
                      type="email"
                      required
                      placeholder="tu.nombre@empresa.cl"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="text-sm"
                    />
                  </div>

                  {emailMode !== "reset" && (
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-semibold text-slate-700">Contraseña</label>
                        {emailMode === "login" && (
                          <button
                            type="button"
                            onClick={() => {
                              setEmailMode("reset");
                              clearMessages();
                            }}
                            className="text-xs text-emerald-700 hover:underline font-medium"
                          >
                            ¿Olvidaste tu clave?
                          </button>
                        )}
                      </div>
                      <Input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="text-sm"
                      />
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-5 text-sm"
                  >
                    {loading
                      ? "Procesando..."
                      : emailMode === "login"
                      ? "Ingresar con Correo"
                      : emailMode === "register"
                      ? "Crear Cuenta"
                      : "Enviar Correo de Recuperación"}
                  </Button>

                  <div className="text-center pt-2">
                    {emailMode === "login" ? (
                      <p className="text-xs text-slate-600">
                        ¿No tienes una cuenta?{" "}
                        <button
                          type="button"
                          onClick={() => {
                            setEmailMode("register");
                            clearMessages();
                          }}
                          className="text-emerald-700 font-semibold hover:underline"
                        >
                          Regístrate aquí
                        </button>
                      </p>
                    ) : (
                      <p className="text-xs text-slate-600">
                        ¿Ya tienes una cuenta?{" "}
                        <button
                          type="button"
                          onClick={() => {
                            setEmailMode("login");
                            clearMessages();
                          }}
                          className="text-emerald-700 font-semibold hover:underline"
                        >
                          Iniciar sesión
                        </button>
                      </p>
                    )}
                  </div>
                </form>
              </TabsContent>

              {/* Phone + SMS OTP Tab */}
              <TabsContent value="phone" className="pt-3">
                {!otpSent ? (
                  <form onSubmit={handleSendSmsOtp} className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Número de Teléfono (con código de país)
                      </label>
                      <Input
                        type="tel"
                        required
                        placeholder="+56912345678"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="text-sm"
                      />
                      <span className="text-[11px] text-slate-500 block mt-1">
                        Ejemplo para Chile: +569XXXXXXXX
                      </span>
                    </div>

                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-5 text-sm gap-2"
                    >
                      <Phone className="h-4 w-4" />
                      {loading ? "Enviando SMS..." : "Enviar Código OTP por SMS"}
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifySmsOtp} className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Código de verificación OTP
                      </label>
                      <Input
                        type="text"
                        required
                        placeholder="123456"
                        value={otpToken}
                        onChange={(e) => setOtpToken(e.target.value)}
                        className="text-sm font-mono tracking-widest text-center text-lg"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-5 text-sm gap-2"
                    >
                      <KeyRound className="h-4 w-4" />
                      {loading ? "Verificando..." : "Verificar Código e Ingresar"}
                    </Button>

                    <button
                      type="button"
                      onClick={() => {
                        setOtpSent(false);
                        clearMessages();
                      }}
                      className="text-xs text-slate-600 hover:underline block text-center w-full pt-1"
                    >
                      Cambiar número de teléfono
                    </button>
                  </form>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <footer className="text-center text-xs text-slate-500 py-4">
        Cleanleaf Satélites — Aislamiento multi-tenant con Supabase Row Level Security
      </footer>
    </div>
  );
}
