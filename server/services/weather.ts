export interface WeatherResult {
  date: string;
  tempMax: number;
  tempMin: number;
  precipitationMm: number;
}

export interface WeatherService {
  getRecentWeather(lat: number, lon: number, days: number): Promise<WeatherResult[]>;
}

export class MockWeatherService implements WeatherService {
  async getRecentWeather(_lat: number, _lon: number, days: number): Promise<WeatherResult[]> {
    const results: WeatherResult[] = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      results.push({
        date: d.toISOString().split("T")[0]!,
        tempMax: 26 + (i % 3),
        tempMin: 14 + (i % 2),
        precipitationMm: i % 4 === 0 ? 12.5 : 0,
      });
    }
    return results;
  }
}

export function createWeatherService(): WeatherService {
  if (process.env.WEATHER_PROVIDER === "openweather") {
    // Return OpenWeatherService implementation when credentials configured
  }
  return new MockWeatherService();
}
