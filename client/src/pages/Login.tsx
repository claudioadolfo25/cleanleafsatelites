import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Leaf, ArrowRight, Lock, Mail } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

export default function Login() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Por favor completa tu email y contraseña");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast.success("¡Sesión iniciada con éxito!");
      setLocation("/");
    }, 600);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f7f2] p-4 text-stone-800">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-xl sm:p-8">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <Leaf size={24} />
          </div>
          <h1 className="mt-4 font-serif text-3xl font-bold tracking-tight text-stone-900">Iniciar Sesión</h1>
          <p className="mt-2 text-xs text-stone-500">Ingresa a tu cuenta para gestionar tus solicitudes e informes satelitales.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase text-stone-500">Correo Electrónico</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <Input
                type="email"
                placeholder="usuario@empresa.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="pl-9"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase text-stone-500">Contraseña</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="pl-9"
                required
              />
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full bg-emerald-700 hover:bg-emerald-800">
            {loading ? "Iniciando sesión..." : "Ingresar"} <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </form>

        <div className="text-center text-xs text-stone-500">
          ¿No tienes una cuenta?{" "}
          <Link href="/registro" className="font-semibold text-emerald-700 hover:underline">
            Regístrate aquí
          </Link>
        </div>
      </div>
    </div>
  );
}
