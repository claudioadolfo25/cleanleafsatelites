import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Satellite, ShieldCheck, ArrowRight, Radio, CloudSun, ThermometerSun, Zap, Globe, Sparkles } from "lucide-react";

interface SatelliteOrbit {
  id: string;
  name: string;
  type: string;
  color: string;
  beamColor: string;
  orbitRadius: number; // percentage
  speed: number;
  initialAngle: number;
  description: string;
}

const SATELLITE_CONSTELLATION: SatelliteOrbit[] = [
  { id: "s1", name: "Sentinel-1", type: "Radar C-SAR", color: "#38bdf8", beamColor: "rgba(56, 189, 248, 0.4)", orbitRadius: 36, speed: 20, initialAngle: 0, description: "Escaneo radar 10m en tierra e hielo" },
  { id: "s2", name: "Sentinel-2", type: "Multiespectral MSI", color: "#34d399", beamColor: "rgba(52, 211, 153, 0.4)", orbitRadius: 40, speed: 25, initialAngle: 45, description: "Monitoreo óptico de cultivos y clorofila" },
  { id: "s3", name: "Sentinel-3", type: "OLCI / SLSTR", color: "#f59e0b", beamColor: "rgba(245, 158, 11, 0.4)", orbitRadius: 44, speed: 30, initialAngle: 90, description: "Temperatura marina y color de agua" },
  { id: "s5p", name: "Sentinel-5P", type: "TROPOMI", color: "#a855f7", beamColor: "rgba(168, 85, 247, 0.4)", orbitRadius: 48, speed: 22, initialAngle: 135, description: "Calidad de aire y atmósfera" },
  { id: "s6", name: "Sentinel-6", type: "Poseidon Altimetry", color: "#2563eb", beamColor: "rgba(37, 99, 235, 0.4)", orbitRadius: 52, speed: 28, initialAngle: 180, description: "Altimetría de precisión oceánica" },
  { id: "smos", name: "SMOS", type: "Soil Moisture MIRAS", color: "#14b8a6", beamColor: "rgba(20, 184, 166, 0.4)", orbitRadius: 56, speed: 32, initialAngle: 225, description: "Humedad de suelo y salinidad" },
  { id: "landsat", name: "Landsat-9", type: "OLI-2 / TIRS-2", color: "#ef4444", beamColor: "rgba(239, 68, 68, 0.4)", orbitRadius: 60, speed: 26, initialAngle: 270, description: "Térmico infrarrojo terrestre" },
  { id: "envisat", name: "Copernicus Global", type: "Multispectral Synergy", color: "#eab308", beamColor: "rgba(234, 179, 8, 0.4)", orbitRadius: 64, speed: 35, initialAngle: 315, description: "Monitoreo global de vegetación" },
];

