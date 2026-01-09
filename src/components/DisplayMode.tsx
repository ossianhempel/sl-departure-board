/**
 * DisplayMode Component
 * Full-screen e-ink-optimized display mode
 * Designed for wall-mounted screens or e-ink displays
 */

import { useState, useEffect } from "react";
import { useConfig } from "../hooks/useConfig";
import { useCommutes } from "../hooks/useCommutes";
import { CompactCommuteCard } from "./CommuteCard";
import { DeviationSummary } from "./DeviationBanner";
import { formatTimeWithSeconds, formatLastUpdated } from "../lib/timeUtils";
import type { Deviation } from "../types";

// =============================================================================
// Component
// =============================================================================

export function DisplayMode() {
  const { places, commutes, settings } = useConfig();
  const { data, lastUpdated, error } = useCommutes(commutes, places, {
    refreshInterval: settings.refreshIntervalSeconds,
    tickInterval: 1,
    fetchDeviationsData: settings.showDeviations,
  });

  // Current time (updates every second)
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Collect all deviations
  const allDeviations = data.reduce<Deviation[]>((acc, item) => {
    if (item.deviations) {
      for (const dev of item.deviations) {
        if (!acc.some((d) => d.id === dev.id)) {
          acc.push(dev);
        }
      }
    }
    return acc;
  }, []);

  // Empty state
  if (commutes.length === 0) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-6">🚇</div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">
            No Commutes Configured
          </h1>
          <p className="text-xl text-text-muted">
            Visit /setup to add your commutes
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      {/* Header with time */}
      <header className="bg-bg-secondary border-b-4 border-border py-6 px-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">
              Commute Dashboard
            </h1>
            {error && (
              <p className="text-status-missed mt-1">⚠ {error}</p>
            )}
          </div>
          <div className="text-right">
            <div className="text-5xl font-mono font-bold tracking-wider">
              {formatTimeWithSeconds(currentTime)}
            </div>
            {lastUpdated && (
              <div className="text-lg text-text-muted mt-1">
                Updated {formatLastUpdated(lastUpdated, currentTime)}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Deviations bar */}
      {settings.showDeviations && allDeviations.length > 0 && (
        <div className="bg-bg-tertiary px-8 py-3 border-b border-border">
          <DeviationSummary deviations={allDeviations} />
        </div>
      )}

      {/* Main content - commute cards */}
      <main className="flex-1 p-8">
        <div className="grid gap-8 grid-cols-1">
          {data.map((commuteData) => (
            <CompactCommuteCard
              key={commuteData.commute.id}
              data={commuteData}
              now={currentTime}
            />
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-bg-secondary border-t-2 border-border py-4 px-8">
        <div className="flex items-center justify-between text-text-muted">
          <span>
            Auto-refresh every {settings.refreshIntervalSeconds}s
          </span>
          <span>
            {commutes.length} commute{commutes.length !== 1 ? "s" : ""} configured
          </span>
        </div>
      </footer>
    </div>
  );
}

