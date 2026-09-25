import React, { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import VariableChart from "@/components/VariableChart";
import type { SatelliteId } from "@shared/satellite-catalog";

export default function ReportDetail() {
  const [selectedSatellite, setSelectedSatellite] = useState<SatelliteId>("sentinel-2");

  const sampleData = {
    "sentinel-2": [
      { fecha: "01 Sep", valor: 0.55 },
      { fecha: "08 Sep", valor: 0.62 },
      { fecha: "15 Sep", valor: 0.68 },
      { fecha: "22 Sep", valor: 0.72 },
    ]
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Detalle de Informe Satelital</h1>
          <p className="text-gray-500 mt-1">Análisis temporal y evolución de índice NDVI para Lote Maíz A1.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Evolución de NDVI (Vigor Vegetal)</CardTitle>
          </CardHeader>
          <CardContent>
            <VariableChart
              data={sampleData}
              selectedSatellite={selectedSatellite}
              onSatelliteChange={setSelectedSatellite}
            />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
