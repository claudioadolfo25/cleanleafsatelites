import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Satellite, ShieldCheck, ArrowRight, Activity, Cloud, Eye, User, LogOut } from "lucide-react";

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <div className="min-h-screen bg-[#f7f7f2] text-slate-900 flex flex-col justify-between">
      {/* Header / Navbar */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-700 text-white p-2 rounded-lg flex items-center justify-center">
              <Satellite className="h-6 w-6" />
            </div>
            <div>
              <span className="font-bold text-xl text-emerald-950 tracking-tight">Cleanleaf</span>
              <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full ml-2 font-medium">
                Satélites
              </span>
            </div>
          </div>

          <nav className="flex items-center gap-3">
            <Link href="/satelites">
              <Button variant="ghost" className="text-slate-700 hover:text-emerald-800 font-medium text-sm">
                Conoce los satélites
              </Button>
            </Link>

            {user ? (
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setLocation("/dashboard")}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white gap-2 text-sm"
                >
                  <User className="h-4 w-4" /> Ir al Dashboard
                </Button>
                <Button
                  variant="outline"
                  onClick={handleLogout}
                  size="icon"
                  title="Cerrar sesión"
                  className="border-slate-300"
                >
                  <LogOut className="h-4 w-4 text-slate-600" />
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => setLocation("/auth")}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-sm"
              >
                Ingresar
              </Button>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100/80 border border-emerald-200 text-emerald-900 text-xs sm:text-sm font-semibold mb-6">
            <ShieldCheck className="h-4 w-4 text-emerald-700" />
            Motor Inteligente de Datos Copernicus CDSE
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-emerald-950 tracking-tight leading-tight mb-6">
            Inteligencia satelital exacta para tu territorio
          </h1>

          <p className="text-base sm:text-xl text-slate-700 max-w-3xl mx-auto mb-8 font-normal leading-relaxed">
            Cleanleaf conecta automáticamente con la constelación Copernicus (Sentinel-1, 2, 3) para analizar tus terrenos. Selección inteligente de satélite según nivel de nubosidad y objetivos de tu sector.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
            <Button
              size="lg"
              onClick={() => setLocation(user ? "/dashboard" : "/auth")}
              className="w-full sm:w-auto bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-base py-6 px-8 rounded-xl shadow-md transition-all gap-2"
            >
              {user ? "Acceder al Dashboard" : "Ingresar a la Plataforma"}
              <ArrowRight className="h-5 w-5" />
            </Button>

            <Link href="/satelites" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="w-full bg-white hover:bg-slate-50 border-slate-300 text-slate-800 font-semibold text-base py-6 px-6 rounded-xl"
              >
                Conoce los satélites
              </Button>
            </Link>
          </div>
        </section>

        {/* Value Proposition Cards */}
        <section className="py-12 bg-white border-y border-slate-200/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
                Solución adaptada a 4 sectores clave
              </h2>
              <p className="text-slate-600 text-sm sm:text-base mt-2">
                Agrícola, Forestal, Emergencias y Acuícola con flujo continuo bajo cualquier clima
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="border border-slate-200 bg-emerald-50/30">
                <CardContent className="p-6">
                  <div className="h-12 w-12 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center mb-4">
                    <Cloud className="h-6 w-6" />
                  </div>
                  <h3 className="font-bold text-lg text-slate-900 mb-2">
                    Fallback automático por nubes
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Si Sentinel-2 (óptico) queda bloqueado por nubes, el enrutador activa Sentinel-1 (radar) para garantizar continuidad en humedad y estado del suelo.
                  </p>
                </CardContent>
              </Card>

              <Card className="border border-slate-200 bg-emerald-50/30">
                <CardContent className="p-6">
                  <div className="h-12 w-12 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center mb-4">
                    <Eye className="h-6 w-6" />
                  </div>
                  <h3 className="font-bold text-lg text-slate-900 mb-2">
                    Datos reales de la ESA
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Consultas directas a Copernicus Data Space Ecosystem (CDSE). Transparencia total sobre procedencia, satélite, fecha de adquisición y nivel de confianza.
                  </p>
                </CardContent>
              </Card>

              <Card className="border border-slate-200 bg-emerald-50/30">
                <CardContent className="p-6">
                  <div className="h-12 w-12 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center mb-4">
                    <Activity className="h-6 w-6" />
                  </div>
                  <h3 className="font-bold text-lg text-slate-900 mb-2">
                    Aislamiento seguro multi-tenant
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Seguridad integrada con Supabase RLS. Cada usuario o empresa accede únicamente a sus predios, cotizaciones e informes autorizados.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-emerald-950 text-slate-300 py-8 border-t border-emerald-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Satellite className="h-5 w-5 text-emerald-400" />
            <span className="font-bold text-white text-base">Cleanleaf Satélites</span>
            <span className="text-xs text-slate-400">© {new Date().getFullYear()} — Chile</span>
          </div>
          <div className="text-xs text-slate-400">
            Motor satelital basado en Copernicus CDSE (ESA)
          </div>
        </div>
      </footer>
    </div>
  );
}
