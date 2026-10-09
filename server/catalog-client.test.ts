import { describe, expect, it, vi } from "vitest";
import { buildCatalogSearchPayload, createCatalogClient } from "./catalog-client";

describe("Copernicus Catalog API", () => {
  it("normaliza límite y conserva paginación, filtro, fields y distinct", () => {
    expect(buildCatalogSearchPayload({
      collections: ["sentinel-1-grd"],
      limit: 500,
      next: 12000,
      filter: "eo:cloud_cover < 60",
      filterLang: "cql2-text",
      fields: { include: ["id", "properties.datetime"] },
      distinct: "properties.datetime",
    })).toEqual({
      collections: ["sentinel-1-grd"],
      limit: 100,
      next: 10000,
      filter: "eo:cloud_cover < 60",
      filterLang: "cql2-text",
      fields: { include: ["id", "properties.datetime"] },
      distinct: "properties.datetime",
    });
  });

  it("envía el contrato STAC al endpoint y adjunta bearer cuando existe", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ type: "FeatureCollection", features: [], context: { limit: 5, returned: 0 } }),
    });
    const search = createCatalogClient({
      baseUrl: "https://catalog.test/search",
      getAccessToken: async () => "test-token",
      fetchImpl,
    });
    const result = await search({
      bbox: [13, 45, 14, 46],
      datetime: "2019-12-10T00:00:00Z/2019-12-10T23:59:59Z",
      collections: ["sentinel-1-grd"],
      limit: 5,
    });
    expect(result.features).toEqual([]);
    expect(fetchImpl).toHaveBeenCalledWith("https://catalog.test/search", expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({ Authorization: "Bearer test-token" }),
      body: expect.stringContaining('"collections":["sentinel-1-grd"]'),
    }));
  });
});
