/**
 * Copernicus Data Space Ecosystem (CDSE) Catalogue API Client & Migration Helpers
 *
 * Implements upcoming and active CDSE Catalog API changes:
 * - STAC endpoint migration to https://stac.dataspace.copernicus.eu/v1/ (legacy /stac deprecated)
 * - OpenSearch decommissioning notice (migration target: STAC/OData)
 * - Mandatory lowercase `SubscriptionType` ("pull" | "push") for OData subscriptions
 * - ISO 8601 UTC DateTimeOffset formatting with `Z` suffix and 6-digit precision
 * - Maximum skip/pagination limit of 10,000 items guard
 * - EvictionDate fallback to "9999-12-31T23:59:59.999Z" for products with no eviction date
 * - Empty geometry normalization to `null`
 */

export const COPERNICUS_ENDPOINTS = {
  /** Updated canonical STAC v1 endpoint (effective 17 Nov 2025 deprecation of /stac) */
  STAC_V1: "https://stac.dataspace.copernicus.eu/v1/",
  /** Legacy STAC endpoint - deprecated */
  STAC_LEGACY_DEPRECATED: "https://catalogue.dataspace.copernicus.eu/stac",
  /** Canonical OData API v1 endpoint */
  ODATA_V1: "https://catalogue.dataspace.copernicus.eu/odata/v1/",
  /** Legacy OpenSearch endpoint - scheduled for decommissioning (2 March 2026) */
  OPENSEARCH_DEPRECATED: "https://catalogue.dataspace.copernicus.eu/resto/api",
} as const;

export const MAX_CATALOG_PAGINATION_SKIP = 10000;
export const DEFAULT_EVICTION_DATE = "9999-12-31T23:59:59.999Z";

export type SubscriptionType = "pull" | "push";

export type ODataSubscriptionPayload = {
  StageOrder: boolean;
  FilterParam: string;
  Priority: number;
  Status: string;
  SubscriptionEvent: string[];
  /** Mandatory SubscriptionType field in lowercase as required by CDSE OData API */
  SubscriptionType: SubscriptionType;
};

/**
 * Formats or normalizes a date string or Date object into ISO 8601 UTC with 'Z' suffix
 * and 6-digit microsecond precision (e.g. "2024-06-04T12:03:49.113620Z").
 */
