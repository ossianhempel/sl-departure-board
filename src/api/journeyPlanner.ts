/**
 * SL Journey Planner v2 API
 * Handles trip planning and stop/place searching
 *
 * Base URL: https://journeyplanner.integration.sl.se/v2/
 */

import type { TripProposal, TripLeg, RawJourneyPlannerStop, ApiResult } from "../types";
import {
  apiCache,
  CACHE_TTL,
  tripsCacheKey,
  stopFinderCacheKey,
} from "./cache";

const BASE_URL = "https://journeyplanner.integration.sl.se/v2";

// =============================================================================
// Stop/Place Search
// =============================================================================

export interface StopFinderResult {
  id: string;
  label: string;
  coord: { lat: number; lon: number };
  /** "stop" for transit stops, "address" for street addresses */
  type: "stop" | "address";
}

export type TripEndpointLocation =
  | { kind: "id"; id: string }
  | { kind: "coord"; lat: number; lon: number };

/**
 * Format coordinate string for Journey Planner APIs.
 * The docs specify: "<lon>:<lat>:WGS84[dd.ddddd]"
 */
function formatCoordString(lat: number, lon: number): string {
  return `${lon}:${lat}:WGS84[dd.ddddd]`;
}

/**
 * Search for stops/places by name
 * @param query Search query (e.g., "Odenplan")
 * @returns List of matching stops
 */
