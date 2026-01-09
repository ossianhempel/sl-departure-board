/**
 * DeviationBanner Component
 * Displays service disruptions and deviations
 */

import type { Deviation } from "../types";
import { getSeverityDisplay } from "../api/deviations";

// =============================================================================
// Types
// =============================================================================

interface DeviationBannerProps {
  /** List of deviations to display */
  deviations: Deviation[];
  /** Compact mode (shows fewer details) */
  compact?: boolean;
  /** Maximum number of deviations to show */
  limit?: number;
}

// =============================================================================
// Component
// =============================================================================

export function DeviationBanner({
  deviations,
  compact = false,
  limit = 3,
}: DeviationBannerProps) {
  if (deviations.length === 0) {
    return null;
  }

  // Sort by severity and limit
  const sortedDeviations = [...deviations]
    .sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    })
    .slice(0, limit);

  return (
    <div className="space-y-2">
      {sortedDeviations.map((deviation) => (
        <DeviationItem key={deviation.id} deviation={deviation} compact={compact} />
      ))}
    </div>
  );
}

// =============================================================================
// Deviation Item
// =============================================================================

interface DeviationItemProps {
  deviation: Deviation;
  compact?: boolean;
}

function DeviationItem({ deviation, compact = false }: DeviationItemProps) {
  const display = getSeverityDisplay(deviation.severity);

  const bgColor = {
    high: "bg-status-missed/10 border-status-missed",
    medium: "bg-status-tight/10 border-status-tight",
    low: "bg-bg-tertiary border-border",
  }[deviation.severity];

  const textColor = {
    high: "text-status-missed",
    medium: "text-status-tight",
    low: "text-text-secondary",
  }[deviation.severity];

  return (
    <div className={`rounded-lg border p-3 ${bgColor}`}>
      {/* Header */}
      <div className="flex items-start gap-2">
        <span className="text-lg" role="img" aria-label={display.label}>
          {display.icon}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-semibold ${textColor}`}>{deviation.header}</span>
            {deviation.lines.length > 0 && (
              <span className="text-xs text-text-muted">
                Lines: {deviation.lines.join(", ")}
              </span>
            )}
          </div>

          {/* Details */}
          {!compact && deviation.message && (
            <p className="mt-1 text-sm text-text-secondary line-clamp-2">
              {deviation.message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Inline Deviation Indicator
// =============================================================================

interface DeviationIndicatorProps {
  /** Number of active deviations */
  count: number;
  /** Highest severity level */
  severity: Deviation["severity"];
  /** Click handler */
  onClick?: () => void;
}

export function DeviationIndicator({
  count,
  severity,
  onClick,
}: DeviationIndicatorProps) {
  if (count === 0) {
    return null;
  }

  const display = getSeverityDisplay(severity);

  return (
    <button
      onClick={onClick}
      className={`
        inline-flex items-center gap-1 px-2 py-1 rounded text-sm
        ${severity === "high" ? "bg-status-missed/10 text-status-missed" : ""}
        ${severity === "medium" ? "bg-status-tight/10 text-status-tight" : ""}
        ${severity === "low" ? "bg-bg-tertiary text-text-secondary" : ""}
        hover:opacity-80 transition-opacity
      `}
      aria-label={`${count} service ${count === 1 ? "alert" : "alerts"}`}
    >
      <span>{display.icon}</span>
      <span className="font-semibold">{count}</span>
    </button>
  );
}

// =============================================================================
// Deviation Summary (for dashboard header)
// =============================================================================

interface DeviationSummaryProps {
  deviations: Deviation[];
}

export function DeviationSummary({ deviations }: DeviationSummaryProps) {
  if (deviations.length === 0) {
    return (
      <span className="text-sm text-status-comfortable">
        ✓ All services running normally
      </span>
    );
  }

  const highCount = deviations.filter((d) => d.severity === "high").length;
  const mediumCount = deviations.filter((d) => d.severity === "medium").length;
  const lowCount = deviations.filter((d) => d.severity === "low").length;

  return (
    <div className="flex items-center gap-3 text-sm">
      {highCount > 0 && (
        <span className="text-status-missed">
          ⚠️ {highCount} major
        </span>
      )}
      {mediumCount > 0 && (
        <span className="text-status-tight">
          ℹ️ {mediumCount} disruption{mediumCount > 1 ? "s" : ""}
        </span>
      )}
      {lowCount > 0 && (
        <span className="text-text-muted">
          📢 {lowCount} notice{lowCount > 1 ? "s" : ""}
        </span>
      )}
    </div>
  );
}

