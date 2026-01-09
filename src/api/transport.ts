/**
 * SL Transport API
 * Handles departure boards and site information
 *
 * Base URL: https://transport.integration.sl.se/v1/
 */

import type {
  Departure,
  RawTransportDeparture,
  RawTransportSite,
  ApiResult,
} from "../types";
import { apiCache, CACHE_TTL, departuresCacheKey } from "./cache";

const BASE_URL = "https://transport.integration.sl.se/v1";

// =============================================================================
// Sites / Stops
// =============================================================================

export interface TransportSite {
  id: string;
  name: string;
  coord?: { lat: number; lon: number };
  products: string[];
}

/**
 * Fetch all sites from the SL Transport API
 * This is a large response (~3000 sites) so we cache it aggressively
 * @returns List of all transport sites
 */
export async function fetchAllSites(): Promise<ApiResult<TransportSite[]>> {
  const cacheKey = "sites:all";
  const cached = apiCache.get<TransportSite[]>(cacheKey);

  if (cached) {
    return { success: true, data: cached.data, cachedAt: cached.cachedAt };
  }

  try {
    const url = new URL(`${BASE_URL}/sites`);
    url.searchParams.set("expand", "true");

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: RawTransportSite[] = await response.json();
    const sites = parseSitesResponse(data);

    apiCache.set(cacheKey, sites, CACHE_TTL.SITES);

    return { success: true, data: sites, cachedAt: new Date() };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("[Transport] Sites fetch failed:", errorMessage);

    // Try stale cache
    const stale = apiCache.getStale<TransportSite[]>(cacheKey);
    if (stale) {
      return {
        success: false,
        error: errorMessage,
        cachedData: stale.data,
        cachedAt: stale.cachedAt,
      };
    }

    return { success: false, error: errorMessage };
  }
}

/**
 * Search sites by name (uses cached data)
 * @param query Search query
 * @returns Matching sites
 */
export async function searchSites(query: string): Promise<TransportSite[]> {
  const result = await fetchAllSites();
  const sites = result.success ? result.data : result.cachedData || [];

  const normalizedQuery = query.toLowerCase().trim();

  return sites
    .filter((site) => site.name.toLowerCase().includes(normalizedQuery))
    .slice(0, 20); // Limit results
}

/**
 * Parse sites API response
 */
function parseSitesResponse(data: RawTransportSite[]): TransportSite[] {
  if (!Array.isArray(data)) {
    return [];
  }

  return data.map((site) => ({
    id: String(site.id),
    name: site.name,
    coord:
      site.lat && site.lon
        ? { lat: site.lat, lon: site.lon }
        : undefined,
    products: site.products || [],
  }));
}

// =============================================================================
// Departures
// =============================================================================

/**
 * Fetch departures for a specific site
 * @param siteId Site ID (e.g., "9192" for Slussen)
 * @returns List of upcoming departures
 */
export async function fetchDepartures(
  siteId: string
): Promise<ApiResult<Departure[]>> {
  const cacheKey = departuresCacheKey(siteId);
  const cached = apiCache.get<Departure[]>(cacheKey);

  if (cached) {
    return { success: true, data: cached.data, cachedAt: cached.cachedAt };
  }

  try {
    const url = new URL(`${BASE_URL}/sites/${siteId}/departures`);

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const departures = parseDeparturesResponse(data);

    apiCache.set(cacheKey, departures, CACHE_TTL.DEPARTURES);

    return { success: true, data: departures, cachedAt: new Date() };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("[Transport] Departures fetch failed:", errorMessage);

    // Try stale cache
    const stale = apiCache.getStale<Departure[]>(cacheKey);
    if (stale) {
      return {
        success: false,
        error: errorMessage,
        cachedData: stale.data,
        cachedAt: stale.cachedAt,
      };
    }

    return { success: false, error: errorMessage };
  }
}

/**
 * Parse departures API response
 */
function parseDeparturesResponse(data: unknown): Departure[] {
  // Response structure: { departures: [...] }
  const departuresData = (data as { departures?: RawTransportDeparture[] })
    ?.departures;

  if (!Array.isArray(departuresData)) {
    return [];
  }

  const now = new Date();

  return departuresData
    .map((dep) => parseDeparture(dep, now))
    .filter((d): d is Departure => d !== null)
    .sort((a, b) => a.expectedTime.getTime() - b.expectedTime.getTime())
    .slice(0, 30); // Limit to 30 departures
}

/**
 * Parse a single departure
 */
function parseDeparture(
  raw: RawTransportDeparture,
  now: Date
): Departure | null {
  try {
    const scheduledTime = new Date(raw.scheduled);
    const expectedTime = raw.expected ? new Date(raw.expected) : scheduledTime;

    // Calculate minutes until departure
    const minutesUntil = Math.round(
      (expectedTime.getTime() - now.getTime()) / 60000
    );

    // Skip departures that already left (more than 1 min ago)
    if (minutesUntil < -1) {
      return null;
    }

    const isDelayed =
      expectedTime.getTime() - scheduledTime.getTime() > 60000; // > 1 min delay

    const isCancelled =
      raw.state?.toUpperCase() === "CANCELLED" ||
      raw.state?.toUpperCase() === "REPLACED";

    return {
      type: mapTransportMode(raw.line.transport_mode),
      line: raw.line.designation,
      destination: raw.destination,
      scheduledTime,
      expectedTime,
      minutesUntil: Math.max(0, minutesUntil),
      isDelayed,
      platform: raw.stop_point?.designation,
      isCancelled,
    };
  } catch (error) {
    console.error("[Transport] Failed to parse departure:", error);
    return null;
  }
}

/**
 * Map transport mode string to our type
 */
function mapTransportMode(mode: string): Departure["type"] {
  const modeUpper = mode?.toUpperCase() || "";

  if (modeUpper === "METRO") {
    return "metro";
  }
  if (modeUpper === "TRAIN" || modeUpper === "COMMUTER_TRAIN") {
    return "train";
  }
  if (modeUpper === "TRAM") {
    return "tram";
  }
  if (modeUpper === "SHIP" || modeUpper === "FERRY") {
    return "ship";
  }
  // Default to bus
  return "bus";
}

/**
 * Get transport type icon/emoji
 */
export function getTransportIcon(type: Departure["type"]): string {
  switch (type) {
    case "metro":
      return "🚇";
    case "train":
      return "🚆";
    case "tram":
      return "🚊";
    case "bus":
      return "🚌";
    case "ship":
      return "⛴️";
    default:
      return "🚌";
  }
}