export function formatCopernicusDateTime(input: Date | string | number): string {
  if (typeof input === "string") {
    // If input is an ISO string with timezone offset e.g. "2024-06-04T12:03:49.113620+00:00"
    const match = input.trim().match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d+))?(?:Z|[\+\-]\d{2}:?\d{2})?$/);
    if (match) {
      const [, dateTimePrefix, fractionalPart = "000000"] = match;
      const paddedMicroseconds = (fractionalPart + "000000").slice(0, 6);
      return `${dateTimePrefix}.${paddedMicroseconds}Z`;
    }
  }

  const date = input instanceof Date ? input : new Date(input);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date input for Copernicus API formatting: ${String(input)}`);
  }

  const iso = date.toISOString(); // e.g. "2024-06-04T12:03:49.113Z"
  const [datePart, timePartWithZ] = iso.split("T");
  const timePart = timePartWithZ.replace("Z", "");
  const [secondsPart, millisPart = "000"] = timePart.split(".");

  // Pad or trim milliseconds/microseconds to exactly 6 digits
  const paddedMicroseconds = (millisPart + "000000").slice(0, 6);

  return `${datePart}T${secondsPart}.${paddedMicroseconds}Z`;
}

/**
 * Enforces mandatory lowercase `SubscriptionType` field in OData Subscription requests.
 */
export function createODataSubscriptionPayload(input: {
  StageOrder?: boolean;
  FilterParam: string;
  Priority?: number;
  Status?: string;
  SubscriptionEvent?: string[];
  SubscriptionType: SubscriptionType;
}): ODataSubscriptionPayload {
  const subscriptionType = input.SubscriptionType.toLowerCase() as SubscriptionType;
  if (subscriptionType !== "pull" && subscriptionType !== "push") {
    throw new Error(`Invalid SubscriptionType: '${input.SubscriptionType}'. Must be 'pull' or 'push'.`);
  }

  return {
    StageOrder: input.StageOrder ?? true,
    FilterParam: input.FilterParam,
    Priority: input.Priority ?? 1,
    Status: input.Status ?? "running",
    SubscriptionEvent: input.SubscriptionEvent ?? ["created"],
    SubscriptionType: subscriptionType,
  };
}

/**
 * Validates pagination parameters to ensure skip / offset does not exceed the 10,000 item CDSE limit.
 */
export function validatePaginationLimit(skip: number, top = 20): {
  valid: boolean;
  exceeded: boolean;
  totalSkipped: number;
  warning?: string;
} {
  const totalSkipped = Math.max(0, skip);
  const totalAccessed = totalSkipped + Math.max(0, top);
  const exceeded = totalSkipped > MAX_CATALOG_PAGINATION_SKIP || totalAccessed > MAX_CATALOG_PAGINATION_SKIP + 1;

  if (exceeded) {
    return {
      valid: false,
      exceeded: true,
      totalSkipped,
      warning: `Pagination skip value (${totalSkipped}) exceeds maximum Copernicus Catalog API limit of ${MAX_CATALOG_PAGINATION_SKIP}. Pagination @odata.nextLink or next link will not be returned by CDSE server.`,
    };
  }

  return {
    valid: true,
    exceeded: false,
    totalSkipped,
  };
}

/**
 * Normalizes EvictionDate attribute values.
 * Empty strings, nulls or undefined are converted to the default far-future date "9999-12-31T23:59:59.999Z".
 */
export function normalizeEvictionDate(evictionDate?: string | null): string {
  if (!evictionDate || evictionDate.trim() === "") {
    return DEFAULT_EVICTION_DATE;
  }
  return evictionDate;
}

/**
 * Normalizes geometry attribute values.
 * Returns null if geometry is empty array `[]`, null or undefined.
 */
export function normalizeGeometry<T = unknown>(geometry?: T | null): T | null {
  if (!geometry) return null;
  if (Array.isArray(geometry) && geometry.length === 0) return null;
  return geometry;
}

/**
 * Builds a valid OData Products URL with encoded query parameters and pagination limits.
 */
export function buildODataProductsUrl(params: {
  filter?: string;
  skip?: number;
  top?: number;
  count?: boolean;
  expand?: string[];
}): { url: string; pagination: ReturnType<typeof validatePaginationLimit> } {
  const baseUrl = `${COPERNICUS_ENDPOINTS.ODATA_V1}Products`;
  const searchParams = new URLSearchParams();

  if (params.filter) {
    searchParams.set("$filter", params.filter);
  }

  const skip = params.skip ?? 0;
  const top = params.top ?? 20;
  const pagination = validatePaginationLimit(skip, top);

  searchParams.set("$skip", String(skip));
  searchParams.set("$top", String(top));

  if (params.count) {
    searchParams.set("$count", "True");
  }

  if (params.expand && params.expand.length > 0) {
    searchParams.set("$expand", params.expand.join(","));
  }

  const queryString = searchParams.toString();
  return {
    url: `${baseUrl}?${queryString}`,
    pagination,
  };
}

/**
 * Builds STAC v1 Search URL & payload conforming to https://stac.dataspace.copernicus.eu/v1/
 */
export function buildStacSearchUrl(params: {
  collections?: string[];
  bbox?: [number, number, number, number];
  datetime?: string;
  limit?: number;
  page?: number;
}): { url: string; pagination: ReturnType<typeof validatePaginationLimit> } {
  const baseUrl = `${COPERNICUS_ENDPOINTS.STAC_V1}search`;
  const limit = params.limit ?? 20;
  const page = params.page ?? 1;
  const skippedItems = (page - 1) * limit;

  const pagination = validatePaginationLimit(skippedItems, limit);
  const searchParams = new URLSearchParams();

  if (params.collections && params.collections.length > 0) {
    searchParams.set("collections", params.collections.join(","));
  }
  if (params.bbox) {
    searchParams.set("bbox", params.bbox.join(","));
  }
  if (params.datetime) {
    searchParams.set("datetime", params.datetime);
  }
  searchParams.set("limit", String(limit));
  searchParams.set("page", String(page));

  return {
    url: `${baseUrl}?${searchParams.toString()}`,
    pagination,
  };
}
