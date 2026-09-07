import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Building, Key, Mail, Phone, Save, User, UserCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function UserProfile() {
  const [name, setName] = useState("Carlos Mendoza");
  const [email, setEmail] = useState("carlos@agricola.cl");
  const [company, setCompany] = useState("Hacienda Los Robles");
  const [role, setRole] = useState("Administrador de Campo");
  const [phone, setPhone] = useState("+56 9 8765 4321");
  const [saving, setSaving] = useState(false);

  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error("El nombre y el correo electrónico son obligatorios");
      return;
    }

    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success("Perfil actualizado correctamente");
    }, 500);
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Completa todos los campos de contraseña");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("La nueva contraseña y su confirmación no coinciden");
      return;
    }

    setPasswordModalOpen(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    toast.success("Contraseña actualizada exitosamente");
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-8 text-stone-800">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">Perfil de Usuario</h1>
          <p className="mt-1 text-xs text-stone-500">Administra los datos de tu cuenta y preferencias de acceso.</p>
        </div>
      </div>

      <form onSubmit={handleSaveProfile} className="space-y-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase text-stone-500">Nombre Completo</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <Input value={name} onChange={e => setName(e.target.value)} className="pl-9" required />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase text-stone-500">Correo Electrónico</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} className="pl-9" required />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase text-stone-500">Empresa / Organización</Label>
            <div className="relative">
              <Building className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <Input value={company} onChange={e => setCompany(e.target.value)} className="pl-9" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase text-stone-500">Cargo / Rol</Label>
            <div className="relative">
              <UserCheck className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <Input value={role} onChange={e => setRole(e.target.value)} className="pl-9" />
            </div>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs font-semibold uppercase text-stone-500">Teléfono de Contacto</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <Input value={phone} onChange={e => setPhone(e.target.value)} className="pl-9" />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between border-t border-stone-100">
          <Dialog open={passwordModalOpen} onOpenChange={setPasswordModalOpen}>
            <DialogTrigger asChild>
              <Button type="button" variant="outline" className="text-xs">
                <Key className="mr-2 h-4 w-4" /> Cambiar Contraseña
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Cambiar Contraseña</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleChangePassword} className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Contraseña Actual</Label>
                  <Input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Nueva Contraseña</Label>
                  <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Confirmar Nueva Contraseña</Label>
                  <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full bg-emerald-700 hover:bg-emerald-800">
                  Actualizar Contraseña
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Button type="submit" disabled={saving} className="bg-emerald-700 hover:bg-emerald-800">
            <Save className="mr-2 h-4 w-4" /> {saving ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </div>
      </form>
    </div>
  );
}
