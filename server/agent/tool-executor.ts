import { createSatelliteService } from "../services/satellite";
import { createWeatherService } from "../services/weather";
import { calcularConfianza, type ConfidenceInput } from "../services/confidence";

export async function executeTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case "consultar_indices_satelitales": {
      const satelliteService = createSatelliteService();
      const parcelaId = String(args.parcela_id || "parcela-1");
      const days = Number(args.dias || 30);
      const endDate = new Date().toISOString().split("T")[0]!;
      const startDateDate = new Date();
      startDateDate.setDate(startDateDate.getDate() - days);
      const startDate = startDateDate.toISOString().split("T")[0]!;
      return await satelliteService.getNDVI(parcelaId, startDate, endDate);
    }

    case "consultar_clima": {
      const weatherService = createWeatherService();
      const lat = Number(args.lat || 20.6597);
      const lon = Number(args.lon || -103.3496);
      const days = Number(args.dias || 15);
      return await weatherService.getRecentWeather(lat, lon, days);
    }

    case "calcular_confianza": {
      const input: ConfidenceInput = {
        validObservations: Number(args.validObservations || 0),
        cloudCoverageAvg: Number(args.cloudCoverageAvg || 0),
        daysSinceLastObservation: Number(args.daysSinceLastObservation || 0),
        trendConsistency: (args.trendConsistency as ConfidenceInput["trendConsistency"]) || "consistente",
      };
      return calcularConfianza(input);
    }

    case "consultar_parcela": {
      return {
        id: args.parcela_id,
        nombre: "Lote 3 Norte - Maíz",
        area_ha: 45.5,
        poligono: "POLYGON((-103.3 20.6, -103.3 20.7, -103.2 20.7, -103.2 20.6, -103.3 20.6))",
      };
    }

    case "consultar_labores": {
      return [
        { id: "lab-1", tipo: "Siembra", fecha: "2024-05-10", descripcion: "Siembra de maíz híbrido a 75,000 pl/ha" },
        { id: "lab-2", tipo: "Fertilización", fecha: "2024-06-15", descripcion: "Primera aplicación de nitrógeno en V4" },
      ];
    }

    case "consultar_analisis_suelo": {
      return {
        ph: 5.8,
        n_kg_ha: 22.4,
        p_kg_ha: 12.1,
        k_kg_ha: 180.5,
        materia_organica_pct: 1.2,
      };
    }

    case "registrar_accion": {
      return {
        success: true,
        alerta_id: args.alerta_id,
        accion: args.accion,
        mensaje: "Acción de aprendizaje registrada correctamente",
      };
    }

    default:
      throw new Error(`Herramienta no reconocida: ${name}`);
  }
}
