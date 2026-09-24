import React from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { SolicitudAnalisisForm } from "@/components/SolicitudAnalisisForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">AgroPulso — Panel Principal</h1>
          <p className="text-gray-500 mt-1">Monitoreo agrícola satelital multi-tenant en tiempo real.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-500">Predios Activos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12</div>
              <p className="text-xs text-gray-500 mt-1">Superficie total: 420 ha</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-500">Alertas Agronómicas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">2 Activas</div>
              <p className="text-xs text-gray-500 mt-1">Humedad baja en Lote Maíz A1</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-500">Consumo Mensual</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">185 / 500 ha</div>
              <p className="text-xs text-gray-500 mt-1">Plan Piloto (37% usado)</p>
            </CardContent>
          </Card>
        </div>

        <SolicitudAnalisisForm />
      </div>
    </DashboardLayout>
  );
}
