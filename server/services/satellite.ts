export interface NDVIResult {
  date: string;
  mean: number;
  min: number;
  max: number;
  cloudCoverage: number;
  valid: boolean;
}

export interface NDEResult {
  date: string;
  mean: number;
  min: number;
  max: number;
  cloudCoverage: number;
  valid: boolean;
}

export interface MoistureResult {
  date: string;
  valueDb: number;
  trend: "seco" | "optimo" | "saturado";
}

export interface SatelliteService {
  getNDVI(parcelaGeoJSON: string, startDate: string, endDate: string): Promise<NDVIResult[]>;
  getNDRE(parcelaGeoJSON: string, startDate: string, endDate: string): Promise<NDEResult[]>;
  getSoilMoistureTrend(parcelaGeoJSON: string, days: number): Promise<MoistureResult[]>;
}

export class MockSatelliteService implements SatelliteService {
  async getNDVI(_parcelaGeoJSON: string, _startDate: string, _endDate: string): Promise<NDVIResult[]> {
    return [
      { date: "2024-08-15", mean: 0.72, min: 0.58, max: 0.85, cloudCoverage: 10, valid: true },
      { date: "2024-08-22", mean: 0.68, min: 0.52, max: 0.81, cloudCoverage: 15, valid: true },
      { date: "2024-08-29", mean: 0.59, min: 0.41, max: 0.76, cloudCoverage: 18, valid: true },
    ];
  }

  async getNDRE(_parcelaGeoJSON: string, _startDate: string, _endDate: string): Promise<NDEResult[]> {
    return [
      { date: "2024-08-15", mean: 0.52, min: 0.41, max: 0.61, cloudCoverage: 10, valid: true },
      { date: "2024-08-22", mean: 0.49, min: 0.38, max: 0.58, cloudCoverage: 15, valid: true },
      { date: "2024-08-29", mean: 0.44, min: 0.31, max: 0.52, cloudCoverage: 18, valid: true },
    ];
  }

  async getSoilMoistureTrend(_parcelaGeoJSON: string, _days: number): Promise<MoistureResult[]> {
    return [
      { date: "2024-08-15", valueDb: -14.2, trend: "optimo" },
      { date: "2024-08-22", valueDb: -16.8, trend: "seco" },
      { date: "2024-08-29", valueDb: -18.5, trend: "seco" },
    ];
  }
}

export function createSatelliteService(): SatelliteService {
  if (process.env.SATELLITE_PROVIDER === "sentinelhub") {
    // Return SentinelHubService implementation when credentials configured
  }
  return new MockSatelliteService();
}
