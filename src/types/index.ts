/**
 * Core type definitions for the SL Commute Dashboard
 * These types power the entire application data model.
 */

// =============================================================================
// Core Domain Types
// =============================================================================

/**
 * A saved location (home, work, station, etc.)
 */
export interface Place {
  id: string;
  label: string;
  coord: {
    lat: number;
    lon: number;
  };
  /**
   * ID used by Journey Planner API (e.g., "9091001000009182").
   *
   * Optional: if omitted, the app will use the `coord` field as a coordinate-origin/destination
   * in Journey Planner trip planning. This is how you model "Home" and let Journey Planner
   * include access legs (walk/bus/metro) automatically.
   */
  journeyPlannerLocationId?: string;
  /** ID used by SL Transport API for departures (e.g., "9192") */
  transportSiteId?: string;
  /** Time needed to prepare before leaving (seconds) */
  prepSeconds: number;
}

/**
 * A configured commute between two places
 */
export interface Commute {
  id: string;
  label: string;
  originPlaceId: string;
  destinationPlaceId: string;
  /** Transport modes to include in trip search */
  modes: TransportModes;
  /** Extra buffer time to add to calculations (seconds) */
  bufferSeconds: number;
  /** Maximum number of trip proposals to fetch */
  maxTrips: number;
}

/**
 * Transport mode toggles for filtering trips
 */
export interface TransportModes {
  bus: boolean;
  metro: boolean;
  train: boolean;
  tram: boolean;
  ship: boolean;
}

// =============================================================================
// Trip and Journey Types
// =============================================================================

/**
 * A single leg of a journey (walk, bus ride, metro, etc.)
 */
export interface TripLeg {
  /** Type of transport for this leg */
  type: "walk" | "bus" | "metro" | "train" | "tram" | "ship";
  /** Line number/name (e.g., "4", "Green line") */
  line?: string;
  /** Direction/destination of the vehicle */
  direction?: string;
  /** Departure time from origin of this leg */
  departureTime: Date;
  /** Arrival time at destination of this leg */
  arrivalTime: Date;
  /** Duration in seconds */
  durationSeconds: number;
  /** Origin stop/location name */
  originName: string;
  /** Destination stop/location name */
  destinationName: string;
  /** Platform/track if available */
  platform?: string;
}

/**
 * A complete trip proposal from origin to destination
 */
export interface TripProposal {
  /** When the trip starts (first leg departure) */
  departureTime: Date;
  /** When the trip ends (last leg arrival) */
  arrivalTime: Date;
  /** Total duration in minutes */
  durationMinutes: number;
  /** Walking time before first public transport leg (seconds) */
  walkToFirstLegSeconds: number;
  /** All legs of this journey */
  legs: TripLeg[];
  /** Human-readable route summary (e.g., "Bus 4 → Metro Green") */
  routeSummary: string;
  /** First public transport departure time (after any initial walk) */
  firstTransportDeparture: Date;
}

/**
 * Leave status classification
 */
export type LeaveStatus = "comfortable" | "tight" | "missed";

/**
 * Calculated leave timing for a trip
 */
export interface LeaveCalculation {
  /** Classification of timing */
  status: LeaveStatus;
  /** Latest time to leave home and catch this trip */
  latestLeaveTime: Date;
  /** Seconds of slack (negative = already missed) */
  slackSeconds: number;
  /** Human-readable message */
  message: string;
}

// =============================================================================
// Departure Board Types
// =============================================================================

/**
 * A single departure from a station
 */
export interface Departure {
  /** Transport type */
  type: "bus" | "metro" | "train" | "tram" | "ship";
  /** Line number/name */
  line: string;
  /** Destination */
  destination: string;
  /** Scheduled departure time */
  scheduledTime: Date;
  /** Expected departure time (real-time) */
  expectedTime: Date;
  /** Minutes until departure */
  minutesUntil: number;
  /** Is delayed? */
  isDelayed: boolean;
  /** Platform/track if available */
  platform?: string;
  /** Is cancelled? */
  isCancelled: boolean;
}

// =============================================================================
// Deviation/Disruption Types
// =============================================================================

/**
 * A service deviation or disruption
 */
export interface Deviation {
  id: string;
  /** Affected line(s) */
  lines: string[];
  /** Transport mode */
  mode?: string;
  /** Severity level */
  severity: "low" | "medium" | "high";
  /** Header/title */
  header: string;
  /** Detailed message */
  message: string;
  /** When this deviation is valid from */
  validFrom: Date;
  /** When this deviation is valid until */
  validTo?: Date;
}

// =============================================================================
// Application State Types
// =============================================================================

/**
 * Application configuration stored in localStorage
 */
export interface AppConfig {
  /** Version for migration support */
  version: number;
  /** Configured places */
  places: Place[];
  /** Configured commutes */
  commutes: Commute[];
  /** Settings */
  settings: AppSettings;
}

/**
 * Application settings
 */
export interface AppSettings {
  /** Data refresh interval in seconds */
  refreshIntervalSeconds: number;
  /** Theme preference */
  theme: "light" | "dark" | "system";
  /** Show departure boards on dashboard */
  showDepartureBoards: boolean;
  /** Show deviations banner */
  showDeviations: boolean;
}

/**
 * Default configuration for new installs
 */
export const DEFAULT_CONFIG: AppConfig = {
  version: 1,
  places: [],
  commutes: [],
  settings: {
    refreshIntervalSeconds: 120,
    theme: "light",
    showDepartureBoards: true,
    showDeviations: true,
  },
};

/**
 * Default transport modes (all enabled)
 */
export const DEFAULT_TRANSPORT_MODES: TransportModes = {
  bus: true,
  metro: true,
  train: true,
  tram: true,
  ship: true,
};

// =============================================================================
// API Response Types (raw from SL APIs)
// =============================================================================

/**
 * Raw site from SL Transport API
 */
export interface RawTransportSite {
  id: number;
  name: string;
  lat?: number;
  lon?: number;
  products?: string[];
}

/**
 * Raw departure from SL Transport API
 */
export interface RawTransportDeparture {
  line: {
    id: number;
    designation: string;
    transport_mode: string;
  };
  destination: string;
  scheduled: string;
  expected: string;
  state: string;
  stop_point: {
    designation?: string;
  };
}

/**
 * Raw stop from Journey Planner stop-finder
 */
/**
 * Raw Journey Planner v2 stop-finder response location (current schema).
 * Note: stop-finder has historically had multiple schemas; the app parses both.
 */
export interface RawJourneyPlannerStop {
  id: string;
  name: string;
  type: string;
  coord?: [number, number]; // [lat, lon]
  disassembledName?: string;
}

/**
 * Raw deviation from SL Deviations API
 */
export interface RawDeviation {
  id: string;
  header: string;
  details: string;
  scope: {
    lines?: Array<{ designation: string }>;
    transport_mode?: string;
  };
  priority: number;
  valid_from: string;
  valid_to?: string;
}

// =============================================================================
// Utility Types
// =============================================================================

/**
 * Result type for API calls with error handling
 */
export type ApiResult<T> =
  | { success: true; data: T; cachedAt: Date }
  | { success: false; error: string; cachedData?: T; cachedAt?: Date };

/**
 * Dashboard data for a single commute
 */
export interface CommuteDashboardData {
  commute: Commute;
  origin: Place;
  destination: Place;
  trips: TripProposal[];
  leaveCalculations: LeaveCalculation[];
  departures?: Departure[];
  deviations?: Deviation[];
  lastUpdated: Date;
  isStale: boolean;
  error?: string;
}

