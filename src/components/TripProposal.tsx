/**
 * TripProposal Component
 * Displays a single trip with leave time and arrival info
 */

import type { TripProposal as TripProposalType, LeaveCalculation } from "../types";
import { getStatusDisplay } from "../lib/leaveNow";
import { formatTime, formatDurationMinutes, formatDurationSeconds, formatCountdown } from "../lib/timeUtils";

function getLegModeLabel(type: TripProposalType["legs"][number]["type"]): string {
  switch (type) {
    case "metro":
      return "Metro";
    case "train":
      return "Train";
    case "tram":
      return "Tram";
    case "bus":
      return "Bus";
    case "ship":
      return "Ferry";
    case "walk":
      return "Walk";
    default:
      return "Transit";
  }
}

function getLegEmoji(type: TripProposalType["legs"][number]["type"]): string {
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
      return "🧭";
  }
}

// =============================================================================
// Types
// =============================================================================

interface TripProposalProps {
  /** The trip proposal data */
  trip: TripProposalType;
  /** Calculated leave timing */
  leaveCalc: LeaveCalculation;
  /** Current time for live countdown */
  now?: Date;
  /** Whether this is the recommended trip */
  isRecommended?: boolean;
  /** Compact display mode */
  compact?: boolean;
}

// =============================================================================
// Component
// =============================================================================

export function TripProposal({
  trip,
  leaveCalc,
  now = new Date(),
  isRecommended = false,
  compact = false,
}: TripProposalProps) {
  const statusDisplay = getStatusDisplay(leaveCalc.status);
  void now; // Countdown is based on slackSeconds which is recomputed in the hook tick
  const secondsUntilLeave = Math.max(0, Math.floor(leaveCalc.slackSeconds));

  return (
    <div
      className={`
        border-l-4 pl-4 py-2
        ${leaveCalc.status === "comfortable" ? "border-status-comfortable" : ""}
        ${leaveCalc.status === "tight" ? "border-status-tight" : ""}
        ${leaveCalc.status === "missed" ? "border-status-missed" : ""}
        ${isRecommended ? "bg-bg-secondary" : ""}
      `}
    >
      {/* Leave time and status */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {/* Status icon with label for accessibility */}
          <span
            className={`font-bold text-lg ${statusDisplay.colorClass}`}
            aria-label={statusDisplay.label}
          >
            {statusDisplay.icon}
          </span>

          {/* Leave message */}
          <span
            className={`font-semibold ${statusDisplay.colorClass} ${
              leaveCalc.status === "missed" ? "line-through opacity-60" : ""
            }`}
          >
            {leaveCalc.message}
          </span>
        </div>

        {/* Arrival time */}
        <div className="text-right">
          <span className="text-text-secondary">Arrive </span>
          <span className="font-semibold">{formatTime(trip.arrivalTime)}</span>
        </div>
      </div>

      {/* Live countdown ticker for trips you can still catch */}
      {leaveCalc.status !== "missed" && (
        <div className="mt-1 text-sm text-text-muted">
          <span className="font-mono">Leave in {formatCountdown(secondsUntilLeave)}</span>
        </div>
      )}

      {/* Route summary and duration */}
      {!compact && (
        <div className="mt-1 flex items-center justify-between text-sm text-text-muted">
          <span className="truncate max-w-[60%]">{trip.routeSummary}</span>
          <span>{formatDurationMinutes(trip.durationMinutes)}</span>
        </div>
      )}

      {/* Detailed legs (optional, for expanded view) */}
      {!compact && trip.legs.length > 1 && (
        <div className="mt-2 text-xs text-text-muted">
          {trip.legs.map((leg, index) => (
            <span key={index}>
              {index > 0 && " → "}
              {leg.type === "walk" ? (
                <span>
                  {getLegEmoji(leg.type)} {getLegModeLabel(leg.type)}{" "}
                  {formatDurationSeconds(leg.durationSeconds)} to{" "}
                  {leg.destinationName.split(",")[0]}
                </span>
              ) : (
                <span>
                  {getLegEmoji(leg.type)} {getLegModeLabel(leg.type)}
                  {leg.line ? ` line ${leg.line}` : ""} ·{" "}
                  {formatDurationSeconds(leg.durationSeconds)} to{" "}
                  {leg.destinationName.split(",")[0]}
                </span>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Compact Trip Row (for e-ink / display mode)
// =============================================================================

interface TripRowProps {
  trip: TripProposalType;
  leaveCalc: LeaveCalculation;
  now?: Date;
}

export function TripRow({ trip, leaveCalc, now = new Date() }: TripRowProps) {
  const statusDisplay = getStatusDisplay(leaveCalc.status);
  void now; // Countdown is based on slackSeconds which is recomputed in the hook tick
  const secondsUntilLeave = Math.max(0, Math.floor(leaveCalc.slackSeconds));

  return (
    <div
      className={`
        flex items-center justify-between py-2 border-b border-border last:border-b-0
        ${leaveCalc.status === "missed" ? "opacity-50" : ""}
      `}
    >
      {/* Status and leave time */}
      <div className="flex items-center gap-3">
        <span className={`font-mono font-bold ${statusDisplay.colorClass}`}>
          {statusDisplay.icon}
        </span>
        <span className="font-semibold whitespace-nowrap">
          {formatTime(leaveCalc.latestLeaveTime)}
        </span>
        <span className="text-text-muted text-sm hidden sm:inline">
          ({leaveCalc.status === "missed" ? "missed" : leaveCalc.message})
        </span>
        {leaveCalc.status !== "missed" && (
          <span className="text-text-muted text-sm font-mono hidden lg:inline">
            (T-{formatCountdown(secondsUntilLeave)})
          </span>
        )}
      </div>

      {/* Route summary */}
      <div className="flex-1 mx-4 truncate text-sm text-text-secondary hidden md:block">
        {trip.routeSummary}
      </div>

      {/* Arrival */}
      <div className="text-right whitespace-nowrap">
        <span className="text-text-muted text-sm">→ </span>
        <span className="font-semibold">{formatTime(trip.arrivalTime)}</span>
        <span className="text-text-muted text-sm ml-2">
          ({formatDurationMinutes(trip.durationMinutes)})
        </span>
      </div>
    </div>
  );
}
