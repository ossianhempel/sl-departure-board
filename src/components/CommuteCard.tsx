/**
 * CommuteCard Component
 * Displays trip proposals for a single commute with leave calculations
 */

import type { CommuteDashboardData } from "../types";
import { TripProposal, TripRow } from "./TripProposal";
import { findBestTrip } from "../lib/leaveNow";
import { formatLastUpdated } from "../lib/timeUtils";

// =============================================================================
// Types
// =============================================================================

interface CommuteCardProps {
  /** Dashboard data for this commute */
  data: CommuteDashboardData;
  /** Compact display mode (for e-ink/display) */
  compact?: boolean;
  /** Current time for relative calculations */
  now?: Date;
}

// =============================================================================
// Component
// =============================================================================

export function CommuteCard({ data, compact = false, now = new Date() }: CommuteCardProps) {
  const { commute, origin, destination, trips, leaveCalculations, isStale, error } = data;

  // Find the best (first non-missed) trip
  const bestTrip = findBestTrip(leaveCalculations);
  const maxMissedTrips = 2;
  const desiredVisibleTrips = commute.maxTrips;

  // No trips available
  if (trips.length === 0) {
    return (
      <div className="bg-bg-secondary rounded-lg p-4 border border-border">
        <CardHeader label={commute.label} origin={origin.label} destination={destination.label} />
        <div className="mt-4 text-center text-text-muted py-8">
          {error ? (
            <div>
              <p className="font-semibold text-status-missed">Connection error</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          ) : (
            <p>No trips available</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`
        bg-bg-secondary rounded-lg border border-border overflow-hidden
        ${isStale ? "border-status-tight" : ""}
      `}
    >
      {/* Header */}
      <div className="p-4 border-b border-border">
        <CardHeader
          label={commute.label}
          origin={origin.label}
          destination={destination.label}
          isStale={isStale}
          lastUpdated={data.lastUpdated}
          now={now}
        />
      </div>

      {/* Trip list */}
      <div className={compact ? "divide-y divide-border" : "p-4 space-y-3"}>
        {(() => {
          const items = trips
            .map((trip, index) => ({ trip, index, leaveCalc: leaveCalculations[index] }))
            .filter((item) => !!item.leaveCalc)
            .sort((a, b) => {
              const aTime = a.leaveCalc?.latestLeaveTime.getTime() ?? 0;
              const bTime = b.leaveCalc?.latestLeaveTime.getTime() ?? 0;
              return aTime - bTime;
            });

          const nonMissed = items.filter((item) => item.leaveCalc?.status !== "missed");
          const missed = items.filter((item) => item.leaveCalc?.status === "missed");

          const maxMissedToShow =
            nonMissed.length === 0 ? maxMissedTrips : Math.min(maxMissedTrips, nonMissed.length);

          const displayItems =
            nonMissed.length >= desiredVisibleTrips
              ? nonMissed.slice(0, desiredVisibleTrips)
              : [
                  ...nonMissed,
                  ...missed.slice(
                    0,
                    Math.min(maxMissedToShow, desiredVisibleTrips - nonMissed.length)
                  ),
                ];

          return displayItems.map(({ trip, index, leaveCalc }) => {
            if (!leaveCalc) return null;
            const isRecommended = bestTrip?.index === index;

            return compact ? (
              <TripRow key={index} trip={trip} leaveCalc={leaveCalc} now={now} />
            ) : (
              <TripProposal
                key={index}
                trip={trip}
                leaveCalc={leaveCalc}
                now={now}
                isRecommended={isRecommended}
              />
            );
          });
        })()}
      </div>

      {/* Error banner if stale */}
      {error && !isStale && (
        <div className="px-4 py-2 bg-status-tight/10 border-t border-status-tight text-sm text-status-tight">
          ⚠ {error}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Card Header
// =============================================================================

interface CardHeaderProps {
  label: string;
  origin: string;
  destination: string;
  isStale?: boolean;
  lastUpdated?: Date;
  now?: Date;
}

function CardHeader({
  label,
  origin,
  destination,
  isStale,
  lastUpdated,
  now = new Date(),
}: CardHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        {/* Commute label */}
        <h3 className="font-bold text-lg text-text-primary">
          {label || `${origin} → ${destination}`}
        </h3>
        {/* Origin to destination */}
        {label && (
          <p className="text-sm text-text-muted">
            {origin} → {destination}
          </p>
        )}
      </div>

      {/* Stale indicator */}
      {isStale && lastUpdated && (
        <div className="text-xs text-status-tight whitespace-nowrap">
          ⚠ Data from {formatLastUpdated(lastUpdated, now)}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Compact Card (for display/kiosk mode)
// =============================================================================

interface CompactCommuteCardProps {
  data: CommuteDashboardData;
  now?: Date;
}

export function CompactCommuteCard({ data, now: _now = new Date() }: CompactCommuteCardProps) {
  const { commute, origin, destination, trips, leaveCalculations, error } = data;
  const bestTrip = findBestTrip(leaveCalculations);
  void _now; // Used for interface consistency

  // Get the best trip info
  const primaryTrip = bestTrip
    ? { trip: trips[bestTrip.index], calc: bestTrip.calculation }
    : null;

  return (
    <div className="border-b-2 border-border py-4">
      {/* Route name */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-xl">
          {commute.label || `${origin.label} → ${destination.label}`}
        </h3>
        {error && <span className="text-status-tight text-sm">⚠</span>}
      </div>

      {/* Primary recommendation */}
      {primaryTrip ? (
        <div className="flex items-baseline justify-between">
          <div>
            <span
              className={`
                text-3xl font-bold
                ${primaryTrip.calc.status === "comfortable" ? "text-status-comfortable" : ""}
                ${primaryTrip.calc.status === "tight" ? "text-status-tight" : ""}
                ${primaryTrip.calc.status === "missed" ? "text-status-missed" : ""}
              `}
            >
              {primaryTrip.calc.message}
            </span>
          </div>
          <div className="text-right">
            <span className="text-2xl font-semibold">
              → {formatTimeShort(primaryTrip.trip.arrivalTime)}
            </span>
          </div>
        </div>
      ) : (
        <p className="text-text-muted">No trips available</p>
      )}

      {/* Next alternatives */}
      {trips.length > 1 && (
        <div className="mt-2 text-sm text-text-muted flex gap-4">
          {trips.slice(1, 3).map((trip, index) => {
            const calc = leaveCalculations[index + 1];
            if (!calc || calc.status === "missed") return null;
            return (
              <span key={index}>
                Also: leave {formatTimeShort(calc.latestLeaveTime)} → {formatTimeShort(trip.arrivalTime)}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatTimeShort(date: Date): string {
  return date.toLocaleTimeString("sv-SE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
