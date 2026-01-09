/**
 * DepartureBoard Component
 * Displays upcoming departures for a station
 */

import type { Departure } from "../types";
import { useDepartures, groupDeparturesByType } from "../hooks/useDepartures";
import { getTransportIcon } from "../api/transport";
import { formatLastUpdated } from "../lib/timeUtils";

// =============================================================================
// Types
// =============================================================================

interface DepartureBoardProps {
  /** Site ID to show departures for */
  siteId: string | null;
  /** Station name for display */
  stationName?: string;
  /** Maximum departures to show */
  limit?: number;
  /** Compact mode for smaller displays */
  compact?: boolean;
}

// =============================================================================
// Component
// =============================================================================

export function DepartureBoard({
  siteId,
  stationName,
  limit = 8,
  compact = false,
}: DepartureBoardProps) {
  const { departures, isLoading, error, lastUpdated, isStale } = useDepartures(
    siteId,
    { limit }
  );

  // Group by transport type
  const grouped = groupDeparturesByType(departures);

  if (!siteId) {
    return null;
  }

  return (
    <div className="bg-bg-secondary rounded-lg border border-border overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h4 className="font-semibold text-text-primary">
          {stationName || "Departures"}
        </h4>
        {lastUpdated && (
          <span
            className={`text-xs ${isStale ? "text-status-tight" : "text-text-muted"}`}
          >
            {isStale && "⚠ "}
            {formatLastUpdated(lastUpdated)}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-2">
        {isLoading ? (
          <div className="text-center py-4 text-text-muted">Loading...</div>
        ) : error && departures.length === 0 ? (
          <div className="text-center py-4 text-text-muted">{error}</div>
        ) : departures.length === 0 ? (
          <div className="text-center py-4 text-text-muted">No departures</div>
        ) : compact ? (
          <CompactDepartureList departures={departures} />
        ) : (
          <GroupedDepartureList groups={grouped} />
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Grouped Departure List
// =============================================================================

interface GroupedDepartureListProps {
  groups: ReturnType<typeof groupDeparturesByType>;
}

function GroupedDepartureList({ groups }: GroupedDepartureListProps) {
  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <div key={group.type}>
          {/* Group header */}
          <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1 px-2">
            {getTransportIcon(group.type)} {group.label}
          </div>
          {/* Departures */}
          <div className="space-y-1">
            {group.departures.slice(0, 4).map((dep, index) => (
              <DepartureRow key={index} departure={dep} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// Compact Departure List
// =============================================================================

interface CompactDepartureListProps {
  departures: Departure[];
}

function CompactDepartureList({ departures }: CompactDepartureListProps) {
  return (
    <div className="divide-y divide-border">
      {departures.map((dep, index) => (
        <DepartureRow key={index} departure={dep} compact />
      ))}
    </div>
  );
}

// =============================================================================
// Departure Row
// =============================================================================

interface DepartureRowProps {
  departure: Departure;
  compact?: boolean;
}

function DepartureRow({ departure, compact = false }: DepartureRowProps) {
  const {
    type,
    line,
    destination,
    minutesUntil,
    isDelayed,
    isCancelled,
    platform,
  } = departure;

  const timeDisplay =
    minutesUntil === 0 ? "Now" : minutesUntil === 1 ? "1 min" : `${minutesUntil} min`;

  return (
    <div
      className={`
        flex items-center justify-between px-2 py-1.5 rounded
        ${isCancelled ? "opacity-50 line-through" : ""}
        ${compact ? "" : "hover:bg-bg-tertiary"}
      `}
    >
      {/* Line and destination */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {!compact && (
          <span className="text-sm">{getTransportIcon(type)}</span>
        )}
        <span className="font-mono font-semibold text-sm bg-bg-tertiary px-1.5 py-0.5 rounded">
          {line}
        </span>
        <span className="truncate text-sm text-text-secondary">{destination}</span>
      </div>

      {/* Platform */}
      {platform && !compact && (
        <span className="text-xs text-text-muted mx-2">Plat. {platform}</span>
      )}

      {/* Time */}
      <div className="flex items-center gap-1 whitespace-nowrap">
        {isDelayed && <span className="text-status-tight text-xs">⚠</span>}
        <span
          className={`
            font-semibold text-sm
            ${minutesUntil <= 2 ? "text-status-tight" : "text-text-primary"}
          `}
        >
          {timeDisplay}
        </span>
      </div>
    </div>
  );
}

// =============================================================================
// Mini Departure Board (for inline display)
// =============================================================================

interface MiniDepartureBoardProps {
  siteId: string | null;
  limit?: number;
}

export function MiniDepartureBoard({ siteId, limit = 4 }: MiniDepartureBoardProps) {
  const { departures, isLoading } = useDepartures(siteId, { limit });

  if (!siteId || isLoading) {
    return null;
  }

  if (departures.length === 0) {
    return (
      <div className="text-xs text-text-muted py-1">No upcoming departures</div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {departures.map((dep, index) => (
        <span
          key={index}
          className="text-xs bg-bg-tertiary px-2 py-1 rounded inline-flex items-center gap-1"
        >
          <span className="font-mono font-semibold">{dep.line}</span>
          <span className="text-text-muted">
            {dep.minutesUntil === 0 ? "now" : `${dep.minutesUntil}m`}
          </span>
        </span>
      ))}
    </div>
  );
}

