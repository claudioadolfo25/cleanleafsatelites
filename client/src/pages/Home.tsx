import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  AlertCircle,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  CloudSun,
  Database,
  FileText,
  HelpCircle,
  Info,
  Layers,
  Leaf,
  MapPin,
  MapPinned,
  Menu,
  MoreHorizontal,
  Plus,
  Radar,
  RefreshCw,
  ScanLine,
  Settings,
  Sparkles,
  Sprout,
  TrendingUp,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import SolicitudAnalisisForm from "../components/SolicitudAnalisisForm";

const navigation = [
  { label: "Resumen", icon: Sparkles, href: "/dashboard" },
  { label: "Mis predios", icon: MapPinned, href: "/dashboard/predios" },
  { label: "Informes", icon: FileText, href: "/dashboard/informes" },
  { label: "Configuración", icon: Settings, href: "/dashboard/configuracion/satelites" },
];

const satelliteMeta = {
  "sentinel-2": {
    label: "Sentinel-2",
    description: "Vigor vegetativo · NDVI",
    unit: "NDVI",
    stroke: "#16803b",
    fill: "#22c55e",
    domain: [0.35, 0.85] as [number, number],
    icon: CloudSun,
  },
  "sentinel-1": {
    label: "Sentinel-1",
    description: "Humedad de suelo · Sigma0 VV",
    unit: "dB",
    stroke: "#176b87",
    fill: "#38bdf8",
    domain: [-22, -13] as [number, number],
    icon: Radar,
  },
};

function formatCurrentDate() {
  return new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "long", year: "numeric" }).format(new Date());
}

