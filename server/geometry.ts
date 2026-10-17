import { z } from "zod";

export type Position = [number, number]; // [lng, lat]
export type LinearRing = Position[];
export type PolygonCoordinates = LinearRing[];
export type MultiPolygonCoordinates = PolygonCoordinates[];

export type GeoJSONPolygon = {
  type: "Polygon";
  coordinates: PolygonCoordinates;
};

export type GeoJSONMultiPolygon = {
  type: "MultiPolygon";
  coordinates: MultiPolygonCoordinates;
};

export type GeoJSONGeometry = GeoJSONPolygon | GeoJSONMultiPolygon;

const positionSchema = z.tuple([
  z.number().min(-180, "Longitud fuera de rango (-180 a 180)").max(180, "Longitud fuera de rango (-180 a 180)"),
  z.number().min(-90, "Latitud fuera de rango (-90 a 90)").max(90, "Latitud fuera de rango (-90 a 90)"),
]);

const linearRingSchema = z.array(positionSchema).min(4, "Un anillo debe tener al menos 4 puntos (incluyendo el de cierre)").refine(
  ring => {
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (!first || !last) return false;
    return first[0] === last[0] && first[1] === last[1];
  },
  { message: "El anillo del polígono debe ser cerrado (primer y último punto idénticos)" }
);

export const polygonSchema = z.object({
  type: z.literal("Polygon"),
  coordinates: z.array(linearRingSchema).min(1, "El polígono debe tener al menos un anillo exterior"),
});

export const multiPolygonSchema = z.object({
  type: z.literal("MultiPolygon"),
  coordinates: z.array(z.array(linearRingSchema).min(1)).min(1, "El MultiPolígono debe tener al menos un polígono"),
});

export const geoJSONGeometrySchema = z.discriminatedUnion("type", [polygonSchema, multiPolygonSchema]).refine(
  geom => {
    let totalVertices = 0;
    if (geom.type === "Polygon") {
      geom.coordinates.forEach(ring => { totalVertices += ring.length; });
    } else {
      geom.coordinates.forEach(poly => poly.forEach(ring => { totalVertices += ring.length; }));
    }
    return totalVertices <= 1000;
  },
  { message: "La geometría supera el máximo permitido de 1,000 vértices" }
);

const EARTH_RADIUS_M = 6378137; // Radio de la Tierra en metros (WGS84)

function ringAreaM2(ring: LinearRing): number {
  if (ring.length < 4) return 0;
  let totalRad = 0;
  const numPoints = ring.length;

  for (let i = 0; i < numPoints - 1; i++) {
    const p1 = ring[i];
    const p2 = ring[i + 1];
    if (!p1 || !p2) continue;

    const p1LngRad = (p1[0] * Math.PI) / 180;
    const p1LatRad = (p1[1] * Math.PI) / 180;
    const p2LngRad = (p2[0] * Math.PI) / 180;
    const p2LatRad = (p2[1] * Math.PI) / 180;

    totalRad += (p2LngRad - p1LngRad) * (2 + Math.sin(p1LatRad) + Math.sin(p2LatRad));
  }

  return Math.abs((totalRad * EARTH_RADIUS_M * EARTH_RADIUS_M) / 2);
}

export function computePolygonAreaHa(geometry: GeoJSONGeometry): number {
  let totalAreaM2 = 0;

  if (geometry.type === "Polygon") {
    const outerRing = geometry.coordinates[0];
    if (outerRing) totalAreaM2 += ringAreaM2(outerRing);
    for (let i = 1; i < geometry.coordinates.length; i++) {
      const holeRing = geometry.coordinates[i];
      if (holeRing) totalAreaM2 -= ringAreaM2(holeRing);
    }
  } else if (geometry.type === "MultiPolygon") {
    geometry.coordinates.forEach(poly => {
      const outerRing = poly[0];
      if (outerRing) totalAreaM2 += ringAreaM2(outerRing);
      for (let i = 1; i < poly.length; i++) {
        const holeRing = poly[i];
        if (holeRing) totalAreaM2 -= ringAreaM2(holeRing);
      }
    });
  }

  const ha = Math.abs(totalAreaM2) / 10000;
  return Math.max(0.5, Number(ha.toFixed(2)));
}

export function computeBBox(geometry: GeoJSONGeometry): [number, number, number, number] {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;

  const processRing = (ring: LinearRing) => {
    ring.forEach(([lng, lat]) => {
      if (lng < minLng) minLng = lng;
      if (lat < minLat) minLat = lat;
      if (lng > maxLng) maxLng = lng;
      if (lat > maxLat) maxLat = lat;
    });
  };

  if (geometry.type === "Polygon") {
    geometry.coordinates.forEach(processRing);
  } else if (geometry.type === "MultiPolygon") {
    geometry.coordinates.forEach(poly => poly.forEach(processRing));
  }

  if (!isFinite(minLng) || !isFinite(minLat) || !isFinite(maxLng) || !isFinite(maxLat)) {
    throw new Error("No se pudieron extraer coordenadas válidas de la geometría para calcular el BBOX");
  }

  return [
    Number(minLng.toFixed(6)),
    Number(minLat.toFixed(6)),
    Number(maxLng.toFixed(6)),
    Number(maxLat.toFixed(6)),
  ];
}
