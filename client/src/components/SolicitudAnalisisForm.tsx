import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { getSatelitesHabilitados, type Vertical, type SatelliteId } from "@shared/satellite-catalog";
import { getTierForSuperficie, processingModeForTier } from "@shared/satellite-router";

export function SolicitudAnalisisForm() {
  const [vertical, setVertical] = useState<Vertical>("agricultura");
  const [superficieHa, setSuperficieHa] = useState<number>(25);
  const [satelites, setSatelites] = useState<SatelliteId[]>(["sentinel-2"]);
  const [submitted, setSubmitted] = useState<boolean>(false);

  const habilitados = getSatelitesHabilitados(vertical);
  const tier = getTierForSuperficie(superficieHa);
  const motor = processingModeForTier(tier);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Solicitud de Análisis Satelital</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Vertical de Monitoreo</Label>
            <Select value={vertical} onValueChange={(val: Vertical) => setVertical(val)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccione vertical" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="agricultura">Agricultura (Sentinel-2, Sentinel-1)</SelectItem>
                <SelectItem value="acuicultura">Acuicultura (Sentinel-3, Sentinel-2)</SelectItem>
                <SelectItem value="forestal">Forestal (Sentinel-2, Sentinel-1)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Superficie (Hectáreas)</Label>
            <Input
              type="number"
              min="0.5"
              step="0.5"
              value={superficieHa}
              onChange={(e) => setSuperficieHa(parseFloat(e.target.value) || 0.5)}
            />
            <p className="text-sm text-gray-500 mt-1">
              Tier asignado: <strong className="font-semibold">{tier}</strong> (Motor: {motor})
            </p>
          </div>

          <div>
            <Label>Fuentes Satelitales Habilitadas</Label>
            <div className="space-y-2 mt-2">
              {habilitados.map((satId) => (
                <div key={satId} className="flex items-center space-x-2">
                  <Checkbox
                    id={satId}
                    checked={satelites.includes(satId)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSatelites([...satelites, satId]);
                      } else {
                        setSatelites(satelites.filter((s) => s !== satId));
                      }
                    }}
                  />
                  <label htmlFor={satId} className="text-sm font-medium capitalize">
                    {satId}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <Button type="submit" className="w-full">
            Enviar Solicitud
          </Button>

          {submitted && (
            <div className="p-3 bg-green-50 text-green-700 rounded-md text-sm mt-4">
              Solicitud de análisis enviada con éxito (Modo REST /api/v1).
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
