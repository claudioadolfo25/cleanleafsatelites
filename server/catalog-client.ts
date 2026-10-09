export type CatalogSearchRequest = {
  bbox?: [number, number, number, number];
  datetime?: string;
  collections: string[];
  limit?: number;
  next?: number;
  filter?: Record<string, unknown> | string;
  filterLang?: "cql2-json" | "cql2-text";
  fields?: { include?: string[]; exclude?: string[] };
  distinct?: string;
};

export type CatalogSearchResponse = {
  type: "FeatureCollection";
  features: Array<Record<string, unknown>>;
  context?: { next?: number; limit?: number; returned?: number };
  links?: Array<{ rel?: string; href?: string; [key: string]: unknown }>;
};

const DEFAULT_CATALOG_URL = "https://sh.dataspace.copernicus.eu/catalog/v1/search";
const MAX_LIMIT = 100;
const MAX_PAGE_OFFSET = 10_000;

export function buildCatalogSearchPayload(input: CatalogSearchRequest): CatalogSearchRequest {
  const limit = Math.min(Math.max(input.limit ?? 10, 1), MAX_LIMIT);
  const next = input.next === undefined ? undefined : Math.max(0, Math.min(input.next, MAX_PAGE_OFFSET));
  const payload: CatalogSearchRequest = { collections: input.collections, limit };
  if (input.bbox) payload.bbox = input.bbox;
  if (input.datetime) payload.datetime = input.datetime;
  if (next !== undefined) payload.next = next;
  if (input.filter !== undefined) payload.filter = input.filter;
  if (input.filterLang) payload.filterLang = input.filterLang;
  if (input.fields) payload.fields = input.fields;
  if (input.distinct) payload.distinct = input.distinct;
  return payload;
}

export function buildCatalogSearchUrl(baseUrl = DEFAULT_CATALOG_URL): string {
  return baseUrl;
}

export function createCatalogClient(options: {
  baseUrl?: string;
  getAccessToken?: () => Promise<string | undefined>;
  fetchImpl?: typeof fetch;
} = {}) {
  const baseUrl = options.baseUrl ?? process.env.COPERNICUS_CATALOG_URL ?? DEFAULT_CATALOG_URL;
  const fetchImpl = options.fetchImpl ?? fetch;
  return async function searchCatalog(input: CatalogSearchRequest, timeoutMs = 10_000): Promise<CatalogSearchResponse> {
    if (!input.collections?.length) throw new Error("Catalog search requires at least one collection");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const token = await options.getAccessToken?.();
      const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/geo+json, application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;
      const response = await fetchImpl(baseUrl, { method: "POST", headers, body: JSON.stringify(buildCatalogSearchPayload(input)), signal: controller.signal });
      if (!response.ok) throw new Error(`Copernicus Catalog API HTTP ${response.status}: ${await response.text()}`);
      return (await response.json()) as CatalogSearchResponse;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") throw new Error(`Copernicus Catalog API timeout after ${timeoutMs}ms`);
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  };
}
