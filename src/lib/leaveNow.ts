/**
 * Core "Leave Now" Logic
 *
 * This is the heart of the application - calculating when you need to leave
 * to catch a specific trip.
 */

import type {
  TripProposal,
  Place,
  Commute,
  LeaveStatus,
  LeaveCalculation,
} from "../types";

// =============================================================================
// Constants
// =============================================================================

/** Threshold for "comfortable" status (seconds) */
const COMFORTABLE_THRESHOLD_SECONDS = 180; // 3 minutes

// =============================================================================
// Main Calculation
// =============================================================================

/**
 * Calculate leave timing for a trip proposal
 *
 * Formula:
 * latestLeaveTime = firstTransportDeparture - (walkToFirstLeg + prepSeconds + bufferSeconds)
 * slackSeconds = latestLeaveTime - now
 *
 * @param trip The trip proposal to calculate for
 * @param origin The origin place (for prep time)
 * @param commute The commute config (for buffer time)
 * @param now Current time
 * @returns Leave calculation with status, timing, and message
 */
export function calculateLeaveStatus(
  trip: TripProposal,
  origin: Place,
  commute: Commute,
  now: Date = new Date()
): LeaveCalculation {
  // Get the first public transport departure time
  const firstTransportDeparture = trip.firstTransportDeparture;

  // Calculate total time needed before boarding
  const totalPrepTimeSeconds =
    trip.walkToFirstLegSeconds + origin.prepSeconds + commute.bufferSeconds;

  // Calculate the latest time to leave home
  const latestLeaveTime = new Date(
    firstTransportDeparture.getTime() - totalPrepTimeSeconds * 1000
  );

  // Calculate slack (how much time until you must leave)
  const slackSeconds = Math.floor(
    (latestLeaveTime.getTime() - now.getTime()) / 1000
  );

  // Determine status
  const status = classifySlack(slackSeconds);

  // Generate human-readable message
  const message = generateMessage(status, latestLeaveTime, slackSeconds);

  return {
    status,
    latestLeaveTime,
    slackSeconds,
    message,
  };
}

/**
 * Calculate leave timing for multiple trip proposals
 */
export function calculateAllLeaveStatuses(
  trips: TripProposal[],
  origin: Place,
  commute: Commute,
  now: Date = new Date()
): LeaveCalculation[] {
  return trips.map((trip) => calculateLeaveStatus(trip, origin, commute, now));
}

// =============================================================================
// Status Classification
// =============================================================================

/**
 * Classify slack time into a status
 *
 * - Comfortable: >= 3 minutes of slack
 * - Tight: 0 to 3 minutes of slack
 * - Missed: negative slack (already too late)
 */
function classifySlack(slackSeconds: number): LeaveStatus {
  if (slackSeconds < 0) {
    return "missed";
  }
  if (slackSeconds < COMFORTABLE_THRESHOLD_SECONDS) {
    return "tight";
  }
  return "comfortable";
}

// =============================================================================
// Message Generation
// =============================================================================

/**
 * Generate a human-readable message for the leave status
 */
function generateMessage(
  status: LeaveStatus,
  latestLeaveTime: Date,
  slackSeconds: number
): string {
  const leaveTimeStr = formatTime(latestLeaveTime);

  switch (status) {
    case "missed":
      // Show how late you are to reduce ambiguity
      return `Missed by ${formatSlack(Math.abs(slackSeconds))} (leave by ${leaveTimeStr})`;

    case "tight": {
      if (slackSeconds <= 0) {
        return "Leave now!";
      }
      const slackMinutes = Math.floor(slackSeconds / 60);
      if (slackMinutes < 1) {
        return "Leave now!";
      }
      return `Leave in ${slackMinutes} min`;
    }

    case "comfortable": {
      const slackMinutes = Math.floor(slackSeconds / 60);
      if (slackMinutes >= 60) {
        const hours = Math.floor(slackMinutes / 60);
        const mins = slackMinutes % 60;
        return `Leave by ${leaveTimeStr} (${hours}h ${mins}m)`;
      }
      return `Leave by ${leaveTimeStr} (${slackMinutes} min)`;
    }

    default:
      return `Leave by ${leaveTimeStr}`;
  }
}

/**
 * Format slack seconds as human-friendly time (e.g., "2m 10s")
 */
function formatSlack(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  if (minutes === 0) {
    return `${remainingSeconds}s`;
  }
  if (remainingSeconds === 0) {
    return `${minutes}m`;
  }
  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Format a time as HH:MM
 */
function formatTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get display properties for a leave status
 */
export function getStatusDisplay(status: LeaveStatus): {
  label: string;
  icon: string;
  colorClass: string;
} {
  switch (status) {
    case "comfortable":
      return {
        label: "On time",
        icon: "✓",
        colorClass: "text-status-comfortable",
      };
    case "tight":
      return {
        label: "Hurry",
        icon: "!",
        colorClass: "text-status-tight",
      };
    case "missed":
      return {
        label: "Missed",
        icon: "✗",
        colorClass: "text-status-missed",
      };
    default:
      return {
        label: "Unknown",
        icon: "?",
        colorClass: "text-text-muted",
      };
  }
}

/**
 * Find the best (most comfortable) trip that hasn't been missed
 */
export function findBestTrip(
  calculations: LeaveCalculation[]
): { index: number; calculation: LeaveCalculation } | null {
  // Find the first non-missed trip
  const firstViableIndex = calculations.findIndex(
    (calc) => calc.status !== "missed"
  );

  if (firstViableIndex === -1) {
    return null;
  }

  return {
    index: firstViableIndex,
    calculation: calculations[firstViableIndex],
  };
}

/**
 * Format seconds as a human-readable duration
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Format a date as a relative time (e.g., "in 5 min", "2 min ago")
 */
export function formatRelativeTime(date: Date, now: Date = new Date()): string {
  const diffMs = date.getTime() - now.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);

  if (diffSeconds < 0) {
    // In the past
    const absMins = Math.abs(diffMinutes);
    if (absMins < 1) {
      return "just now";
    }
    return `${absMins} min ago`;
  }

  // In the future
  if (diffMinutes < 1) {
    return "now";
  }
  return `in ${diffMinutes} min`;
}

