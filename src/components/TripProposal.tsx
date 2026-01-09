/**
 * TripProposal Component
 * Displays a single trip with leave time and arrival info
 */

import type { TripProposal as TripProposalType, LeaveCalculation } from "../types";
import { getStatusDisplay } from "../lib/leaveNow";
import { formatTime, formatDurationMinutes, formatCountdown } from "../lib/timeUtils";

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
        relative rounded-xl p-4 transition-all duration-300 border
        ${
          leaveCalc.status === "comfortable"
            ? "bg-green-50/50 border-green-200 hover:bg-green-50 hover:border-green-300 dark:bg-green-900/10 dark:border-green-900/30"
            : ""
        }
        ${
          leaveCalc.status === "tight"
            ? "bg-amber-50/50 border-amber-200 hover:bg-amber-50 hover:border-amber-300 dark:bg-amber-900/10 dark:border-amber-900/30"
            : ""
        }
        ${
          leaveCalc.status === "missed"
            ? "bg-red-50/30 border-red-100 opacity-75 dark:bg-red-900/5 dark:border-red-900/20"
            : ""
        }
        ${isRecommended ? "ring-2 ring-accent ring-offset-2 ring-offset-bg-secondary shadow-md z-10 scale-[1.01]" : ""}
      `}
    >
      {/* Recommended badge */}
      {isRecommended && (
        <div className="absolute -top-3 left-4 bg-accent text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-sm uppercase tracking-wide">
          Recommended
        </div>
      )}

      {/* Main Row */}
      <div className="flex items-center justify-between gap-4">
        
        {/* Left: Status & Leave Time */}
        <div className="flex items-center gap-3">
          <div 
            className={`
              w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-sm
              ${leaveCalc.status === 'comfortable' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : ''}
              ${leaveCalc.status === 'tight' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : ''}
              ${leaveCalc.status === 'missed' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : ''}
            `}
          >
            {statusDisplay.icon}
          </div>
          
          <div>
            <div className="flex items-baseline gap-2">
              <span className={`font-bold text-lg leading-none ${statusDisplay.colorClass}`}>
                {leaveCalc.status === 'missed' ? 'Missed' : formatTime(leaveCalc.latestLeaveTime)}
              </span>
              {leaveCalc.status !== "missed" && (
                <span className="text-xs font-medium text-text-muted uppercase tracking-wider">Leave at</span>
              )}
            </div>
            <div className={`text-sm font-medium ${statusDisplay.colorClass}`}>
              {leaveCalc.message}
            </div>
          </div>
        </div>

        {/* Right: Arrival Time */}
        <div className="text-right">
          <div className="flex flex-col items-end">
             <span className="font-bold text-lg text-text-primary leading-none">
              {formatTime(trip.arrivalTime)}
            </span>
             <span className="text-xs text-text-muted mt-0.5">Arrival</span>
          </div>
        </div>
      </div>

      {/* Footer Info: Route & Countdown */}
      <div className="mt-3 flex items-center justify-between text-sm pt-3 border-t border-black/5 dark:border-white/5">
        <div className="flex items-center gap-2 text-text-secondary font-medium truncate max-w-[60%]">
          <span>{trip.routeSummary}</span>
          <span className="text-text-muted font-normal">• {formatDurationMinutes(trip.durationMinutes)}</span>
        </div>
        
        {leaveCalc.status !== "missed" && (
           <div className="font-mono text-sm font-semibold text-text-primary bg-bg-primary/50 px-2 py-0.5 rounded">
             T-{formatCountdown(secondsUntilLeave)}
           </div>
        )}
      </div>

      {/* Detailed legs (optional, for expanded view) */}
      {!compact && trip.legs.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-y-2 text-xs text-text-secondary">
          {trip.legs.map((leg, index) => (
            <div key={index} className="flex items-center">
              {index > 0 && <span className="mx-1 text-text-muted/40">→</span>}
              <div className={`
                flex items-center gap-1.5 px-2 py-1 rounded-md border
                ${leg.type === 'walk' 
                  ? 'bg-transparent border-dashed border-text-muted/30 text-text-primary' 
                  : 'bg-white/50 dark:bg-white/5 border-black/5 dark:border-white/10 shadow-sm text-text-primary'}
              `}>
                <span className="text-sm">{getLegEmoji(leg.type)}</span>
                <span className="truncate max-w-[120px]">
                  {leg.type !== 'walk' && leg.line && <span className="font-bold mr-1">{leg.line}</span>}
                  <span className={leg.type === 'walk' ? 'italic' : ''}>
                    {leg.type === 'walk' ? 'Walk to ' : ''}
                    {leg.destinationName?.split(',')[0]}
                  </span>
                </span>
                <span className="text-[10px] font-medium opacity-60 ml-0.5 whitespace-nowrap">
                   {leg.durationSeconds >= 60 
                     ? `${Math.round(leg.durationSeconds / 60)}m` 
                     : `${leg.durationSeconds}s`}
                </span>
              </div>
            </div>
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
