import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import area from "@turf/area";
import "maplibre-gl/dist/maplibre-gl.css";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";

interface ParcelMapProps {
  initialCenter?: [number, number]; // [lng, lat]
  initialZoom?: number;
  onPolygonChange?: (geoJsonString: string, areaHa: number) => void;
  className?: string;
}

export default function ParcelMap({
  initialCenter = [-103.35, 20.65], // Jalisco, Mexico default
  initialZoom = 13,
  onPolygonChange,
  className = "h-[350px] w-full rounded-xl overflow-hidden border border-stone-200 shadow-inner",
}: ParcelMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const drawRef = useRef<MapboxDraw | null>(null);

  const [calculatedArea, setCalculatedArea] = useState<number>(0);
  const [hasPolygon, setHasPolygon] = useState<boolean>(false);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: "https://demotiles.maplibre.org/style.json",
      center: initialCenter,
      zoom: initialZoom,
    });

    mapRef.current = map;

    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        polygon: true,
        trash: true,
      },
      defaultMode: "draw_polygon",
    });

    drawRef.current = draw;
    map.addControl(draw as unknown as maplibregl.IControl, "top-left");

    const updateArea = () => {
      const data = draw.getAll();
      if (data.features.length > 0) {
        const feature = data.features[0]!;
        const areaInSqMeters = area(feature);
        const areaInHectares = Number((areaInSqMeters / 10000).toFixed(2));
        setCalculatedArea(areaInHectares);
        setHasPolygon(true);
        if (onPolygonChange) {
          onPolygonChange(JSON.stringify(feature), areaInHectares);
        }
      } else {
        setCalculatedArea(0);
        setHasPolygon(false);
        if (onPolygonChange) {
          onPolygonChange("", 0);
        }
      }
    };

    map.on("load", () => {
      map.on("draw.create" as any, updateArea);
      map.on("draw.delete" as any, updateArea);
      map.on("draw.update" as any, updateArea);
    });

    return () => {
      map.remove();
    };
  }, []);

  return (
    <div className="relative space-y-2">
      <div ref={mapContainerRef} className={className} />
      <div className="flex items-center justify-between rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-medium text-stone-700">
            {hasPolygon ? "Polígono delimitado" : "Haz clic en el ícono de polígono en el mapa para dibujar tu parcela"}
          </span>
        </div>
        <div className="font-semibold text-emerald-800">
          Superficie: <span className="text-sm font-bold text-emerald-900">{calculatedArea} ha</span>
        </div>
      </div>
    </div>
  );
}
