import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Satellite, ArrowLeft, Construction } from "lucide-react";

export default function SatellitesPlaceholderPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-[#f7f7f2] flex flex-col justify-between p-4 sm:p-6">
      <div className="max-w-xl w-full mx-auto flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          onClick={() => setLocation("/")}
          className="text-slate-600 hover:text-emerald-950 text-sm gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> Volver al inicio
        </Button>
      </div>

      <div className="max-w-xl w-full mx-auto my-auto text-center bg-white p-8 rounded-2xl border border-slate-200 shadow-md">
        <div className="mx-auto mb-4 bg-emerald-100 text-emerald-800 p-4 rounded-full w-fit">
          <Satellite className="h-10 w-10" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Conoce los satélites</h1>
        <p className="text-slate-600 text-sm mb-6 leading-relaxed">
          La vista detallada con fichas interactivas de Sentinel-1, 2, 3, 4, 5P y 6 se implementará en la **Fase 2**.
        </p>

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold mb-6">
          <Construction className="h-4 w-4 text-amber-700" />
          Próxima fase disponible
        </div>

        <div>
          <Button
            onClick={() => setLocation("/auth")}
            className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-5 px-6 text-sm"
          >
            Ingresar a la Plataforma
          </Button>
        </div>
      </div>

      <footer className="text-center text-xs text-slate-500 py-4">
        Cleanleaf Satélites — Catálogo Copernicus CDSE
      </footer>
    </div>
  );
}
