export type WeatherForecastDay = {
  date: string;
  tempMax: number;
  tempMin: number;
  precipitationSum: number;
  relativeHumidity: number;
  et0Fao: number;
};

export type WeatherForecastResult = {
  latitude: number;
  longitude: number;
  days: WeatherForecastDay[];
  provenance: {
    data_source: "open_meteo_live" | "synthetic";
    badge_label: string;
    confidence: number;
  };
};

export async function fetchWeatherForecast(lat: number, lng: number): Promise<WeatherForecastResult> {
  const mockDays: WeatherForecastDay[] = Array.from({ length: 15 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return {
      date: d.toISOString().split("T")[0]!,
      tempMax: Number((18 + Math.sin(i) * 3).toFixed(1)),
      tempMin: Number((6 + Math.cos(i) * 2).toFixed(1)),
      precipitationSum: Number((i % 4 === 0 ? 3.5 : 0).toFixed(1)),
      relativeHumidity: Number((65 + Math.sin(i) * 10).toFixed(1)),
      et0Fao: Number((2.8 + Math.cos(i) * 0.5).toFixed(1)),
    };
  });

  return {
    latitude: lat,
    longitude: lng,
    days: mockDays,
    provenance: {
      data_source: "synthetic",
      badge_label: "SINTÉTICO / MOCK WEATHER (PRUEBAS SIN API OPEN-METEO)",
      confidence: 0.85,
    },
  };
}
