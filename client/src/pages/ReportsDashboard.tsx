import React from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ReportsDashboard() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Centro de Informes Satelitales</h1>
          <p className="text-gray-500 mt-1">Historial y estado de reportes e índices vegetales procesados.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Informes Recientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-4 border rounded-lg flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-800">Informe Vegetativo — Lote Maíz A1</h3>
                  <p className="text-xs text-gray-500">Fecha: 24 Sep 2026 • Fuente: Sentinel-2 • NDVI: 0.72 (Vigor Alto)</p>
                </div>
                <Button variant="outline" size="sm">
                  Ver Detalle
                </Button>
              </div>

              <div className="p-4 border rounded-lg flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-800">Informe Humedad Radar — Lote Maíz B1</h3>
                  <p className="text-xs text-gray-500">Fecha: 22 Sep 2026 • Fuente: Sentinel-1 • Sigma0 VV: -12.4 dB</p>
                </div>
                <Button variant="outline" size="sm">
                  Ver Detalle
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
