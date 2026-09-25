import DashboardLayout from "@/components/DashboardLayout";
import { SolicitudAnalisisForm } from "@/components/SolicitudAnalisisForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, AlertTriangle, Cpu, ArrowUpRight, ShieldCheck, Zap, BookOpen, HelpCircle } from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Welcome Banner */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 p-8 rounded-2xl text-white shadow-xl">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-emerald-300 border-emerald-500/50 bg-emerald-950">
                Plataforma de Monitoreo Satelital
              </Badge>
              <span className="text-xs text-emerald-200/80 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Multi-Tenant RLS Safe
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">AgroPulso — Panel Principal</h1>
            <p className="text-emerald-100/90 text-sm max-w-2xl">
              Monitoreo agrícola satelital en tiempo real impulsado por Sentinel Hub CDSE (Sentinel-1 y Sentinel-2).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link href="/dashboard/guias/interpretar-informes">
              <Button variant="outline" className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs">
                <BookOpen className="w-3.5 h-3.5 mr-1.5" /> Guía NDVI
              </Button>
            </Link>
            <Link href="/dashboard/soporte">
              <Button variant="outline" className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs">
                <HelpCircle className="w-3.5 h-3.5 mr-1.5" /> Soporte
              </Button>
            </Link>
          </div>
        </div>

        {/* Live Operational Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="hover:border-emerald-500/30 transition-all shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">Predios Activos</CardTitle>
              <MapPin className="h-4 w-4 text-emerald-700" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-slate-900">12</div>
              <p className="text-xs text-slate-500 mt-1">Superficie total monitoreada: 420 ha</p>
            </CardContent>
          </Card>

          <Card className="hover:border-emerald-500/30 transition-all shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">Alertas Agronómicas</CardTitle>
              <AlertTriangle className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-amber-600">2 Activas</div>
              <p className="text-xs text-slate-500 mt-1">Humedad baja detectada en Lote Maíz A1</p>
            </CardContent>
          </Card>

          <Card className="hover:border-emerald-500/30 transition-all shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">Consumo Mensual</CardTitle>
              <Cpu className="h-4 w-4 text-teal-700" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-slate-900">185 / 500 ha</div>
              <p className="text-xs text-emerald-700 font-medium mt-1">Plan Piloto (37% utilizado)</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Satellite Analysis Form Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8">
            <SolicitudAnalisisForm />
          </div>

          <div className="lg:col-span-4 space-y-6">
            <Card className="border-emerald-100 bg-emerald-50/40">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-emerald-950">
                  <Zap className="w-4 h-4 text-emerald-700" /> Accesos Rápidos
                </CardTitle>
                <CardDescription className="text-xs text-emerald-900/80">
                  Navegue directamente a las secciones clave de la plataforma.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/dashboard/informes">
                  <Button variant="outline" className="w-full justify-between bg-white hover:bg-emerald-100/50 border-emerald-200 text-emerald-950 text-xs font-medium">
                    <span>Ver Todos los Informes Satelitales</span>
                    <ArrowUpRight className="w-4 h-4 text-emerald-700" />
                  </Button>
                </Link>

                <Link href="/dashboard/configuracion/satelites">
                  <Button variant="outline" className="w-full justify-between bg-white hover:bg-emerald-100/50 border-emerald-200 text-emerald-950 text-xs font-medium">
                    <span>Configurar Catálogo por Vertical</span>
                    <ArrowUpRight className="w-4 h-4 text-emerald-700" />
                  </Button>
                </Link>

                <Link href="/dashboard/guias/interpretar-informes">
                  <Button variant="outline" className="w-full justify-between bg-white hover:bg-emerald-100/50 border-emerald-200 text-emerald-950 text-xs font-medium">
                    <span>Aprender a Interpretar NDVI / SCL</span>
                    <ArrowUpRight className="w-4 h-4 text-emerald-700" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
