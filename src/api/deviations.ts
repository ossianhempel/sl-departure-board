/**
 * SL Deviations API
 * Handles service disruptions and deviation messages
 *
 * Base URL: https://deviations.integration.sl.se/v1/
 */

import type { Deviation, RawDeviation, ApiResult } from "../types";
import { apiCache, CACHE_TTL, deviationsCacheKey } from "./cache";

const BASE_URL = "https://deviations.integration.sl.se/v1";

// =============================================================================
// Deviations / Disruptions
// =============================================================================

export interface DeviationFilters {
  /** Site IDs to filter by */
  siteIds?: string[];
  /** Line designations to filter by */
  lines?: string[];
  /** Transport mode to filter by */
  transportMode?: string;
  /** Include future deviations */
  includeFuture?: boolean;
}

/**
 * Fetch deviations for specified filters
 * @param filters Optional filters to narrow results
 * @returns List of active deviations
 */
export async function fetchDeviations(
  filters: DeviationFilters = {}
): Promise<ApiResult<Deviation[]>> {
  const siteIds = filters.siteIds || [];
  const cacheKey = deviationsCacheKey(siteIds);
  const cached = apiCache.get<Deviation[]>(cacheKey);

  if (cached) {
    return { success: true, data: cached.data, cachedAt: cached.cachedAt };
  }

  try {
    const url = new URL(`${BASE_URL}/messages`);

    // Add site filters
    siteIds.forEach((siteId) => {
      url.searchParams.append("site", siteId);
    });

    // Add line filters
    filters.lines?.forEach((line) => {
      url.searchParams.append("line", line);
    });

    // Add transport mode filter
    if (filters.transportMode) {
      url.searchParams.set("transport_mode", filters.transportMode);
    }

    // Include future deviations if requested
    if (filters.includeFuture) {
      url.searchParams.set("future", "true");
    }

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: RawDeviation[] = await response.json();
    const deviations = parseDeviationsResponse(data);

    apiCache.set(cacheKey, deviations, CACHE_TTL.DEVIATIONS);

    return { success: true, data: deviations, cachedAt: new Date() };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("[Deviations] Fetch failed:", errorMessage);

    // Try stale cache
    const stale = apiCache.getStale<Deviation[]>(cacheKey);
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
 * Parse deviations API response
 */
function parseDeviationsResponse(data: RawDeviation[]): Deviation[] {
  if (!Array.isArray(data)) {
    return [];
  }

  const now = new Date();

  return data
    .map((raw) => parseDeviation(raw))
    .filter((d): d is Deviation => d !== null)
    // Filter out expired deviations
    .filter((d) => !d.validTo || d.validTo > now)
    // Sort by severity (high first)
    .sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
}

/**
 * Parse a single deviation
 */
function parseDeviation(raw: RawDeviation): Deviation | null {
  try {
    const lines =
      raw.scope?.lines?.map((line) => line.designation).filter(Boolean) || [];

    return {
      id: raw.id || String(Date.now()),
      lines,
      mode: raw.scope?.transport_mode,
      severity: mapPriorityToSeverity(raw.priority),
      header: raw.header || "Service disruption",
      message: raw.details || "",
      validFrom: new Date(raw.valid_from),
      validTo: raw.valid_to ? new Date(raw.valid_to) : undefined,
    };
  } catch (error) {
    console.error("[Deviations] Failed to parse deviation:", error);
    return null;
  }
}

/**
 * Map API priority number to severity level
 * Higher priority = more severe
 */
function mapPriorityToSeverity(priority: number): Deviation["severity"] {
  if (priority >= 7) {
    return "high";
  }
  if (priority >= 4) {
    return "medium";
  }
  return "low";
}

/**
 * Get severity display properties
 */
export function getSeverityDisplay(
  severity: Deviation["severity"]
): { label: string; icon: string } {
  switch (severity) {
    case "high":
      return { label: "Major disruption", icon: "⚠️" };
    case "medium":
      return { label: "Service affected", icon: "ℹ️" };
    case "low":
      return { label: "Minor issue", icon: "📢" };
    default:
      return { label: "Notice", icon: "📢" };
  }
}

