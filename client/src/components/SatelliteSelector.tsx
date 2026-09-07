import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { CloudSun, Radio, ThermometerSun } from "lucide-react";
import type { SatelliteDefinition, SatelliteId } from "@shared/satellite-catalog";

const satelliteIcons = {
  "sentinel-1": Radio,
  "sentinel-2": CloudSun,
  "sentinel-3": ThermometerSun,
};

type SatelliteSelectorProps = {
  satellites: SatelliteDefinition[];
  selected: SatelliteId[];
  onChange: (satellites: SatelliteId[]) => void;
  vertical: string;
};

export default function SatelliteSelector({
  satellites,
  selected,
  onChange,
  vertical,
}: SatelliteSelectorProps) {
  const toggle = (id: SatelliteId) => {
    const isRequired = vertical === "agricultura" && id === "sentinel-2";
    if (isRequired) return;
    onChange(selected.includes(id) ? selected.filter(item => item !== id) : [...selected, id]);
  };

  return (
    <div className="space-y-2.5">
      {satellites.map(satellite => {
        const Icon = satelliteIcons[satellite.id];
        const checked = selected.includes(satellite.id);
        const required = vertical === "agricultura" && satellite.id === "sentinel-2";

        return (
          <label
            key={satellite.id}
            className={cn(
              "group flex cursor-pointer gap-3 rounded-xl border p-3.5 transition-all duration-200",
              checked
                ? "border-emerald-500 bg-emerald-50/70 shadow-[0_8px_20px_-16px_rgba(5,150,105,0.65)]"
                : "border-stone-200 bg-white hover:border-emerald-200 hover:bg-stone-50",
            )}
          >
            <Checkbox
              checked={checked}
              onCheckedChange={() => toggle(satellite.id)}
              disabled={required}
              className="mt-0.5 border-stone-400 data-[state=checked]:border-emerald-600 data-[state=checked]:bg-emerald-600"
              aria-label={`Seleccionar ${satellite.nombre}`}
            />
            <span className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", checked ? "bg-emerald-600 text-white" : "bg-stone-100 text-stone-500")}>
              <Icon size={16} strokeWidth={2.2} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="text-sm font-semibold text-stone-800">{satellite.nombre}</span>
                <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-stone-500">
                  {satellite.etiqueta}
                </span>
                {required ? <span className="text-[10px] font-semibold text-emerald-700">Principal</span> : null}
              </span>
              <span className="mt-1 block text-xs leading-5 text-stone-500">{satellite.descripcion}</span>
              <span className="mt-1.5 block text-[11px] font-medium text-stone-400">{satellite.actualizacion}</span>
            </span>
          </label>
        );
      })}
    </div>
  );
}
