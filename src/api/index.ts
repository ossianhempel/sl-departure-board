/**
 * API module exports
 * Clean interface for all SL API interactions
 */

// Journey Planner
export {
  searchStops,
  searchAddresses,
  searchStopsAndAddresses,
  searchStopsByCoords,
  fetchTrips,
  type StopFinderResult,
} from "./journeyPlanner";

// Transport (Departures)
export {
  fetchDepartures,
  fetchAllSites,
  searchSites,
  getTransportIcon,
  type TransportSite,
} from "./transport";

// Deviations
export {
  fetchDeviations,
  getSeverityDisplay,
  type DeviationFilters,
} from "./deviations";

// Cache utilities
export { apiCache, CACHE_TTL } from "./cache";

