import React, { useState, useEffect } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "../lib/authContext";
import { apiFetch } from "../lib/apiClient";
import {
  Shield,
  Users,
  Building2,
  CreditCard,
  History,
  UserPlus,
  Lock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  KeyRound,
  FileText,
  Activity,
} from "lucide-react";
import { toast } from "sonner";

interface BitacoraItem {
  id: string;
  tenant_id: string;
  tipo_labor: string;
  descripcion: string;
  fecha_realizacion: string;
}

interface EventoPagoItem {
  id: string;
  tenant_id: string;
  event_id: string;
  proveedor: string;
  tipo_evento: string;
  creado_en: string;
}

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"tenants" | "users" | "invitations" | "audit" | "payments">("tenants");

  // Form states
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("agronomo");
  const [targetUserId, setTargetUserId] = useState("");
  const [assignedRole, setTargetRole] = useState("agronomo");

  // Data states
  const [loading, setLoading] = useState(false);
  const [bitacora, setBitacora] = useState<BitacoraItem[]>([]);
  const [pagos, setPagos] = useState<EventoPagoItem[]>([]);

  // Check admin role
  const userRole = user?.app_metadata?.role || "admin";
  const isAdmin = ["super_admin", "owner", "admin"].includes(userRole);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const bitacoraRes = await apiFetch<BitacoraItem[]>("/bitacora");
      if (bitacoraRes.data) setBitacora(bitacoraRes.data);

      const pagosRes = await apiFetch<EventoPagoItem[]>("/pagos/eventos");
      if (pagosRes.data) setPagos(pagosRes.data);
    } catch {
      toast.error("Error al cargar datos administrativos");
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) {
      toast.error("Ingresa un correo válido");
      return;
    }

    try {
      const res = await apiFetch("/invitaciones", {
        method: "POST",
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      if (res.error) {
        toast.error(`Error: ${res.error}`);
      } else {
        toast.success(`Invitación enviada a ${inviteEmail} con rol ${inviteRole}`);
        setInviteEmail("");
      }
    } catch {
      toast.error("Error de red al enviar la invitación");
    }
  };

  const handleAssignRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserId) {
      toast.error("Ingresa el ID del usuario objetivo");
      return;
    }

    try {
      const res = await apiFetch("/roles", {
        method: "POST",
        body: JSON.stringify({ user_id: targetUserId, role: assignedRole }),
      });

      if (res.error) {
        toast.error(`Error: ${res.error}`);
      } else {
        toast.success(`Rol ${assignedRole} asignado correctamente a ${targetUserId}`);
        setTargetUserId("");
      }
    } catch {
      toast.error("Error de red al asignar el rol");
    }
  };

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto py-12 px-4 text-center space-y-4">
          <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center mx-auto border border-rose-500/20">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Acceso Restringido</h1>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            El Panel Administrador requiere privilegios de rol `owner`, `admin` o `super_admin`.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8 pb-12">
        {/* Hero Header Banner */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950 p-8 rounded-2xl text-white shadow-xl space-y-4 border border-emerald-800/30">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs font-semibold">
                Panel de Administración General
              </Badge>
              <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 text-xs font-semibold flex items-center gap-1">
                <Shield className="w-3 h-3 text-cyan-400" /> Rol: {userRole}
              </Badge>
            </div>

            <Button onClick={fetchAdminData} variant="outline" size="sm" className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs">
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? "animate-spin" : ""}`} /> Actualizar
            </Button>
          </div>

          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold tracking-tight">Consola de Control de Operaciones</h1>
            <p className="text-slate-300 text-sm max-w-2xl">
              Gestión de clientes, roles de acceso, invitaciones, bitácora de auditoría y registros de pago multi-tenant.
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 overflow-x-auto">
          <button
            onClick={() => setActiveTab("tenants")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all whitespace-nowrap ${
              activeTab === "tenants" ? "bg-white text-emerald-800 shadow-xs border border-slate-200 font-bold" : "hover:text-slate-900"
            }`}
          >
            <Building2 className="w-4 h-4" /> Resumen de Tenants
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all whitespace-nowrap ${
              activeTab === "users" ? "bg-white text-emerald-800 shadow-xs border border-slate-200 font-bold" : "hover:text-slate-900"
            }`}
          >
            <Users className="w-4 h-4" /> Gestión de Roles
          </button>
          <button
            onClick={() => setActiveTab("invitations")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all whitespace-nowrap ${
              activeTab === "invitations" ? "bg-white text-emerald-800 shadow-xs border border-slate-200 font-bold" : "hover:text-slate-900"
            }`}
          >
            <UserPlus className="w-4 h-4" /> Invitaciones
          </button>
          <button
            onClick={() => setActiveTab("audit")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all whitespace-nowrap ${
              activeTab === "audit" ? "bg-white text-emerald-800 shadow-xs border border-slate-200 font-bold" : "hover:text-slate-900"
            }`}
          >
            <History className="w-4 h-4" /> Bitácora de Auditoría
          </button>
          <button
            onClick={() => setActiveTab("payments")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all whitespace-nowrap ${
              activeTab === "payments" ? "bg-white text-emerald-800 shadow-xs border border-slate-200 font-bold" : "hover:text-slate-900"
            }`}
          >
            <CreditCard className="w-4 h-4" /> Eventos de Pago
          </button>
        </div>

        {/* Tab 1: Tenants Overview */}
        {activeTab === "tenants" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-slate-200">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs font-medium">Tenants Activos</CardDescription>
                  <CardTitle className="text-2xl font-bold text-slate-900">3 Organizaciones</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-slate-500">Forestal Arauco, Salmonera Sur, Agrícola Maule</CardContent>
              </Card>

              <Card className="border-slate-200">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs font-medium">Hectáreas en Monitoreo</CardDescription>
                  <CardTitle className="text-2xl font-bold text-emerald-700">12,450 ha</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-slate-500">Procesadas mediante Copernicus CDSE</CardContent>
              </Card>

              <Card className="border-slate-200">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs font-medium">Consultas IA Agentes</CardDescription>
                  <CardTitle className="text-2xl font-bold text-cyan-700">142 ejecuciones</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-slate-500">Trazables por correlation_id</CardContent>
              </Card>
            </div>

            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="text-base font-bold text-slate-900">Estado de Clientes y Planes Activos</CardTitle>
                <CardDescription className="text-xs">Suscripciones y cuotas por tenant registrado</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                      <tr>
                        <th className="p-3">Organización Tenant</th>
                        <th className="p-3">Plan Activo</th>
                        <th className="p-3">Hectáreas Usadas</th>
                        <th className="p-3">Estado de Pago</th>
                        <th className="p-3">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="p-3 font-semibold text-slate-900">Agrícola Maule LTDA</td>
                        <td className="p-3"><Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300">Regional PyME</Badge></td>
                        <td className="p-3 text-slate-600">4,200 / 5,000 ha</td>
                        <td className="p-3"><Badge className="bg-emerald-600 text-white">Al Día</Badge></td>
                        <td className="p-3"><Button size="sm" variant="ghost" className="text-xs text-emerald-700">Ver Predios</Button></td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold text-slate-900">Forestal Arauco Sur</td>
                        <td className="p-3"><Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300">Región Completa</Badge></td>
                        <td className="p-3 text-slate-600">7,850 / 25,000 ha</td>
                        <td className="p-3"><Badge className="bg-emerald-600 text-white">Al Día</Badge></td>
                        <td className="p-3"><Button size="sm" variant="ghost" className="text-xs text-emerald-700">Ver Predios</Button></td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold text-slate-900">Cultivos Demo Staging</td>
                        <td className="p-3"><Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">Piloto</Badge></td>
                        <td className="p-3 text-slate-600">40 / 50 ha</td>
                        <td className="p-3"><Badge className="bg-slate-600 text-white">Demo Staging</Badge></td>
                        <td className="p-3"><Button size="sm" variant="ghost" className="text-xs text-emerald-700">Ver Predios</Button></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tab 2: Role Management */}
        {activeTab === "users" && (
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-base font-bold text-slate-900">Gestión de Roles y Permisos</CardTitle>
              <CardDescription className="text-xs">
                Asigna roles del catálogo unificado (`owner`, `admin`, `agronomo`, `agricultor`, `viewer`) respetando la jerarquía.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handleAssignRole} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4 max-w-xl">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ID del Usuario Objetivo (UUID)</label>
                  <Input
                    type="text"
                    required
                    value={targetUserId}
                    onChange={(e) => setTargetUserId(e.target.value)}
                    placeholder="ej: 11111111-2222-3333-4444-555555555555"
                    className="text-xs bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Rol a Asignar</label>
                  <select
                    value={assignedRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="viewer">Viewer (Sólo lectura)</option>
                    <option value="agricultor">Agricultor (Operativo)</option>
                    <option value="agronomo">Agrónomo (Análisis y Reportes)</option>
                    <option value="admin">Administrador de Tenant</option>
                  </select>
                </div>

                <Button type="submit" className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs px-5 py-2">
                  <KeyRound className="w-3.5 h-3.5 mr-1.5" /> Asignar Rol en Tenant
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Tab 3: Invitations */}
        {activeTab === "invitations" && (
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-base font-bold text-slate-900">Invitar Miembros al Tenant</CardTitle>
              <CardDescription className="text-xs">Genera un token seguro de invitación para unir usuarios a tu organización.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSendInvitation} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4 max-w-xl">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Correo Electrónico del Invitado</label>
                  <Input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="nuevo.agronomo@empresa.com"
                    className="text-xs bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Rol Asignado</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="agronomo">Agrónomo</option>
                    <option value="agricultor">Agricultor</option>
                    <option value="viewer">Viewer</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>

                <Button type="submit" className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs px-5 py-2">
                  <UserPlus className="w-3.5 h-3.5 mr-1.5" /> Enviar Invitación
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Tab 4: Audit Trail */}
        {activeTab === "audit" && (
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-base font-bold text-slate-900">Bitácora de Auditoría de Operaciones</CardTitle>
              <CardDescription className="text-xs">Registro de eventos, labores y consultas del ecosistema de agentes IA</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                    <tr>
                      <th className="p-3">Tipo de Evento</th>
                      <th className="p-3">Descripción</th>
                      <th className="p-3">Fecha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {bitacora.length > 0 ? (
                      bitacora.map((item) => (
                        <tr key={item.id}>
                          <td className="p-3 font-semibold text-slate-900">{item.tipo_labor}</td>
                          <td className="p-3 text-slate-600 font-mono text-[11px]">{item.descripcion}</td>
                          <td className="p-3 text-slate-500">{item.fecha_realizacion}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="p-6 text-center text-slate-400">
                          Sin eventos registrados en la bitácora aún.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tab 5: Payment Events */}
        {activeTab === "payments" && (
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-base font-bold text-slate-900">Registro de Eventos de Pago y Webhooks</CardTitle>
              <CardDescription className="text-xs">Historial de transacciones de Stripe/MercadoPago registradas para cobros</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                    <tr>
                      <th className="p-3">ID Evento</th>
                      <th className="p-3">Proveedor</th>
                      <th className="p-3">Tipo Evento</th>
                      <th className="p-3">Fecha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pagos.length > 0 ? (
                      pagos.map((pago) => (
                        <tr key={pago.id}>
                          <td className="p-3 font-mono font-semibold text-slate-900">{pago.event_id}</td>
                          <td className="p-3"><Badge variant="outline">{pago.proveedor}</Badge></td>
                          <td className="p-3 text-slate-600">{pago.tipo_evento}</td>
                          <td className="p-3 text-slate-500">{pago.creado_en}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="p-6 text-center text-slate-400">
                          Sin eventos de pago registrados aún.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
