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
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-border/50 bg-bg-secondary/50 backdrop-blur-sm flex items-center justify-between">
        <h4 className="font-bold text-text-primary flex items-center gap-2">
          {stationName || "Departures"}
        </h4>
        {lastUpdated && (
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              isStale ? "bg-status-tight/10 text-status-tight" : "bg-bg-tertiary text-text-muted"
            }`}
          >
            {isStale && "⚠ "}
            Updated {formatLastUpdated(lastUpdated)}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-2">
        {isLoading ? (
          <div className="flex justify-center py-6 text-text-muted">
             <span className="animate-pulse">Loading departures...</span>
          </div>
        ) : error && departures.length === 0 ? (
          <div className="text-center py-6 text-status-missed bg-status-missed/5 rounded-lg m-2">
            <p className="font-semibold">{error}</p>
          </div>
        ) : departures.length === 0 ? (
          <div className="text-center py-6 text-text-muted">No departures found</div>
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
    <div className="space-y-4 p-2">
      {groups.map((group) => (
        <div key={group.type}>
          {/* Group header */}
          <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <span className="text-lg">{getTransportIcon(group.type)}</span> 
            {group.label}
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
    <div className="divide-y divide-border/50">
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
        flex items-center justify-between px-3 py-2 rounded-lg transition-colors
        ${isCancelled ? "opacity-60 bg-status-missed/5" : ""}
        ${compact ? "hover:bg-bg-tertiary/50" : "hover:bg-bg-tertiary"}
      `}
    >
      {/* Line and destination */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {!compact && (
          <span className="text-xl opacity-80 w-6 text-center">{getTransportIcon(type)}</span>
        )}
        <span className={`
            font-mono font-bold text-sm px-2 py-0.5 rounded shadow-sm text-center min-w-[2.5rem]
            ${type === 'metro' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' : ''}
            ${type === 'bus' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' : ''}
            ${type === 'train' ? 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-300' : ''}
            ${type === 'tram' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' : ''}
            ${!['metro', 'bus', 'train', 'tram'].includes(type) ? 'bg-bg-tertiary text-text-primary' : ''}
        `}>
          {line}
        </span>
        <div className="flex flex-col min-w-0">
           <span className={`truncate font-medium ${isCancelled ? 'line-through decoration-status-missed' : 'text-text-primary'}`}>
             {destination}
           </span>
           {isCancelled && <span className="text-xs text-status-missed font-bold uppercase">Cancelled</span>}
        </div>
      </div>

      {/* Platform */}
      {platform && !compact && (
        <span className="text-xs font-mono text-text-muted mx-2 bg-bg-primary border border-border px-1.5 py-0.5 rounded">
          Plat {platform}
        </span>
      )}

      {/* Time */}
      <div className="flex items-center gap-1.5 whitespace-nowrap pl-2">
        {isDelayed && (
          <span className="text-status-tight text-lg animate-pulse" title="Delayed">⚠</span>
        )}
        <span
          className={`
            font-bold text-right min-w-[3rem]
            ${minutesUntil <= 2 && !isCancelled ? "text-status-tight" : "text-text-primary"}
            ${isCancelled ? "text-text-muted" : ""}
          `}
        >
          {isCancelled ? "--" : timeDisplay}
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

