/**
 * React hook for fetching departure board data
 * Handles polling and caching for a specific site
 */

import { useState, useEffect, useCallback } from "react";
import type { Departure } from "../types";
import { fetchDepartures } from "../api";

// =============================================================================
// Types
// =============================================================================

export interface UseDeparturesResult {
  /** List of departures */
  departures: Departure[];
  /** Whether initial load is in progress */
  isLoading: boolean;
  /** Whether a refresh is in progress */
  isRefreshing: boolean;
  /** Last successful update time */
  lastUpdated: Date | null;
  /** Error message if any */
  error: string | null;
  /** Whether data is stale */
  isStale: boolean;
  /** Manually trigger a refresh */
  refresh: () => Promise<void>;
}

export interface UseDeparturesOptions {
  /** Refresh interval in seconds (default: 30) */
  refreshInterval?: number;
  /** Maximum number of departures to return (default: 10) */
  limit?: number;
  /** Filter by transport type */
  filterTypes?: Departure["type"][];
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook for fetching and managing departure data for a site
 *
 * @param siteId Site ID to fetch departures for (or null to disable)
 * @param options Configuration options
 */
export function useDepartures(
  siteId: string | null,
  options: UseDeparturesOptions = {}
): UseDeparturesResult {
  const { refreshInterval = 30, limit = 10, filterTypes } = options;

  const [departures, setDepartures] = useState<Departure[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);

  const refresh = useCallback(async () => {
    if (!siteId) {
      setDepartures([]);
      setIsLoading(false);
      return;
    }

    setIsRefreshing(true);
    setError(null);

    try {
      const result = await fetchDepartures(siteId);

      let deps: Departure[];
      let cachedAt: Date;

      if (result.success) {
        deps = result.data;
        cachedAt = result.cachedAt;
        setIsStale(false);
      } else if (result.cachedData) {
        deps = result.cachedData;
        cachedAt = result.cachedAt || new Date();
        setIsStale(true);
        setError(result.error);
      } else {
        deps = [];
        cachedAt = new Date();
        setError(result.error);
      }

      // Apply filters
      if (filterTypes && filterTypes.length > 0) {
        deps = deps.filter((d) => filterTypes.includes(d.type));
      }

      // Apply limit
      deps = deps.slice(0, limit);

      setDepartures(deps);
      setLastUpdated(cachedAt);
    } catch (err) {
      console.error("[useDepartures] Refresh failed:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [siteId, filterTypes, limit]);

  // Initial load and refresh when siteId changes
  useEffect(() => {
    setIsLoading(true);
    refresh();
  }, [refresh]);

  // Set up refresh interval
  useEffect(() => {
    if (!siteId || refreshInterval <= 0) return;

    const intervalId = setInterval(() => {
      refresh();
    }, refreshInterval * 1000);

    return () => clearInterval(intervalId);
  }, [refresh, siteId, refreshInterval]);

  return {
    departures,
    isLoading,
    isRefreshing,
    lastUpdated,
    error,
    isStale,
    refresh,
  };
}

// =============================================================================
// Grouped Departures Hook
// =============================================================================

export interface GroupedDepartures {
  type: Departure["type"];
  label: string;
  departures: Departure[];
}

/**
 * Group departures by transport type
 */
export function groupDeparturesByType(
  departures: Departure[]
): GroupedDepartures[] {
  const groups = new Map<Departure["type"], Departure[]>();

  for (const departure of departures) {
    const existing = groups.get(departure.type) || [];
    existing.push(departure);
    groups.set(departure.type, existing);
  }

  const typeLabels: Record<Departure["type"], string> = {
    metro: "Metro",
    bus: "Bus",
    train: "Train",
    tram: "Tram",
    ship: "Ferry",
  };

  const typeOrder: Departure["type"][] = [
    "metro",
    "train",
    "tram",
    "bus",
    "ship",
  ];

  return typeOrder
    .filter((type) => groups.has(type))
    .map((type) => ({
      type,
      label: typeLabels[type],
      departures: groups.get(type) || [],
    }));
}

