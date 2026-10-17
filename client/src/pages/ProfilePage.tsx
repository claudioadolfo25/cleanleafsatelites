import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { User, Lock, Building, Mail, Shield, AlertCircle, CheckCircle2, KeyRound } from "lucide-react";

export default function ProfilePage() {
  const { user } = useAuth();

  // Profile Form State
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState("");
  const [organization, setOrganization] = useState(user?.tenantId || "");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Auth Provider Detection
  const [provider, setProvider] = useState<string>("email");

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const isAdmin = ["admin", "owner", "super_admin"].includes(user?.role || "");

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setOrganization(user.tenantId || "");
    }

    if (supabase) {
      supabase.auth.getUser().then(({ data }) => {
        const u = data.user;
        if (u) {
          const appMeta = u.app_metadata || {};
          const identities = u.identities || [];
          const currentProvider = identities[0]?.provider || appMeta.provider || "email";
          setProvider(currentProvider);
          if (u.phone) setPhone(u.phone);
        }
      });
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);
    setProfileSaving(true);

    try {
      if (supabase) {
        const { error } = await supabase.auth.updateUser({
          data: { name },
        });
        if (error) throw error;
      }
      setProfileMsg({ type: "success", text: "Perfil actualizado correctamente." });
    } catch (err: any) {
      setProfileMsg({ type: "error", text: err?.message || "No se pudo actualizar el perfil." });
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (newPassword.length < 8) {
      setPasswordMsg({ type: "error", text: "La nueva contraseña debe tener al menos 8 caracteres." });
      return;
    }
    if (!/\d/.test(newPassword) || !/[a-zA-Z]/.test(newPassword)) {
      setPasswordMsg({ type: "error", text: "La contraseña debe incluir letras y números." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: "error", text: "Las contraseñas no coinciden." });
      return;
    }

    if (!supabase) {
      setPasswordMsg({ type: "error", text: "Cliente de Supabase no disponible." });
      return;
    }

    setPasswordSaving(true);
    try {
      // 1. Re-autenticación con contraseña actual
      if (user?.email) {
        const { error: reAuthErr } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: currentPassword,
        });
        if (reAuthErr) {
          throw new Error("La contraseña actual es incorrecta.");
        }
      }

      // 2. Actualizar contraseña
      const { error: updateErr } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (updateErr) throw updateErr;

      setPasswordMsg({ type: "success", text: "Contraseña actualizada con éxito." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPasswordMsg({ type: "error", text: err?.message || "Error al actualizar la contraseña." });
    } finally {
      setPasswordSaving(false);
    }
  };

  const isExternalProvider = provider === "google" || provider === "phone";

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6 pb-12">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mi Perfil</h1>
          <p className="text-sm text-slate-600 mt-1">
            Gestiona la información personal de tu cuenta y preferencias de acceso.
          </p>
        </div>

        {/* Informacion de Cuenta (Metadata) */}
        <Card className="border border-slate-200 bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <User className="h-5 w-5 text-emerald-700" /> Datos de la Cuenta
            </CardTitle>
            <CardDescription className="text-xs text-slate-600">
              Identificadores de usuario y permisos asignados en el tenant
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 uppercase block mb-1 flex items-center gap-1">
                <Mail className="h-3 w-3" /> Correo Electrónico
              </span>
              <p className="text-sm font-medium text-slate-900 truncate">{user?.email || "-"}</p>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 uppercase block mb-1 flex items-center gap-1">
                <Shield className="h-3 w-3" /> Rol en Plataforma
              </span>
              <Badge variant="outline" className="text-xs font-bold capitalize bg-emerald-50 text-emerald-800 border-emerald-300">
                {user?.role || "usuario"}
              </Badge>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 uppercase block mb-1 flex items-center gap-1">
                <Building className="h-3 w-3" /> Identificador Tenant
              </span>
              <p className="text-sm font-mono text-slate-800 truncate">{user?.tenantId || "-"}</p>
            </div>
          </CardContent>
        </Card>

        {/* Editar Perfil */}
        <Card className="border border-slate-200 bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Building className="h-5 w-5 text-emerald-700" /> Editar Perfil Personal
            </CardTitle>
            <CardDescription className="text-xs text-slate-600">
              Actualiza tu nombre y teléfono. La organización sólo es modificable por administradores.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {profileMsg && (
              <Alert variant={profileMsg.type === "error" ? "destructive" : "default"} className={`py-2.5 ${profileMsg.type === "success" ? "border-emerald-300 bg-emerald-50 text-emerald-900" : ""}`}>
                {profileMsg.type === "error" ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4 text-emerald-700" />}
                <AlertTitle className="text-xs font-semibold">{profileMsg.type === "error" ? "Error" : "Actualizado"}</AlertTitle>
                <AlertDescription className="text-xs">{profileMsg.text}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Nombre Completo</label>
                  <Input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. Emilia Muñoz"
                    className="text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Teléfono Móvil</label>
                  <Input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+56912345678"
                    className="text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Organización / Tenant {!isAdmin && <span className="text-slate-400 font-normal">(Lectura)</span>}
                </label>
                <Input
                  type="text"
                  value={organization}
                  disabled={!isAdmin}
                  onChange={(e) => setOrganization(e.target.value)}
                  className="text-sm bg-slate-50 disabled:opacity-70"
                />
              </div>

              <Button type="submit" disabled={profileSaving} className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs py-2">
                {profileSaving ? "Guardando..." : "Guardar Cambios de Perfil"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Cambio de Contraseña */}
        <Card className="border border-slate-200 bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Lock className="h-5 w-5 text-emerald-700" /> Seguridad y Contraseña
            </CardTitle>
            <CardDescription className="text-xs text-slate-600">
              Actualiza la clave de acceso a tu cuenta.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {isExternalProvider ? (
              <Alert className="border-amber-300 bg-amber-50 text-amber-900">
                <KeyRound className="h-4 w-4 text-amber-700" />
                <AlertTitle className="text-xs font-semibold">Acceso vía proveedor externo ({provider})</AlertTitle>
                <AlertDescription className="text-xs mt-1">
                  Iniciaste sesión con <strong>{provider === "google" ? "Google OAuth" : "SMS OTP"}</strong>. Tu contraseña es gestionada directamente por tu proveedor de autenticación y no se configura localmente.
                </AlertDescription>
              </Alert>
            ) : (
              <form onSubmit={handleChangePassword} className="space-y-4">
                {passwordMsg && (
                  <Alert variant={passwordMsg.type === "error" ? "destructive" : "default"} className={`py-2.5 ${passwordMsg.type === "success" ? "border-emerald-300 bg-emerald-50 text-emerald-900" : ""}`}>
                    {passwordMsg.type === "error" ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4 text-emerald-700" />}
                    <AlertTitle className="text-xs font-semibold">{passwordMsg.type === "error" ? "Error" : "Éxito"}</AlertTitle>
                    <AlertDescription className="text-xs">{passwordMsg.text}</AlertDescription>
                  </Alert>
                )}

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Contraseña Actual</label>
                  <Input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    className="text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Nueva Contraseña</label>
                    <Input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Confirmar Nueva Contraseña</label>
                    <Input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="text-sm"
                    />
                  </div>
                </div>

                <Button type="submit" disabled={passwordSaving} className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs py-2">
                  {passwordSaving ? "Actualizando..." : "Cambiar Contraseña"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
