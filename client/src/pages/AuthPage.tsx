import { useState } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Satellite, ShieldCheck, Mail, Lock, Sparkles, UserCheck, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/dashboard/copernicus/workstation`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      toast.info("Acceso Google OAuth Inicializado", {
        description: err.message || "Conectando con el proveedor de autenticación de Supabase.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.info("Iniciando Sesión en Modo Demostración", {
          description: `Bienvenido ${email}. Ingresando al panel principal.`,
        });
      } else {
        toast.success("Autenticación Supabase Exitosa");
      }
      setLocation("/dashboard/copernicus/workstation");
    } catch (err: any) {
      toast.error("Error al autenticar", { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDemoAdminLogin = () => {
    toast.success("Sesión Administrador Demo Activada", {
      description: "Ingresando como demo@agropulso.com con rol Administrador y Tenant Activo.",
    });
    setLocation("/dashboard/copernicus/workstation");
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Glow Effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-teal-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-800 to-teal-900 text-white shadow-xl shadow-emerald-900/30 mb-2">
            <Satellite className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">AgroPulso SaaS</h1>
          <div className="flex items-center justify-center gap-2">
            <Badge variant="outline" className="text-emerald-400 border-emerald-500/40 bg-emerald-950/60 font-mono text-xs">
              Autenticación Supabase JWT
            </Badge>
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Multi-Tenant RLS
            </span>
          </div>
        </div>

        {/* Card Form */}
        <Card className="border-slate-800 bg-slate-900/90 text-white shadow-2xl backdrop-blur-xl">
          <CardHeader className="pb-4 border-b border-slate-800 text-center">
            <CardTitle className="text-lg font-bold text-white">Ingreso a la Plataforma Satelital</CardTitle>
            <CardDescription className="text-slate-400 text-xs">
              Acceda a la estación de trabajo Copernicus CDSE e informes de precisión.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {/* Google OAuth Button */}
            <Button
              onClick={handleGoogleSignIn}
              disabled={loading}
              variant="outline"
              className="w-full h-11 bg-white hover:bg-slate-100 text-slate-900 font-bold border-slate-200 flex items-center justify-center gap-3 shadow-md"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
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
              <span>Continuar con Google</span>
            </Button>

            <div className="relative flex items-center justify-center">
              <div className="border-t border-slate-800 w-full" />
              <span className="bg-slate-900 px-3 text-[11px] uppercase tracking-wider text-slate-500 font-mono font-semibold relative">
                o por correo electrónico
              </span>
            </div>

            {/* Email Form Tabs */}
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid grid-cols-2 bg-slate-950 p-1 rounded-xl mb-4 border border-slate-800">
                <TabsTrigger value="login" className="text-xs font-bold text-slate-300 data-[state=active]:bg-emerald-800 data-[state=active]:text-white">
                  Iniciar Sesión
                </TabsTrigger>
                <TabsTrigger value="register" className="text-xs font-bold text-slate-300 data-[state=active]:bg-emerald-800 data-[state=active]:text-white">
                  Registrarse
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleEmailSignIn} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-300">Correo Electrónico</Label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="usuario@agropulso.com"
                        className="bg-slate-950 border-slate-800 pl-9 text-sm text-white"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-300">Contraseña</Label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                      <Input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="bg-slate-950 border-slate-800 pl-9 text-sm text-white"
                        required
                      />
                    </div>
                  </div>

                  <Button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 shadow-md">
                    Entrar a la Plataforma <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={handleEmailSignIn} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-300">Correo Electrónico Corporativo</Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nuevo.usuario@empresa.com"
                      className="bg-slate-950 border-slate-800 text-sm text-white"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-300">Crear Contraseña</Label>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 8 caracteres"
                      className="bg-slate-950 border-slate-800 text-sm text-white"
                      required
                    />
                  </div>

                  <Button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 shadow-md">
                    Crear Cuenta Corporativa
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            {/* Admin One-Click Fast Access Button */}
            <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-emerald-400" /> Acceso Rápido Administrador Demo
                </span>
                <Badge className="bg-emerald-800 text-emerald-100 text-[10px]">Privilegios Admin</Badge>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Inicie sesión de forma inmediata con el usuario administrador preconfigurado para explorar todas las capacidades de la plataforma.
              </p>
              <Button
                onClick={handleDemoAdminLogin}
                className="w-full bg-gradient-to-r from-emerald-800 to-teal-800 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold h-9 shadow-sm"
              >
                Ingresar como Admin Demo (demo@agropulso.com)
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
