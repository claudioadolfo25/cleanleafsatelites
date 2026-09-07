import { describe, expect, it } from "vitest";
import { CopernicusProvider } from "../src/lib/copernicus";

describe("Copernicus CDSE Provider Integration", () => {
  it("maneja la ausencia de credenciales devolviendo null en token y usando fallback seguro", async () => {
    const provider = new CopernicusProvider({});
    const token = await provider.getAccessToken();
    expect(token).toBeNull();

    const measurement = await provider.query("las-quinas", "sentinel-2", "ndvi");
    expect(measurement.satelite).toBe("sentinel-2");
    expect(measurement.variable).toBe("ndvi");
    expect(measurement.unidad).toBe("ratio");
    expect(measurement.valor).toBeGreaterThanOrEqual(0);
    expect(measurement.valor).toBeLessThanOrEqual(1);
  });

  it("garantiza que el NDVI de Sentinel-2 devuelva valores strictly en el rango [0, 1]", async () => {
    const provider = new CopernicusProvider();
    const predios = ["predio-a", "predio-b", "predio-c", "las-quinas", "el-aromo"];

    for (const predioId of predios) {
      const measurement = await provider.query(predioId, "sentinel-2", "ndvi");
      expect(measurement.valor).toBeGreaterThanOrEqual(0);
      expect(measurement.valor).toBeLessThanOrEqual(1);
    }
  });

  it("devuelve valores válidos para Sentinel-1 sigma0_vv", async () => {
    const provider = new CopernicusProvider();
    const measurement = await provider.query("las-quinas", "sentinel-1", "sigma0_vv");
    expect(measurement.satelite).toBe("sentinel-1");
    expect(measurement.variable).toBe("sigma0_vv");
    expect(measurement.unidad).toBe("dB");
    expect(measurement.valor).toBeLessThan(0);
  });
});
