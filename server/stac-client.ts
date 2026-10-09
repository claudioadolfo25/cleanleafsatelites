export interface STACItemSearchRequest {
  collections: string[];
  bbox?: [number, number, number, number];
  datetime?: string; // ISO 8601 UTC format e.g. "2024-01-01T00:00:00Z/2024-02-01T00:00:00Z"
  limit?: number; // 1 to 100
  filter?: Record<string, unknown>; // CQL2 filter
  filterLang?: "cql2-json" | "cql2-text";
}

export interface STACItem {
  id: string;
  type: "Feature";
  geometry: Record<string, unknown> | null;
  bbox?: number[];
  properties: {
    datetime: string;
    platform?: string;
    instruments?: string[];
    constellation?: string;
    "eo:cloud_cover"?: number;
    [key: string]: unknown;
  };
  assets?: Record<string, unknown>;
  collection?: string;
}

export interface STACSearchResponse {
  type: "FeatureCollection";
  features: STACItem[];
  links?: Array<{ rel: string; href: string }>;
  context?: {
    next?: number;
    limit?: number;
    returned?: number;
  };
}

export function formatISOUtcDate(date: Date): string {
  // ISO 8601 UTC with 'Z' and 6 decimal places for seconds as required by CDSE 2025 specification
  const iso = date.toISOString(); // e.g. 2024-06-04T12:03:49.113Z
  return iso.replace(/\.(\d{3})Z$/, ".$1000Z");
}

export function buildSTACSender(
  stacBaseUrl = "https://stac.dataspace.copernicus.eu/v1"
) {
  return async function searchSTAC(
    request: STACItemSearchRequest,
    accessToken?: string,
    timeoutMs = 10000
  ): Promise<STACSearchResponse> {
    const limit = Math.min(request.limit ?? 10, 100);
    const bodyPayload = {
      collections: request.collections,
      bbox: request.bbox,
      datetime: request.datetime,
      limit,
      filter: request.filter,
      "filter-lang": request.filterLang ?? (request.filter ? "cql2-json" : undefined),
    };

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/geo+json, application/json",
    };

    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${stacBaseUrl}/search`, {
        method: "POST",
        headers,
        body: JSON.stringify(bodyPayload),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`STAC API search failed [${response.status}]: ${errorText}`);
      }

      const data = (await response.json()) as STACSearchResponse;
      // Guard pagination limit to max 10000 items as specified in CDSE Limits
      if (data.context && data.context.next && data.context.next > 10000) {
        data.links = data.links?.filter((link) => link.rel !== "next");
      }
      return data;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`STAC API search timed out after ${timeoutMs}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  };
}
