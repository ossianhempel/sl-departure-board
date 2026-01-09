/**
 * React hook for fetching and managing commute data
 * Handles trip fetching, leave calculations, and polling
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import type { Commute, Place, TripProposal, CommuteDashboardData, Deviation } from "../types";
import { fetchTrips, fetchDeviations } from "../api";
import { calculateAllLeaveStatuses } from "../lib/leaveNow";
import type { TripEndpointLocation } from "../api/journeyPlanner";

// =============================================================================
// Types
// =============================================================================

export interface UseCommutesResult {
  /** Dashboard data for all commutes */
  data: CommuteDashboardData[];
  /** Whether initial load is in progress */
  isLoading: boolean;
  /** Whether a refresh is in progress */
  isRefreshing: boolean;
  /** Last successful update time */
  lastUpdated: Date | null;
  /** Global error message */
  error: string | null;
  /** Manually trigger a refresh */
  refresh: () => Promise<void>;
  /** Recalculate leave times without fetching new data */
  recalculate: () => void;
}

export interface UseCommutesOptions {
  /** Refresh interval in seconds (default: 120) */
  refreshInterval?: number;
  /** UI tick interval in seconds for recalculating leave times (default: 10) */
  tickInterval?: number;
  /** Whether to fetch deviations (default: true) */
  fetchDeviationsData?: boolean;
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook for managing commute dashboard data
 *
 * @param commutes List of commutes to track
 * @param places List of all places (for lookup)
 * @param options Configuration options
 */
export function useCommutes(
  commutes: Commute[],
  places: Place[],
  options: UseCommutesOptions = {}
): UseCommutesResult {
  const {
    refreshInterval = 120,
    tickInterval = 10,
    fetchDeviationsData = true,
  } = options;

  const [data, setData] = useState<CommuteDashboardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Store trip data separately for recalculation
  const tripDataRef = useRef<
    Map<string, { trips: TripProposal[]; cachedAt: Date }>
  >(new Map());

  // Create a lookup map for places
  const placesMap = useMemo(() => new Map(places.map((p) => [p.id, p])), [places]);

  const unknownPlace: Place = useMemo(
    () => ({
      id: "unknown",
      label: "Unknown",
      coord: { lat: 0, lon: 0 },
      prepSeconds: 0,
    }),
    []
  );

  /**
   * Convert a Place into the correct Journey Planner location representation.
   * If `journeyPlannerLocationId` is present, we use it; otherwise we use coordinates.
   */
  const placeToTripLocation = (place: Place): TripEndpointLocation => {
    const id = place.journeyPlannerLocationId?.trim();
    if (id) {
      return { kind: "id", id };
    }
    return { kind: "coord", lat: place.coord.lat, lon: place.coord.lon };
  };

  // ==========================================================================
  // Fetch Data
  // ==========================================================================

  const fetchCommuteData = useCallback(
    async (
      commute: Commute,
      deviations: Deviation[]
    ): Promise<CommuteDashboardData> => {
      const origin = placesMap.get(commute.originPlaceId);
      const destination = placesMap.get(commute.destinationPlaceId);

      if (!origin || !destination) {
        return {
          commute,
          origin: origin || unknownPlace,
          destination: destination || unknownPlace,
          trips: [],
          leaveCalculations: [],
          lastUpdated: new Date(),
          isStale: false,
          error: "Origin or destination place not found",
        };
      }

      const now = new Date();

      // Fetch trips
      const tripsResult = await fetchTrips(
        placeToTripLocation(origin),
        placeToTripLocation(destination),
        commute.maxTrips
      );

      let trips: TripProposal[];
      let cachedAt: Date;
      let tripError: string | undefined;

      if (tripsResult.success) {
        trips = tripsResult.data;
        cachedAt = tripsResult.cachedAt;
      } else if (tripsResult.cachedData) {
        // Use stale data
        trips = tripsResult.cachedData;
        cachedAt = tripsResult.cachedAt || now;
        tripError = tripsResult.error;
      } else {
        trips = [];
        cachedAt = now;
        tripError = tripsResult.error;
      }

      // Store for recalculation
      tripDataRef.current.set(commute.id, { trips, cachedAt });

      // Calculate leave statuses
      const leaveCalculations = calculateAllLeaveStatuses(
        trips,
        origin,
        commute,
        now
      );

      // Filter deviations relevant to this commute's origin site
      const relevantDeviations = origin.transportSiteId
        ? deviations.filter(
            (d) =>
              d.lines.length === 0 || // Global deviations
              trips.some((trip) =>
                trip.legs.some(
                  (leg) => leg.line && d.lines.includes(leg.line)
                )
              )
          )
        : [];

      // Determine if data is stale (> 5 minutes old)
      const isStale = now.getTime() - cachedAt.getTime() > 5 * 60 * 1000;

      return {
        commute,
        origin,
        destination,
        trips,
        leaveCalculations,
        deviations: relevantDeviations,
        lastUpdated: cachedAt,
        isStale,
        error: tripError,
      };
    },
    [placesMap]
  );

  const refresh = useCallback(async () => {
    if (commutes.length === 0) {
      setData([]);
      setIsLoading(false);
      return;
    }

    setIsRefreshing(true);
    setError(null);

    try {
      // Fetch deviations once for all commutes
      let deviations: Deviation[] = [];
      if (fetchDeviationsData) {
        const siteIds = commutes
          .map((c) => placesMap.get(c.originPlaceId)?.transportSiteId)
          .filter((id): id is string => !!id);

        if (siteIds.length > 0) {
          const deviationsResult = await fetchDeviations({ siteIds });
          if (deviationsResult.success) {
            deviations = deviationsResult.data;
          } else if (deviationsResult.cachedData) {
            deviations = deviationsResult.cachedData;
          }
        }
      }

      // Fetch data for all commutes in parallel
      const results = await Promise.all(
        commutes.map((commute) => fetchCommuteData(commute, deviations))
      );

      setData(results);
      setLastUpdated(new Date());

      // Check if any commute had errors
      const errors = results.filter((r) => r.error).map((r) => r.error);
      if (errors.length > 0 && errors.length === results.length) {
        setError("Failed to fetch trip data");
      }
    } catch (err) {
      console.error("[useCommutes] Refresh failed:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [commutes, fetchCommuteData, fetchDeviationsData, placesMap]);

  // ==========================================================================
  // Recalculate Leave Times
  // ==========================================================================

  const recalculate = useCallback(() => {
    if (data.length === 0) return;

    const now = new Date();

    setData((prevData) =>
      prevData.map((item) => {
        const cachedTrips = tripDataRef.current.get(item.commute.id);
        if (!cachedTrips) return item;

        const leaveCalculations = calculateAllLeaveStatuses(
          cachedTrips.trips,
          item.origin,
          item.commute,
          now
        );

        return {
          ...item,
          leaveCalculations,
        };
      })
    );
  }, [data.length]);

  // ==========================================================================
  // Effects
  // ==========================================================================

  // Initial load and refresh on commute changes
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Set up refresh interval
  useEffect(() => {
    if (refreshInterval <= 0) return;

    const intervalId = setInterval(() => {
      refresh();
    }, refreshInterval * 1000);

    return () => clearInterval(intervalId);
  }, [refresh, refreshInterval]);

  // Set up tick interval for recalculating leave times
  useEffect(() => {
    if (tickInterval <= 0) return;

    const intervalId = setInterval(() => {
      recalculate();
    }, tickInterval * 1000);

    return () => clearInterval(intervalId);
  }, [recalculate, tickInterval]);

  // Refresh on window focus if stale
  useEffect(() => {
    const handleFocus = () => {
      if (lastUpdated) {
        const staleThreshold = 60 * 1000; // 1 minute
        const isStale = Date.now() - lastUpdated.getTime() > staleThreshold;
        if (isStale) {
          refresh();
        }
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [lastUpdated, refresh]);

  return {
    data,
    isLoading,
    isRefreshing,
    lastUpdated,
    error,
    refresh,
    recalculate,
  };
}
