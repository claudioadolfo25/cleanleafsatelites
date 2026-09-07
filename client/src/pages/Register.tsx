import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Leaf, ArrowRight, Building, Mail, User, Phone, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

export default function Register() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<"account" | "sector">("account");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [sector, setSector] = useState("agricultura");
  const [loading, setLoading] = useState(false);

  const isFreeDomain = (emailStr: string) => {
    const domain = emailStr.split("@")[1]?.toLowerCase() || "";
    return ["gmail.com", "hotmail.com", "yahoo.com", "outlook.com"].includes(domain);
  };

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) {
      toast.error("Ingresa tu nombre y correo electrónico");
      return;
    }

    if (isFreeDomain(email)) {
      toast.warning("Sugerimos usar tu correo corporativo para una mejor configuración sectorial.");
    }

    setStep("sector");
  };

  const handleComplete = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast.success("¡Registro completado! Bienvenido a Cleanleaf.");
      setLocation("/");
    }, 600);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f7f2] p-4 text-stone-800">
      <div className="w-full max-w-lg space-y-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-xl sm:p-8">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <Leaf size={24} />
          </div>
          <h1 className="mt-4 font-serif text-3xl font-bold tracking-tight text-stone-900">Crear Cuenta</h1>
          <p className="mt-2 text-xs text-stone-500">
            {step === "account" ? "Paso 1: Datos de tu organización" : "Paso 2: Selección de sector primario"}
          </p>
        </div>

        {step === "account" ? (
          <form onSubmit={handleNext} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-stone-500">Nombre Completo</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                <Input
                  placeholder="Carlos Mendoza"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="pl-9"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-stone-500">Correo Electrónico</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                <Input
                  type="email"
                  placeholder="carlos@agricola.cl"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="pl-9"
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase text-stone-500">Empresa / Predio</Label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                  <Input
                    placeholder="Hacienda Los Robles"
                    value={company}
                    onChange={e => setCompany(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase text-stone-500">Teléfono</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                  <Input
                    placeholder="+56 9 1234 5678"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full bg-emerald-700 hover:bg-emerald-800">
              Continuar a Selección de Sector <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>
        ) : (
          <form onSubmit={handleComplete} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase text-stone-500">Sector de Operación</Label>
              <Select value={sector} onValueChange={setSector}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="agricultura">Agricultura (Sentinel-2 + Sentinel-1)</SelectItem>
                  <SelectItem value="acuicultura">Acuicultura (Sentinel-3 + Sentinel-2)</SelectItem>
                  <SelectItem value="forestal">Forestal (Sentinel-2 + Sentinel-1)</SelectItem>
                  <SelectItem value="emergencias">Emergencias / Riesgo Territorial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-4 text-xs leading-5 text-emerald-900">
              <p className="font-semibold">Configuración de catálogo automático:</p>
              <p className="mt-1 text-emerald-700">
                Se habilitarán automáticamente las misiones autorizadas y recomendaciones óptimas para {sector}.
              </p>
            </div>

            <Button type="submit" disabled={loading} className="w-full bg-emerald-700 hover:bg-emerald-800">
              {loading ? "Completando..." : "Completar Registro"} <CheckCircle2 className="ml-2 h-4 w-4" />
            </Button>
          </form>
        )}

        <div className="text-center text-xs text-stone-500">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="font-semibold text-emerald-700 hover:underline">
            Iniciar Sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