export default function Home() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { data, isLoading, isError, error, refetch } = trpc.cleanleaf.dashboard.useQuery();

  const [selectedSatellite, setSelectedSatellite] = useState<"sentinel-2" | "sentinel-1">("sentinel-2");
  const [selectedPredioId, setSelectedPredioId] = useState<string>("");
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [alertsModalOpen, setAlertsModalOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);

  const meta = satelliteMeta[selectedSatellite];
  const chartData = data?.measurements[selectedSatellite] ?? [];

  const selectedProperty = useMemo(() => {
    if (!data?.predios || data.predios.length === 0) return null;
    return data.predios.find(p => p.id === selectedPredioId) ?? data.predios[0] ?? null;
  }, [data?.predios, selectedPredioId]);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (isError || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#f7f7f2] p-6 text-center">
        <div className="mx-auto max-w-md rounded-3xl border border-stone-200 bg-white p-8 shadow-xl">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <AlertCircle size={28} />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-stone-800">No se pudieron cargar los datos</h2>
          <p className="mt-2 text-sm leading-6 text-stone-500">
            {error?.message || "Ocurrió un problema de conexión con el servidor satelital."}
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button onClick={() => refetch()} className="rounded-xl bg-emerald-700 font-medium hover:bg-emerald-800">
              <RefreshCw className="mr-2 h-4 w-4" /> Reintentar
            </Button>
            <Button variant="outline" onClick={() => setLocation("/auth")} className="rounded-xl border-stone-200">
              Ir a Iniciar Sesión
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const alertCount = data.alerts.length;
  const isLive = data.dataSource === "cdse_live";

  return (
    <div className="min-h-screen bg-[#f7f7f2] text-stone-800">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[244px] flex-col border-r border-[#e6e7dd] bg-[#fcfcf8] px-4 py-5 lg:flex">
        <Brand />
        <nav className="mt-10 space-y-1.5">
          {navigation.map((item, index) => {
            const Icon = item.icon;
            return (
              <a key={item.label} href={item.href} className={`group flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition ${index === 0 ? "bg-emerald-50 text-emerald-800" : "text-stone-500 hover:bg-stone-100 hover:text-stone-800"}`}>
                <Icon className={`h-[18px] w-[18px] ${index === 0 ? "text-emerald-700" : "text-stone-400 group-hover:text-stone-600"}`} strokeWidth={2} />
                {item.label}
              </a>
            );
          })}
        </nav>
        <div className="mt-auto rounded-2xl bg-[#e8f1dc] p-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-700 text-white"><Sprout size={16} /></div>
          <p className="mt-3 text-sm font-semibold text-stone-800">{data.tenant.plan}</p>
          <p className="mt-1 text-xs leading-5 text-stone-500">{data.tenant.usoHa} de {data.tenant.limiteHa} ha monitoreadas este mes</p>
          <Progress value={Math.min(100, (data.tenant.usoHa / data.tenant.limiteHa) * 100)} className="mt-3 h-1.5 bg-white [&>div]:bg-emerald-700" />
          <button onClick={() => setPlanModalOpen(true)} className="mt-3 text-xs font-semibold text-emerald-800 transition hover:text-emerald-950">Ver detalles del plan →</button>
        </div>
        <a href="/dashboard/configuracion/satelites" className="mt-5 flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium text-stone-500 transition hover:bg-stone-100 hover:text-stone-800"><Settings size={18} className="text-stone-400" />Configuración satelital</a>
      </aside>

      <main className="lg:pl-[244px]">
        <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-[#e6e7dd]/90 bg-[#f7f7f2]/90 px-4 backdrop-blur-xl sm:px-7 lg:px-10">
          <div className="flex items-center gap-3 lg:hidden">
            <button onClick={() => setMobileNav(!mobileNav)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-600" aria-label="Abrir navegación">
              {mobileNav ? <X size={19} /> : <Menu size={19} />}
            </button>
            <Brand compact />
          </div>
          <div className="hidden lg:block">
            <p className="text-xs font-medium text-stone-400">{formatCurrentDate()}</p>
            <p className="mt-0.5 text-sm font-semibold text-stone-700">{data.tenant.nombre}</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button onClick={() => setAlertsModalOpen(true)} className="relative flex h-10 w-10 items-center justify-center rounded-xl text-stone-500 transition hover:bg-white hover:text-stone-800" aria-label="Notificaciones">
              <Bell size={19} />
              {alertCount > 0 ? <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-[#f7f7f2] bg-amber-500" /> : null}
            </button>
            <div className="hidden items-center gap-2 rounded-xl border border-transparent px-2 py-1.5 transition hover:border-stone-200 hover:bg-white sm:flex">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ddc6a6] text-xs font-bold text-[#5e3e20]">
                {(user?.name || user?.email || "U").charAt(0).toUpperCase()}
              </span>
              <span className="pr-1 text-left">
                <span className="block text-xs font-semibold leading-4 text-stone-700">{user?.name || user?.email?.split("@")[0] || "Usuario"}</span>
                <span className="block text-[10px] leading-3 text-stone-400">{user?.role || "Agro"}</span>
              </span>
            </div>
            <Button onClick={() => setAnalysisOpen(true)} className="h-10 rounded-xl bg-emerald-700 px-3 text-xs font-semibold shadow-[0_10px_22px_-13px_rgba(4,120,87,0.85)] hover:bg-emerald-800 sm:px-4 sm:text-sm">
              <Plus className="mr-1.5 h-4 w-4" /> <span className="hidden sm:inline">Nuevo análisis</span><span className="sm:hidden">Análisis</span>
            </Button>
          </div>
        </header>

        {mobileNav ? <MobileNav onNavigate={() => setMobileNav(false)} /> : null}

        <div className="mx-auto max-w-[1520px] px-4 py-8 sm:px-7 lg:px-10 lg:py-10">
          <section id="resumen" className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <div className="mb-3 flex items-center gap-2">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-emerald-100 text-emerald-700"><Sparkles size={12} /></span>
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">Resumen de temporada</span>
              </div>
              <h1 className="font-serif text-[32px] leading-[1.07] tracking-[-0.035em] text-stone-800 sm:text-[42px]">Tu campo, visto con claridad.</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-500">
                Monitoreo espacial en tiempo real. Revisa el vigor vegetativo, humedad de suelo y métricas calculadas en servidor.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-semibold text-stone-700 shadow-sm">
              <Database size={15} className={isLive ? "text-emerald-600" : "text-amber-600"} />
              <span>{isLive ? "Datos satelitales reales (Copernicus CDSE)" : "Datos de demostración (Simulador Copernicus)"}</span>
            </div>
          </section>

          <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Vigor promedio ponderado" value={data.metrics.weightedNdviFormatted} hint="NDVI promedio por hectárea" tone="green" icon={<TrendingUp size={18} />} trend={data.metrics.deltaFormatted} />
            <MetricCard label="Predios monitoreados" value={String(data.metrics.totalPredios)} hint={`${data.metrics.totalHectareas} hectáreas en seguimiento`} tone="sand" icon={<MapPinned size={18} />} trend="Puntos WGS84" />
            <MetricCard label="Alertas abiertas" value={String(data.metrics.actionRequiredCount)} hint="Alertas pendientes de revisión" tone="amber" icon={<AlertTriangle size={18} />} trend={data.metrics.actionRequiredCount > 0 ? "Atención requerida" : "Sin novedades"} />
            <MetricCard label="Última lectura" value={data.metrics.lastMeasurementFormatted} hint="Sentinel-2 / Sentinel-1" tone="sky" icon={<CloudSun size={18} />} trend={isLive ? "En vivo" : "Simulado"} />
          </section>

          {data.predios.length === 0 ? (
            <section className="mt-8 rounded-2xl border border-dashed border-stone-300 bg-white p-10 text-center">
              <MapPin className="mx-auto h-12 w-12 text-stone-300" />
              <h3 className="mt-4 text-base font-bold text-stone-800">Agrega tu primer predio</h3>
              <p className="mt-2 text-xs leading-5 text-stone-500 max-w-md mx-auto">
                No tienes predios registrados en esta organización. Delinea sus polígonos GeoJSON WGS84 para calcular superficie y BBOX dinámico.
              </p>
              <div className="mt-5 flex justify-center gap-3">
                <Button onClick={() => setLocation("/dashboard/predios")} className="bg-emerald-700 hover:bg-emerald-800 text-xs font-semibold">
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Crear Predio
                </Button>
                <Button onClick={() => setAnalysisOpen(true)} variant="outline" className="text-xs font-semibold">
                  Solicitar análisis de prueba
                </Button>
              </div>
            </section>
          ) : (
            <section className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1.58fr)_minmax(330px,0.82fr)]">
              <div className="overflow-hidden rounded-[22px] border border-[#e5e6dc] bg-white shadow-[0_18px_45px_-38px_rgba(56,75,44,0.5)]">
                <div className="flex flex-col gap-4 border-b border-stone-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-400">Vista territorial de tus parcelas</p>
                    <h2 className="mt-1 text-lg font-semibold tracking-tight text-stone-800">Geometrías WGS84 Registradas</h2>
                  </div>
                  <button onClick={() => setLocation("/dashboard/predios")} className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900">
                    Gestionar predios <ArrowUpRight size={14} />
                  </button>
                </div>

                <div className="relative h-[300px] overflow-hidden bg-[#b8c494] sm:h-[330px]" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,.35) 1px, transparent 1px), linear-gradient(125deg, #b5c98e 0%, #98b274 38%, #bfd09f 38%, #bdcd95 100%)", backgroundSize: "11px 11px, 100% 100%" }}>
                  <div className="absolute inset-0 opacity-60" style={{ backgroundImage: "repeating-linear-gradient(23deg, transparent 0 26px, rgba(95,110,66,.17) 27px 28px)" }} />
                  <div className="absolute inset-0 p-6 flex flex-wrap gap-4 items-center justify-center">
                    {data.predios.map((predio) => (
                      <button
                        key={predio.id}
                        onClick={() => setSelectedPredioId(predio.id)}
                        className={`relative rounded-xl border-2 p-4 text-left transition ${
                          selectedProperty?.id === predio.id ? "border-emerald-800 bg-white shadow-lg ring-2 ring-emerald-500/20" : "border-white/80 bg-white/85 hover:bg-white"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <MapPin size={15} className="text-emerald-700 shrink-0" />
                          <span className="font-bold text-xs text-stone-800">{predio.nombre}</span>
                        </div>
                        <p className="mt-1 text-[11px] text-stone-500">{predio.comuna} · {predio.hectareas} ha</p>
                        <div className="mt-2 flex items-center justify-between gap-3 text-[10px] font-semibold">
                          <span className="text-stone-600">NDVI {predio.ndvi.toFixed(2).replace(".", ",")}</span>
                          <span className={predio.delta >= 0 ? "text-emerald-700" : "text-amber-700"}>{predio.delta >= 0 ? "+" : ""}{predio.delta}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid divide-y divide-stone-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                  {data.predios.map(predio => (
                    <button
                      key={predio.id}
                      onClick={() => setSelectedPredioId(predio.id)}
                      className={`p-4 text-left transition hover:bg-stone-50 ${selectedProperty?.id === predio.id ? "bg-emerald-50/45" : ""}`}
                    >
                      <p className="text-xs text-stone-400">{predio.comuna} · {predio.hectareas} ha</p>
                      <div className="mt-1.5 flex items-baseline justify-between">
                        <p className="text-sm font-semibold text-stone-800">{predio.nombre}</p>
                        <span className={`text-xs font-bold ${predio.delta >= 0 ? "text-emerald-700" : "text-amber-700"}`}>
                          {predio.delta >= 0 ? "+" : ""}{predio.delta.toFixed(2).replace(".", ",")}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <span className={`h-1.5 w-1.5 rounded-full ${predio.estado === "Óptimo" ? "bg-emerald-500" : "bg-amber-500"}`} />
                        <span className="text-xs font-medium text-stone-500">{predio.estado} · NDVI {predio.ndvi.toFixed(2).replace(".", ",")}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div id="analisis" className="rounded-[22px] border border-[#dce6d3] bg-[#f2f7ec] p-5 shadow-[0_18px_45px_-38px_rgba(56,75,44,0.5)] sm:p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white text-emerald-700 shadow-sm"><ScanLine size={16} /></span>
                    <h2 className="mt-4 text-lg font-semibold tracking-tight text-stone-800">Serie Temporal del Terreno</h2>
                    <p className="mt-1 text-sm leading-5 text-stone-500">
                      Evolución de mediciones satelitales en {selectedProperty?.nombre ?? "tu predio"}.
                    </p>
                  </div>
                  <button onClick={() => setHelpModalOpen(true)} className="text-stone-400 hover:text-stone-600" aria-label="Ayuda">
                    <CircleHelp size={18} />
                  </button>
                </div>

                <Tabs value={selectedSatellite} onValueChange={value => setSelectedSatellite(value as "sentinel-2" | "sentinel-1")} className="mt-5">
                  <TabsList className="h-10 w-full rounded-xl bg-[#e5efda] p-1">
                    {Object.entries(satelliteMeta).map(([id, detail]) => {
                      const Icon = detail.icon;
                      return (
                        <TabsTrigger key={id} value={id} className="h-8 flex-1 rounded-lg text-xs font-semibold text-stone-500 data-[state=active]:bg-white data-[state=active]:text-emerald-800 data-[state=active]:shadow-sm">
                          <Icon className="mr-1.5 h-3.5 w-3.5" />{detail.label}
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>
                </Tabs>

                <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-xs font-medium text-stone-400">{meta.description}</p>
                      <p className="mt-1 text-3xl font-semibold tracking-tight text-stone-800">
                        {chartData[chartData.length - 1]?.valor?.toFixed(2).replace(".", ",") ?? (selectedSatellite === "sentinel-2" ? "0,68" : "−16,8")}
                        <span className="ml-1 text-sm font-medium text-stone-400">{meta.unit}</span>
                      </p>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700">
                      {isLive ? "CDSE Live" : "Sintético"}
                    </span>
                  </div>

                  <div className="mt-3 h-[156px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 10, right: 2, left: -26, bottom: 0 }}>
                        <defs>
                          <linearGradient id={`fill-${selectedSatellite}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={meta.fill} stopOpacity={0.25} />
                            <stop offset="100%" stopColor={meta.fill} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} stroke="#edf0e9" />
                        <XAxis dataKey="fecha" tickLine={false} axisLine={false} tick={{ fill: "#a5a59d", fontSize: 10 }} interval="preserveStartEnd" />
                        <YAxis domain={meta.domain} tickLine={false} axisLine={false} tick={{ fill: "#a5a59d", fontSize: 10 }} tickFormatter={value => selectedSatellite === "sentinel-2" ? Number(value).toFixed(1).replace(".", ",") : value} />
                        <Tooltip cursor={{ stroke: "#d9e5d1", strokeWidth: 1 }} contentStyle={{ borderRadius: 12, border: "1px solid #e7ebe2", boxShadow: "0 8px 24px -12px rgba(45,64,33,.25)", fontSize: 12 }} formatter={(value: number) => [selectedSatellite === "sentinel-2" ? value.toFixed(2).replace(".", ",") : `${value.toFixed(1)} dB`, meta.unit]} />
                        <Area type="monotone" dataKey="valor" stroke={meta.stroke} strokeWidth={2.5} fill={`url(#fill-${selectedSatellite})`} dot={{ r: 2.8, fill: meta.stroke, strokeWidth: 0 }} activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="mt-4 flex gap-3 rounded-xl border border-[#dce6d3] bg-[#f6faef] p-3">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700"><Sparkles size={14} /></span>
                  <p className="text-xs leading-5 text-stone-600">
                    <strong className="font-semibold text-stone-700">Lectura de terreno:</strong> Serie derivada de la base de datos para {selectedProperty?.nombre}.
                  </p>
                </div>
              </div>
            </section>
          )}

          <section id="predios-section" className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(330px,0.95fr)]">
            <div className="rounded-[22px] border border-[#e5e6dc] bg-white p-5 shadow-[0_18px_45px_-38px_rgba(56,75,44,0.5)] sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-400">Atención en terreno</p>
                  <h2 className="mt-1 text-lg font-semibold tracking-tight text-stone-800">Alertas de Monitoreo</h2>
                </div>
                <button onClick={() => setAlertsModalOpen(true)} className="rounded-lg p-2 text-stone-400 transition hover:bg-stone-100 hover:text-stone-600">
                  <MoreHorizontal size={18} />
                </button>
              </div>

              {data.alerts.length === 0 ? (
                <div className="mt-6 py-6 text-center text-xs text-stone-400">
                  Sin alertas activas en tus predios. Todo se encuentra dentro de los umbrales normales.
                </div>
              ) : (
                <div className="mt-4 divide-y divide-stone-100">
                  {data.alerts.map(alert => (
                    <div key={alert.id} className="flex gap-3 py-4 first:pt-0 last:pb-0">
                      <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${alert.nivel === "atención" ? "bg-amber-50 text-amber-700" : "bg-sky-50 text-sky-700"}`}>
                        {alert.nivel === "atención" ? <AlertTriangle size={17} /> : <CloudSun size={17} />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-stone-800">{alert.titulo}</p>
                        <p className="mt-1 text-xs leading-5 text-stone-500">{alert.detalle}</p>
                      </div>
                      <button
                        onClick={() => toast.success(`${alert.accion}: ${alert.titulo}`)}
                        className="self-center whitespace-nowrap text-xs font-semibold text-emerald-700 hover:text-emerald-900"
                      >
                        {alert.accion}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div id="informes" className="relative overflow-hidden rounded-[22px] bg-[#173d32] p-6 text-white shadow-[0_18px_45px_-38px_rgba(23,61,50,0.75)]">
              <div className="absolute -right-10 -top-12 h-40 w-40 rounded-full bg-emerald-400/20 blur-2xl" />
              <div className="relative">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-emerald-200"><FileText size={17} /></span>
                <p className="mt-5 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-200">Informes Quincenales</p>
                <h2 className="mt-2 max-w-xs text-2xl font-semibold leading-tight tracking-tight">Lecturas claras para toma de decisiones.</h2>
                <p className="mt-3 max-w-sm text-sm leading-6 text-emerald-50/70">Revisa la lista de informes guardados en la base de datos de tu organización.</p>
                <Button onClick={() => setLocation("/dashboard/informes")} variant="outline" className="mt-6 h-10 rounded-xl border-white/20 bg-white/10 px-4 text-xs font-semibold text-white hover:bg-white/20 hover:text-white">
                  Preparar informe <ArrowDownRight className="ml-1.5 h-4 w-4" />
                </Button>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Modal: Detalles del Plan */}
      <Dialog open={planModalOpen} onOpenChange={setPlanModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sprout className="h-5 w-5 text-emerald-700" />
              Detalles de tu Plan
            </DialogTitle>
            <DialogDescription>
              Información de suscripción y límites de procesamiento activos para tu organización.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2 text-xs">
            <div className="flex justify-between border-b pb-2">
              <span className="text-stone-500">Plan Actual</span>
              <span className="font-bold text-stone-800">{data.tenant.plan}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-stone-500">Consumo Mensual</span>
              <span className="font-bold text-emerald-800">{data.tenant.usoHa} / {data.tenant.limiteHa} ha</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-stone-500">Soporte Regional (Tier 3)</span>
              <span className="font-medium text-stone-700">{data.tenant.limiteHa >= 1000 ? "Habilitado" : "Requiere evaluación"}</span>
            </div>
            <div className="rounded-xl bg-emerald-50 p-3 text-emerald-900">
              <p className="font-semibold">Cuota disponible</p>
              <p className="mt-1 text-stone-600">Te quedan {Math.max(0, data.tenant.limiteHa - data.tenant.usoHa)} ha disponibles este mes.</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Ayuda e Indicadores */}
      <Dialog open={helpModalOpen} onOpenChange={setHelpModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-emerald-700" />
              Glosario de Indicadores Satelitales
            </DialogTitle>
            <DialogDescription>
              Aprende cómo interpretar las métricas calculadas en la plataforma.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2 text-xs">
            <div className="rounded-xl border border-stone-200 p-3">
              <p className="font-bold text-stone-800">NDVI (Vigor Vegetativo)</p>
              <p className="mt-1 text-stone-600">Índice Óptico de Vigor (0 a 1). Mide la clorofila y actividad fotosintética. Valores &gt;0.6 indican vegetación densa y saludable.</p>
            </div>
            <div className="rounded-xl border border-stone-200 p-3">
              <p className="font-bold text-stone-800">Sigma0 VV (Humedad Radar Sentinel-1)</p>
              <p className="mt-1 text-stone-600">Retrodispersión radar en decibelios (dB). Atraviesa nubes y mide rugosidad y contenido de agua en los primeros centímetros del suelo.</p>
            </div>
            <div className="rounded-xl border border-stone-200 p-3">
              <p className="font-bold text-stone-800">Evapotranspiración FAO ($ET_0$)</p>
              <p className="mt-1 text-stone-600">Pérdida de agua por evaporación del suelo y transpiración del cultivo en mm/día.</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Alertas */}
      <Dialog open={alertsModalOpen} onOpenChange={setAlertsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-amber-600" />
              Alertas del Tenant
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            {data.alerts.length === 0 ? (
              <p className="py-4 text-center text-xs text-stone-500">Sin alertas pendientes para revisar.</p>
            ) : (
              data.alerts.map(a => (
                <div key={a.id} className="rounded-xl border border-stone-200 p-3 text-xs">
                  <p className="font-bold text-stone-800">{a.titulo}</p>
                  <p className="mt-1 text-stone-500">{a.detalle}</p>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Solicitar Análisis */}
      <Dialog open={analysisOpen} onOpenChange={setAnalysisOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto border-stone-200 bg-[#fcfcf8] p-0 sm:max-w-[620px]">
          <DialogHeader className="border-b border-stone-100 px-6 pb-5 pt-6">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700"><ScanLine size={19} /></div>
            <DialogTitle className="text-xl tracking-tight text-stone-800">Solicita un nuevo análisis</DialogTitle>
            <DialogDescription className="pt-1 text-sm leading-6 text-stone-500">
              Selecciona tu predio registrado y el rango de fechas para procesar el análisis satelital.
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 pb-6 pt-5"><SolicitudAnalisisForm onSuccess={() => setAnalysisOpen(false)} /></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return <div className="flex items-center gap-2.5"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-700 text-white shadow-[0_7px_16px_-10px_rgba(4,120,87,0.9)]"><Leaf size={19} fill="currentColor" strokeWidth={1.8} /></span>{!compact || <span className="font-serif text-xl font-semibold tracking-[-0.04em] text-stone-800">cleanleaf</span>} {!compact ? <span className="font-serif text-[23px] font-semibold tracking-[-0.045em] text-stone-800">cleanleaf</span> : null}</div>;
}

function MetricCard({ label, value, hint, tone, icon, trend }: { label: string; value: string; hint: string; tone: "green" | "sand" | "amber" | "sky"; icon: React.ReactNode; trend: string }) {
  const styles = { green: "bg-[#eef6e7] text-emerald-700", sand: "bg-[#f7f1e8] text-[#9a6c39]", amber: "bg-[#fff6e5] text-amber-700", sky: "bg-[#eef6f7] text-sky-700" }[tone];
  return <div className="rounded-2xl border border-[#e5e6dc] bg-white p-4.5 shadow-[0_16px_35px_-35px_rgba(56,75,44,0.45)]"><div className="flex items-start justify-between"><span className={`flex h-9 w-9 items-center justify-center rounded-xl ${styles}`}>{icon}</span><span className="text-[11px] font-semibold text-stone-400">{trend}</span></div><p className="mt-5 text-[13px] font-medium text-stone-500">{label}</p><p className="mt-1 text-2xl font-semibold tracking-[-0.035em] text-stone-800">{value}</p><p className="mt-1 text-[11px] leading-4 text-stone-400">{hint}</p></div>;
}

function MobileNav({ onNavigate }: { onNavigate: () => void }) {
  return <div className="absolute left-0 right-0 top-[72px] z-30 border-b border-[#e6e7dd] bg-[#fcfcf8] px-4 py-4 shadow-xl lg:hidden"><nav className="grid grid-cols-2 gap-2">{navigation.map(item => { const Icon = item.icon; return <a key={item.label} href={item.href} onClick={onNavigate} className="flex items-center gap-2 rounded-xl px-3 py-3 text-sm font-medium text-stone-600 hover:bg-emerald-50 hover:text-emerald-800"><Icon size={17} />{item.label}</a> })}</nav></div>;
}

function DashboardSkeleton() {
  return <div className="min-h-screen bg-[#f7f7f2] p-8"><div className="mx-auto max-w-6xl animate-pulse space-y-6"><div className="h-12 w-44 rounded-xl bg-stone-200" /><div className="h-24 max-w-xl rounded-2xl bg-stone-200" /><div className="grid gap-4 sm:grid-cols-4">{[1, 2, 3, 4].map(item => <div key={item} className="h-40 rounded-2xl bg-stone-200" />)}</div><div className="h-96 rounded-3xl bg-stone-200" /></div></div>;
}