export default function Landing3DPage() {
  const [ticks, setTicks] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTicks((t) => t + 1);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen w-full bg-slate-950 text-white flex flex-col justify-between relative overflow-hidden font-sans">
      {/* Dynamic Starfield Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black pointer-events-none" />

      {/* Top Navbar Header */}
      <header className="relative z-20 flex items-center justify-between p-6 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-800 to-teal-900 text-white shadow-lg shadow-emerald-900/30">
            <Satellite className="h-5.5 w-5.5 animate-pulse" />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-white tracking-tight text-lg">AgroPulso SaaS</span>
            <span className="text-[11px] font-medium text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-500" /> Constelación Copernicus 8 Satélites
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 h-10 shadow-lg shadow-emerald-900/20">
              Ingresar a la Plataforma
            </Button>
          </Link>
        </div>
      </header>

      {/* Central 3D Earth Orbit Visualizer */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-4 my-4">
        {/* 3D Earth Globe Canvas Container */}
        <div className="relative w-[340px] h-[340px] sm:w-[460px] sm:h-[460px] md:w-[540px] md:h-[540px] flex items-center justify-center">

          {/* Earth Atmosphere Outer Glow */}
          <div className="absolute w-[220px] h-[220px] sm:w-[280px] sm:h-[280px] md:w-[320px] md:h-[320px] rounded-full bg-gradient-to-tr from-blue-600/30 via-emerald-500/20 to-teal-400/40 blur-2xl animate-pulse pointer-events-none" />

          {/* 3D Textured Earth Globe */}
          <div className="relative w-[180px] h-[180px] sm:w-[240px] sm:h-[240px] md:w-[280px] md:h-[280px] rounded-full bg-gradient-to-br from-blue-900 via-teal-900 to-emerald-950 border-2 border-cyan-500/40 shadow-[0_0_80px_rgba(16,185,129,0.3)] flex items-center justify-center overflow-hidden group">
            {/* Earth Continents Render Simulation */}
            <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px] opacity-30 animate-[spin_60s_linear_infinite]" />
            <div className="absolute w-full h-full bg-gradient-to-t from-slate-950 via-transparent to-cyan-500/20 pointer-events-none" />

            {/* Glowing Central Enter Action Button */}
            <Link href="/login" className="relative z-20">
              <Button className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs sm:text-sm px-6 py-6 rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.6)] border border-emerald-300/40 transform hover:scale-105 transition-all flex flex-col items-center gap-1 group">
                <span className="tracking-wider uppercase font-black text-white flex items-center gap-2">
                  ENTRAR A LA PLATAFORMA <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
                <span className="text-[10px] text-emerald-200 font-normal">8 Satélites Escaneando en Tiempo Real</span>
              </Button>
            </Link>
          </div>

          {/* 8 Orbiting Satellites with Color-Coded Scanning Laser Beams */}
          {SATELLITE_CONSTELLATION.map((sat, index) => {
            const angle = (sat.initialAngle + ticks * (sat.speed / 10)) * (Math.PI / 180);
            const radius = sat.orbitRadius * 2.6; // scale to container
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * (radius * 0.45); // isometric tilt

            return (
              <div
                key={sat.id}
                className="absolute flex items-center justify-center pointer-events-none transition-transform"
                style={{
                  transform: `translate(${x}px, ${y}px)`,
                }}
              >
                {/* Scanning Laser Cone towards Earth Center */}
                <div
                  className="absolute w-0.5 origin-bottom pointer-events-none opacity-80"
                  style={{
                    height: `${radius * 0.85}px`,
                    backgroundColor: sat.color,
                    boxShadow: `0 0 12px ${sat.color}`,
                    transform: `rotate(${Math.atan2(-y, -x) * (180 / Math.PI) - 90}deg)`,
                  }}
                />

                {/* Satellite Node Indicator */}
                <div
                  className="relative z-20 h-5 w-5 sm:h-6 sm:w-6 rounded-full flex items-center justify-center text-slate-950 font-bold text-[9px] shadow-lg border border-white/60 pointer-events-auto cursor-pointer hover:scale-125 transition-transform"
                  style={{ backgroundColor: sat.color }}
                  title={`${sat.name} (${sat.type}): ${sat.description}`}
                >
                  <Satellite className="w-3 h-3 text-slate-950" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Hero Title & Live Status */}
        <div className="text-center max-w-2xl mt-6 space-y-3">
          <Badge variant="outline" className="text-emerald-400 border-emerald-500/40 bg-emerald-950/60 font-mono text-xs px-3 py-1">
            Sistema de Observación Terrestre, Marina y Atmosférica 3D
          </Badge>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
            Monitoreo Satelital Multiespectral & Radar
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm leading-relaxed max-w-xl mx-auto">
            La constelación Copernicus (Sentinel-1, Sentinel-2, Sentinel-3) y satélites globales escanean continuamente la superficie en múltiples espectros de onda.
          </p>
        </div>
      </main>

      {/* Constellation Mission Cards Footer */}
      <footer className="relative z-20 border-t border-slate-800/80 bg-slate-950/90 backdrop-blur-xl p-6">
        <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {SATELLITE_CONSTELLATION.map((sat) => (
            <div
              key={sat.id}
              className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-900 transition-colors space-y-1 text-left"
            >
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: sat.color }} />
                <span className="font-bold text-xs text-white truncate">{sat.name}</span>
              </div>
              <p className="text-[10px] text-slate-400 truncate">{sat.type}</p>
            </div>
          ))}
        </div>
      </footer>
    </div>
  );
}