export async function searchStops(
  query: string
): Promise<ApiResult<StopFinderResult[]>> {
  const cacheKey = stopFinderCacheKey(`stops:${query}`);
  const cached = apiCache.get<StopFinderResult[]>(cacheKey);

  if (cached) {
    return { success: true, data: cached.data, cachedAt: cached.cachedAt };
  }

  try {
    const url = new URL(`${BASE_URL}/stop-finder`);
    url.searchParams.set("name_sf", query);
    url.searchParams.set("type_sf", "any");
    // Filter to stops only (not addresses, POIs)
    url.searchParams.set("any_obj_filter_sf", "2");

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const stops = parseStopFinderResponse(data, "stop");

    apiCache.set(cacheKey, stops, CACHE_TTL.STOP_FINDER);

    return { success: true, data: stops, cachedAt: new Date() };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("[JourneyPlanner] Stop search failed:", errorMessage);

    // Try to return stale cache data
    const stale = apiCache.getStale<StopFinderResult[]>(cacheKey);
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
 * Search for addresses by name (street addresses for home location)
 * @param query Search query (e.g., "Karlbergsvägen 14 Stockholm")
 * @returns List of matching addresses
 */
export async function searchAddresses(
  query: string
): Promise<ApiResult<StopFinderResult[]>> {
  const cacheKey = stopFinderCacheKey(`addr:${query}`);
  const cached = apiCache.get<StopFinderResult[]>(cacheKey);

  if (cached) {
    return { success: true, data: cached.data, cachedAt: cached.cachedAt };
  }

  try {
    const url = new URL(`${BASE_URL}/stop-finder`);
    url.searchParams.set("name_sf", query);
    url.searchParams.set("type_sf", "any");
    // Filter to include addresses (0 = all, including addresses)
    url.searchParams.set("any_obj_filter_sf", "0");

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const addresses = parseStopFinderResponse(data, "address");

    apiCache.set(cacheKey, addresses, CACHE_TTL.STOP_FINDER);

    return { success: true, data: addresses, cachedAt: new Date() };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("[JourneyPlanner] Address search failed:", errorMessage);

    const stale = apiCache.getStale<StopFinderResult[]>(cacheKey);
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
 * Search for both stops AND addresses (combined search)
 * @param query Search query
 * @returns Combined list of stops and addresses
 */
export async function searchStopsAndAddresses(
  query: string
): Promise<ApiResult<StopFinderResult[]>> {
  // Run both searches in parallel
  const [stopsResult, addressResult] = await Promise.all([
    searchStops(query),
    searchAddresses(query),
  ]);

  const stops = stopsResult.success
    ? stopsResult.data
    : stopsResult.cachedData || [];
  const addresses = addressResult.success
    ? addressResult.data
    : addressResult.cachedData || [];

  // Combine results: stops first, then addresses (limit to 5 each)
  const combined = [
    ...stops.slice(0, 5),
    ...addresses
      .filter((a) => a.type === "address") // Only addresses, not stops
      .slice(0, 5),
  ];

  const success = stopsResult.success || addressResult.success;

  if (success) {
    return { success: true, data: combined, cachedAt: new Date() };
  }

  return {
    success: false,
    error: stopsResult.error || addressResult.error || "Search failed",
    cachedData: combined.length > 0 ? combined : undefined,
  };
}

/**
 * Search for stops/places by coordinates
 * @param lat Latitude
 * @param lon Longitude
 * @returns List of nearby stops
 */
export async function searchStopsByCoords(
  lat: number,
  lon: number
): Promise<ApiResult<StopFinderResult[]>> {
  const coordString = formatCoordString(lat, lon);
  const cacheKey = stopFinderCacheKey(coordString);
  const cached = apiCache.get<StopFinderResult[]>(cacheKey);

  if (cached) {
    return { success: true, data: cached.data, cachedAt: cached.cachedAt };
  }

  try {
    const url = new URL(`${BASE_URL}/stop-finder`);
    url.searchParams.set("name_sf", coordString);
    url.searchParams.set("type_sf", "coord");

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const stops = parseStopFinderResponse(data);

    apiCache.set(cacheKey, stops, CACHE_TTL.STOP_FINDER);

    return { success: true, data: stops, cachedAt: new Date() };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("[JourneyPlanner] Coord search failed:", errorMessage);

    return { success: false, error: errorMessage };
  }
}

/**
 * Parse stop-finder API response
 * @param data Raw API response
 * @param filterType If specified, only return results matching this type
 */
function parseStopFinderResponse(
  data: unknown,
  filterType?: "stop" | "address"
): StopFinderResult[] {
  // Current schema: { locations: [{ id, name, type, coord: [lat, lon], ...}] }
  const locations = (data as { locations?: RawJourneyPlannerStop[] })?.locations;
  if (Array.isArray(locations)) {
    return locations
      .filter((loc) => typeof loc.id === "string" && typeof loc.name === "string")
      .map((loc) => {
        // Map raw type to our simplified types
        const rawType = (loc.type || "").toLowerCase();
        const isAddress =
          rawType === "singlehouse" ||
          rawType === "address" ||
          rawType === "street" ||
          rawType === "poi";
        const mappedType: "stop" | "address" = isAddress ? "address" : "stop";

        return {
          id: loc.id,
          label: loc.name,
          coord: {
            lat: Array.isArray(loc.coord) ? Number(loc.coord[0]) : NaN,
            lon: Array.isArray(loc.coord) ? Number(loc.coord[1]) : NaN,
          },
          type: mappedType,
        };
      })
      .filter((loc) => Number.isFinite(loc.coord.lat) && Number.isFinite(loc.coord.lon))
      .filter((loc) => !filterType || loc.type === filterType);
  }

  // Legacy schema fallback: array of objects with { value, label, xCoord, yCoord, typeStr }
  const legacyLocations = (data as { locations?: Array<Record<string, unknown>> })?.locations;
  if (!Array.isArray(legacyLocations)) {
    return [];
  }

  return legacyLocations
    .map((loc) => {
      const value = typeof loc.value === "string" ? loc.value : null;
      const label = typeof loc.label === "string" ? loc.label : null;
      const xCoord = typeof loc.xCoord === "string" ? loc.xCoord : null;
      const yCoord = typeof loc.yCoord === "string" ? loc.yCoord : null;
      const typeStr = typeof loc.typeStr === "string" ? loc.typeStr.toLowerCase() : "stop";

      if (!value || !label || !xCoord || !yCoord) {
        return null;
      }

      // Coordinates are in WGS84 * 1,000,000
      const lat = parseFloat(yCoord) / 1000000;
      const lon = parseFloat(xCoord) / 1000000;

      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        return null;
      }

      // Map raw type to our simplified types
      const isAddress =
        typeStr === "singlehouse" ||
        typeStr === "address" ||
        typeStr === "street" ||
        typeStr === "poi";
      const mappedType: "stop" | "address" = isAddress ? "address" : "stop";

      return {
        id: value,
        label,
        coord: { lat, lon },
        type: mappedType,
      } satisfies StopFinderResult;
    })
    .filter((x): x is StopFinderResult => x !== null)
    .filter((loc) => !filterType || loc.type === filterType);
}

// =============================================================================
// Trip Planning
// =============================================================================

/**
 * Fetch trip proposals between two locations
 * @param origin Journey Planner ID or coordinate
 * @param destination Journey Planner ID or coordinate
 * @param numTrips Number of trips to request (1-6)
 * @returns List of trip proposals
 */
export async function fetchTrips(
  origin: TripEndpointLocation,
  destination: TripEndpointLocation,
  numTrips: number = 3
): Promise<ApiResult<TripProposal[]>> {
  // Validate inputs early to avoid noisy 400s
  const validateCoord = (lat: number, lon: number): string | null => {
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return "Invalid coordinates (lat/lon must be numbers)";
    }
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return "Invalid coordinates (lat/lon out of range)";
    }
    return null;
  };

  if (origin.kind === "id" && !origin.id.trim()) {
    return { success: false, error: "Invalid origin (missing Journey Planner ID)" };
  }
  if (destination.kind === "id" && !destination.id.trim()) {
    return { success: false, error: "Invalid destination (missing Journey Planner ID)" };
  }
  if (origin.kind === "coord") {
    const err = validateCoord(origin.lat, origin.lon);
    if (err) return { success: false, error: `Invalid origin: ${err}` };
  }
  if (destination.kind === "coord") {
    const err = validateCoord(destination.lat, destination.lon);
    if (err) return { success: false, error: `Invalid destination: ${err}` };
  }

  const originKey = origin.kind === "id" ? origin.id : formatCoordString(origin.lat, origin.lon);
  const destinationKey =
    destination.kind === "id"
      ? destination.id
      : formatCoordString(destination.lat, destination.lon);
  // SL Journey Planner v2 returns HTTP 400 for values above 3.
  const requestedTrips = Math.min(numTrips, 3);
  const cacheKey = tripsCacheKey(originKey, destinationKey, requestedTrips);
  const cached = apiCache.get<TripProposal[]>(cacheKey);

  if (cached) {
    return { success: true, data: cached.data, cachedAt: cached.cachedAt };
  }

  try {
    const url = new URL(`${BASE_URL}/trips`);
    if (origin.kind === "coord") {
      url.searchParams.set("type_origin", "coord");
      url.searchParams.set("name_origin", formatCoordString(origin.lat, origin.lon));
    } else {
      url.searchParams.set("type_origin", "any");
      url.searchParams.set("name_origin", origin.id);
    }

    if (destination.kind === "coord") {
      url.searchParams.set("type_destination", "coord");
      url.searchParams.set("name_destination", formatCoordString(destination.lat, destination.lon));
    } else {
      url.searchParams.set("type_destination", "any");
      url.searchParams.set("name_destination", destination.id);
    }
    url.searchParams.set("calc_number_of_trips", String(requestedTrips));

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const trips = parseTripsResponse(data);

    apiCache.set(cacheKey, trips, CACHE_TTL.TRIPS);

    return { success: true, data: trips, cachedAt: new Date() };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("[JourneyPlanner] Trip fetch failed:", errorMessage);

    // Try to return stale cache data
    const stale = apiCache.getStale<TripProposal[]>(cacheKey);
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
 * Parse trips API response
 */
function parseTripsResponse(data: unknown): TripProposal[] {
  // Current schema: { journeys: [{ tripDuration, legs: [...] }, ...] }
  const journeys = (data as { journeys?: Array<Record<string, unknown>> })?.journeys;
  if (!Array.isArray(journeys)) {
    return [];
  }

  return journeys
    .map((journey) => parseJourneyToTripProposal(journey))
    .filter((t): t is TripProposal => t !== null);
}

/**
 * Parse a Journey Planner v2 journey into our TripProposal
 */
function parseJourneyToTripProposal(journey: Record<string, unknown>): TripProposal | null {
  try {
    const rawLegs = journey.legs as unknown;
    if (!Array.isArray(rawLegs) || rawLegs.length === 0) {
      return null;
    }

    const legs: TripLeg[] = rawLegs
      .map((leg) => parseLegV2(leg as Record<string, unknown>))
      .filter((l): l is TripLeg => l !== null);

    if (legs.length === 0) {
      return null;
    }

    // Walk time before first public transport
    let walkToFirstLegSeconds = 0;
    let firstTransportIndex = legs.findIndex((leg) => leg.type !== "walk");
    if (firstTransportIndex === -1) {
      firstTransportIndex = 0;
    } else {
      for (let i = 0; i < firstTransportIndex; i++) {
        walkToFirstLegSeconds += legs[i].durationSeconds;
      }
    }

    const firstLeg = legs[0];
    const lastLeg = legs[legs.length - 1];
    const firstTransportLeg = legs[firstTransportIndex];

    const departureTime = firstLeg.departureTime;
    const arrivalTime = lastLeg.arrivalTime;

    // Prefer API duration if available, otherwise compute from timestamps
    const tripDurationSeconds =
      typeof journey.tripDuration === "number"
        ? journey.tripDuration
        : Math.max(0, Math.round((arrivalTime.getTime() - departureTime.getTime()) / 1000));
    const durationMinutes = Math.max(0, Math.round(tripDurationSeconds / 60));

    const routeSummary = buildRouteSummary(legs);

    return {
      departureTime,
      arrivalTime,
      durationMinutes,
      walkToFirstLegSeconds,
      legs,
      routeSummary,
      firstTransportDeparture: firstTransportLeg.departureTime,
    };
  } catch (error) {
    console.error("[JourneyPlanner] Failed to parse trip:", error);
    return null;
  }
}

/**
 * Parse a single leg from Journey Planner v2 journeys.legs schema
 */
function parseLegV2(rawLeg: Record<string, unknown>): TripLeg | null {
  const origin = rawLeg.origin as Record<string, unknown> | undefined;
  const destination = rawLeg.destination as Record<string, unknown> | undefined;
  const transportation = rawLeg.transportation as Record<string, unknown> | undefined;

  if (!origin || !destination || !transportation) {
    return null;
  }

  const depTimeStr =
    (origin.departureTimeEstimated as string | undefined) ||
    (origin.departureTimePlanned as string | undefined) ||
    (origin.departureTimeBaseTimetable as string | undefined);
  const arrTimeStr =
    (destination.arrivalTimeEstimated as string | undefined) ||
    (destination.arrivalTimePlanned as string | undefined) ||
    (destination.arrivalTimeBaseTimetable as string | undefined);

  if (!depTimeStr || !arrTimeStr) {
    return null;
  }

  const departureTime = new Date(depTimeStr);
  const arrivalTime = new Date(arrTimeStr);

  const durationSeconds =
    typeof rawLeg.duration === "number"
      ? rawLeg.duration
      : Math.max(0, Math.round((arrivalTime.getTime() - departureTime.getTime()) / 1000));

  const product = transportation.product as Record<string, unknown> | undefined;
  const productName = (product?.name as string | undefined) || "";
  const type = mapTransportTypeV2(productName);

  const line =
    (transportation.disassembledName as string | undefined) ||
    (transportation.number as string | undefined) ||
    (transportation.name as string | undefined) ||
    undefined;

  const destObj = transportation.destination as Record<string, unknown> | undefined;
  const direction = (destObj?.name as string | undefined) || undefined;

  const originName = (origin.name as string | undefined) || "Unknown";
  const destinationName = (destination.name as string | undefined) || "Unknown";

  const originProps = origin.properties as Record<string, unknown> | undefined;
  const platform =
    (originProps?.platformName as string | undefined) ||
    (originProps?.platform as string | undefined) ||
    undefined;

  return {
    type,
    line,
    direction,
    departureTime,
    arrivalTime,
    durationSeconds,
    originName,
    destinationName,
    platform,
  };
}

/**
 * Map Journey Planner v2 product name to our type
 */
function mapTransportTypeV2(productName: string): TripLeg["type"] {
  const upper = productName.toUpperCase();

  if (upper.includes("FOOTPATH") || upper.includes("FOOT") || upper.includes("WALK")) {
    return "walk";
  }
  if (upper.includes("TUNNELBANA") || upper.includes("METRO")) {
    return "metro";
  }
  if (upper.includes("PENDEL") || upper.includes("TÅG") || upper.includes("TRAIN")) {
    return "train";
  }
  if (upper.includes("SPÅRV") || upper.includes("TRAM")) {
    return "tram";
  }
  if (upper.includes("BÅT") || upper.includes("SHIP") || upper.includes("FERRY")) {
    return "ship";
  }
  if (upper.includes("BUS") || upper.includes("BUSS")) {
    return "bus";
  }

  // Default to bus for unknown types
  return "bus";
}

/**
 * Build a human-readable route summary
 */
function buildRouteSummary(legs: TripLeg[]): string {
  const transportLegs = legs.filter((leg) => leg.type !== "walk");

  if (transportLegs.length === 0) {
    return "Walk";
  }

  return transportLegs
    .map((leg) => {
      const icon = getTransportIcon(leg.type);
      return `${icon} ${leg.line || leg.type}`;
    })
    .join(" → ");
}

/**
 * Get transport type icon/emoji
 */
function getTransportIcon(type: TripLeg["type"]): string {
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
    case "walk":
      return "🚶";
    default:
      return "🚌";
  }
}
