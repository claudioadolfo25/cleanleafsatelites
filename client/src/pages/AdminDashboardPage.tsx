import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building, ShieldAlert, History, RefreshCw, CheckCircle2, AlertTriangle, Users } from "lucide-react";
import { toast } from "sonner";

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState("tenants");

  // Admin tRPC queries
  const tenantsQuery = trpc.admin.listTenants.useQuery(undefined, { retry: false });
  const failedQuery = trpc.admin.listFailedSolicitudes.useQuery(undefined, { retry: false });
  const auditQuery = trpc.admin.getAuditLogs.useQuery(undefined, { retry: false });

  // Admin tRPC mutations
  const updatePlanMutation = trpc.admin.updatePlan.useMutation();
  const retryMutation = trpc.admin.retrySolicitud.useMutation();

  const handleUpdatePlan = async (tenantId: string, planId: "piloto" | "regional_pyme" | "region_completa") => {
    try {
      await updatePlanMutation.mutateAsync({ tenantId, planId });
      toast.success("Plan actualizado con éxito.");
      tenantsQuery.refetch();
    } catch (err: any) {
      toast.error("Error al actualizar plan: " + (err?.message || "Ocurrió un error."));
    }
  };

  const handleRetrySolicitud = async (solicitudId: string) => {
    try {
      await retryMutation.mutateAsync({ solicitudId });
      toast.success("Solicitud reintentada.");
      failedQuery.refetch();
    } catch (err: any) {
      toast.error("Error al reintentar: " + (err?.message || "Ocurrió un error."));
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6 pb-12">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Panel de Administración</h1>
          <p className="text-sm text-slate-600 mt-1">
            Gestión centralizada de organizaciones (tenants), solicitudes fallidas y bitácora de auditoría.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 w-full bg-slate-100">
            <TabsTrigger value="tenants" className="text-xs font-semibold gap-2">
              <Building className="h-4 w-4" /> Tenants ({tenantsQuery.data?.length ?? 0})
            </TabsTrigger>
            <TabsTrigger value="failed" className="text-xs font-semibold gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" /> Solicitudes Fallidas ({failedQuery.data?.length ?? 0})
            </TabsTrigger>
            <TabsTrigger value="audit" className="text-xs font-semibold gap-2">
              <History className="h-4 w-4 text-emerald-700" /> Audit Log ({auditQuery.data?.length ?? 0})
            </TabsTrigger>
          </TabsList>

          {/* Tab Tenants */}
          <TabsContent value="tenants" className="pt-4">
            <Card className="border border-slate-200 bg-white">
              <CardHeader>
                <CardTitle className="text-lg font-bold">Organizaciones Registradas</CardTitle>
                <CardDescription className="text-xs">Lista de organizaciones y planes asignados.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {tenantsQuery.isLoading ? (
                  <div className="h-32 animate-pulse bg-slate-100 rounded-xl" />
                ) : tenantsQuery.data?.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-6">No hay tenants registrados.</p>
                ) : (
                  tenantsQuery.data?.map((tenant) => (
                    <div key={tenant.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-xl gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm text-slate-900">{tenant.nombre}</p>
                          <Badge variant="outline" className="text-[10px] uppercase font-mono">{tenant.id}</Badge>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">Estado: <span className="font-medium text-slate-700 capitalize">{tenant.estado}</span></p>
                      </div>

                      <div className="flex items-center gap-3">
                        <Select
                          defaultValue={tenant.plan_id}
                          onValueChange={(val) => handleUpdatePlan(tenant.id, val as any)}
                        >
                          <SelectTrigger className="h-8 text-xs w-[180px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="piloto">Plan Piloto</SelectItem>
                            <SelectItem value="regional_pyme">Plan Regional PYME</SelectItem>
                            <SelectItem value="region_completa">Plan Región Completa</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Solicitudes Fallidas */}
          <TabsContent value="failed" className="pt-4">
            <Card className="border border-slate-200 bg-white">
              <CardHeader>
                <CardTitle className="text-lg font-bold">Solicitudes con Fallos o Pendientes de Revisión</CardTitle>
                <CardDescription className="text-xs">Revisa los motivos de rechazo y fuerza reintentos.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {failedQuery.isLoading ? (
                  <div className="h-32 animate-pulse bg-slate-100 rounded-xl" />
                ) : failedQuery.data?.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-6">No hay solicitudes fallidas registradas.</p>
                ) : (
                  failedQuery.data?.map((sol) => (
                    <div key={sol.id} className="p-4 border rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="destructive" className="text-[10px]">{sol.estado}</Badge>
                          <span className="font-mono text-xs text-slate-600">{sol.id}</span>
                        </div>
                        <Button size="sm" onClick={() => handleRetrySolicitud(sol.id!)} className="bg-emerald-700 hover:bg-emerald-800 text-xs h-8 gap-1.5">
                          <RefreshCw className="h-3.5 w-3.5" /> Reintentar
                        </Button>
                      </div>
                      <p className="text-xs text-slate-700"><strong>Motivo / Error:</strong> {sol.mensaje_error || "Sin mensaje de error reportado"}</p>
                      <p className="text-[11px] text-slate-400">Tenant: {sol.tenant_id} · Correlation ID: {sol.correlation_id}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Audit Log */}
          <TabsContent value="audit" className="pt-4">
            <Card className="border border-slate-200 bg-white">
              <CardHeader>
                <CardTitle className="text-lg font-bold">Bitácora de Auditoría (Audit Log)</CardTitle>
                <CardDescription className="text-xs">Registro inmutable de mutaciones sensibles ejecutadas en la plataforma.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {auditQuery.isLoading ? (
                  <div className="h-32 animate-pulse bg-slate-100 rounded-xl" />
                ) : auditQuery.data?.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-6">No hay registros de auditoría aún.</p>
                ) : (
                  auditQuery.data?.map((log) => (
                    <div key={log.id} className="p-3 border rounded-lg text-xs space-y-1 bg-slate-50">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-emerald-800">{log.action}</span>
                        <span className="text-[10px] text-slate-400">{log.created_at ? new Date(log.created_at).toLocaleString("es-CL") : "-"}</span>
                      </div>
                      <p className="text-slate-700"><strong>Usuario:</strong> {log.user_email || log.user_id || "Sistema"} · <strong>Tenant:</strong> {log.tenant_id}</p>
                      <p className="text-slate-500 font-mono text-[11px] truncate">{JSON.stringify(log.payload)}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
