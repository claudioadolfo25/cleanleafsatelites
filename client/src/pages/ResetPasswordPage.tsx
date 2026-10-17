import { useState } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { KeyRound, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";

export default function ResetPasswordPage() {
  const [, setLocation] = useLocation();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (newPassword.length < 8) {
      setErrorMsg("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (!/\d/.test(newPassword) || !/[a-zA-Z]/.test(newPassword)) {
      setErrorMsg("La contraseña debe incluir letras y números.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg("Las contraseñas no coinciden.");
      return;
    }

    if (!supabase) {
      setErrorMsg("Cliente de Supabase no inicializado.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      setSuccessMsg("Tu contraseña ha sido actualizada correctamente.");
      setTimeout(() => setLocation("/dashboard"), 2000);
    } catch (err: any) {
      setErrorMsg(err?.message || "No se pudo restablecer la contraseña.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f7f2] flex flex-col justify-between p-4 sm:p-6">
      <div className="max-w-md w-full mx-auto flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          onClick={() => setLocation("/auth")}
          className="text-slate-600 hover:text-emerald-950 text-sm gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> Volver al login
        </Button>
      </div>

      <div className="max-w-md w-full mx-auto my-auto">
        <Card className="border border-slate-200 shadow-lg bg-white">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-2 bg-emerald-700 text-white p-3 rounded-xl w-fit flex items-center justify-center">
              <KeyRound className="h-7 w-7" />
            </div>
            <CardTitle className="text-2xl font-bold text-slate-900">Restablecer Contraseña</CardTitle>
            <CardDescription className="text-sm text-slate-600 mt-1">
              Ingresa tu nueva contraseña para actualizar tu cuenta.
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
                <AlertTitle className="text-xs font-semibold">Éxito</AlertTitle>
                <AlertDescription className="text-xs">{successMsg}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleReset} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Nueva contraseña
                </label>
                <Input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Confirmar nueva contraseña
                </label>
                <Input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="text-sm"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-5 text-sm"
              >
                {loading ? "Actualizando..." : "Restablecer Contraseña"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <footer className="text-center text-xs text-slate-500 py-4">
        Cleanleaf Satélites — Restablecimiento de contraseña
      </footer>
    </div>
  );
}
