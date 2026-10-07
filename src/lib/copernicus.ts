import { getVariablesPorSatelite, satelliteCatalog, SatelliteId } from "../../shared/satellite-catalog";
import { SentinelMeasurement } from "../../shared/satellite-service";

export interface CopernicusCredentials {
  clientId?: string;
  clientSecret?: string;
}

export class CopernicusProvider {
  private clientId?: string;
  private clientSecret?: string;
  private token?: string;
  private tokenExpiresAt?: number;

  constructor(credentials?: CopernicusCredentials) {
    this.clientId = credentials?.clientId || process.env.COPERNICUS_CLIENT_ID;
    this.clientSecret = credentials?.clientSecret || process.env.COPERNICUS_CLIENT_SECRET;
  }

  async getAccessToken(): Promise<string | null> {
    if (!this.clientId || !this.clientSecret) {
      return null;
    }

    if (this.token && this.tokenExpiresAt && Date.now() < this.tokenExpiresAt) {
      return this.token;
    }

    try {
      const response = await fetch("https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: this.clientId,
          client_secret: this.clientSecret,
        }),
      });

      if (!response.ok) {
        return null;
      }

      const data = (await response.json()) as { access_token: string; expires_in: number };
      this.token = data.access_token;
      this.tokenExpiresAt = Date.now() + (data.expires_in - 30) * 1000;
      return this.token;
    } catch {
      return null;
    }
  }

  async query(predioId: string, satellite: SatelliteId, variable = "ndvi"): Promise<SentinelMeasurement> {
    const token = await this.getAccessToken();

    if (token) {
      try {
        const statsResponse = await fetch("https://sh.dataspace.copernicus.eu/api/v1/statistics", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            input: { bounds: { geometry: { type: "Polygon", coordinates: [] } }, data: [{ type: satellite }] },
            aggregation: { timeInterval: { from: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(), to: new Date().toISOString() }, width: 512, height: 512 },
          }),
        });

        if (statsResponse.ok) {
          const statsData = (await statsResponse.json()) as { data?: Array<{ outputs?: Record<string, { bands?: Record<string, { stats?: { mean?: number } }> }> }> };
          const calculatedValue = statsData.data?.[0]?.outputs?.default?.bands?.B01?.stats?.mean;
          if (typeof calculatedValue === "number") {
            const definition = getVariablesPorSatelite(satellite).find(item => item.variable === variable);
            return {
              satelite: satellite,
              variable,
              valor: Number(calculatedValue.toFixed(2)),
              unidad: definition?.unidad ?? "ratio",
              fecha_adquisicion: new Date(),
              data_source: "cdse_live",
            };
          }
        }
      } catch {
        // Fall back gracefully on request or parsing error
      }
    }

    const definition = getVariablesPorSatelite(satellite).find(item => item.variable === variable);
    if (!definition) {
      throw new Error(`${variable} no es una variable disponible en ${satelliteCatalog[satellite].nombre}`);
    }

    const seed = `${predioId}:${satellite}:${variable}`;
    const hash = Array.from(seed).reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) % 10000, 0);
    const normalized = hash / 10000;
    const [min, max] = definition.rango;
    const valor = Number((min + normalized * (max - min)).toFixed(2));

    return {
      satelite: satellite,
      variable,
      valor,
      unidad: definition.unidad,
      fecha_adquisicion: new Date(),
      data_source: "synthetic",
    };
  }
}

export const copernicusProvider = new CopernicusProvider();
