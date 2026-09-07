import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { SatelliteId } from "@shared/satellite-catalog";

export type VariableChartPoint = { fecha: string; valor: number };

type VariableChartProps = {
  data: Partial<Record<SatelliteId, VariableChartPoint[]>>;
  selectedSatellite: SatelliteId;
  onSatelliteChange: (satellite: SatelliteId) => void;
  availableSatellites?: SatelliteId[];
};

const settings = {
  "sentinel-1": { label: "Sentinel-1", variable: "Sigma0 VV", unit: "dB", stroke: "#176b87", fill: "#38bdf8", domain: [-22, -13] as [number, number] },
  "sentinel-2": { label: "Sentinel-2", variable: "NDVI", unit: "NDVI", stroke: "#16803b", fill: "#22c55e", domain: [0.35, 0.85] as [number, number] },
  "sentinel-3": { label: "Sentinel-3", variable: "SST", unit: "°C", stroke: "#9a5c1f", fill: "#f59e0b", domain: [0, 30] as [number, number] },
};

export default function VariableChart({ data, selectedSatellite, onSatelliteChange, availableSatellites = ["sentinel-2", "sentinel-1"] }: VariableChartProps) {
  const config = settings[selectedSatellite];
  const points = data[selectedSatellite] ?? [];
  return <div className="space-y-4"><Tabs value={selectedSatellite} onValueChange={value => onSatelliteChange(value as SatelliteId)}><TabsList className="h-10 rounded-xl bg-[#e5efda] p-1">{availableSatellites.map(satellite => <TabsTrigger key={satellite} value={satellite} className="h-8 rounded-lg px-3 text-xs font-semibold text-stone-500 data-[state=active]:bg-white data-[state=active]:text-emerald-800 data-[state=active]:shadow-sm">{settings[satellite].label}</TabsTrigger>)}</TabsList></Tabs><div className="h-[190px]"><ResponsiveContainer width="100%" height="100%"><AreaChart data={points} margin={{ top: 10, right: 2, left: -26, bottom: 0 }}><defs><linearGradient id={`variable-fill-${selectedSatellite}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={config.fill} stopOpacity={0.25} /><stop offset="100%" stopColor={config.fill} stopOpacity={0} /></linearGradient></defs><CartesianGrid vertical={false} stroke="#edf0e9" /><XAxis dataKey="fecha" tickLine={false} axisLine={false} tick={{ fill: "#a5a59d", fontSize: 10 }} /><YAxis domain={config.domain} tickLine={false} axisLine={false} tick={{ fill: "#a5a59d", fontSize: 10 }} /><Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e7ebe2", fontSize: 12 }} formatter={(value: number) => [`${value} ${config.unit}`, config.variable]} /><Area type="monotone" dataKey="valor" stroke={config.stroke} strokeWidth={2.5} fill={`url(#variable-fill-${selectedSatellite})`} /></AreaChart></ResponsiveContainer></div></div>;
}
