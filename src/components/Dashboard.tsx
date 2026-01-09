/**
 * Dashboard Component
 * Main view showing all commutes with leave times
 */

import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useConfig } from "../hooks/useConfig";
import { useCommutes } from "../hooks/useCommutes";
import { CommuteCard, CompactCommuteCard } from "./CommuteCard";
import { DepartureBoard } from "./DepartureBoard";
import { DeviationBanner, DeviationSummary } from "./DeviationBanner";
import { formatLastUpdated, formatTimeWithSeconds } from "../lib/timeUtils";
import type { Deviation } from "../types";

// =============================================================================
// Component
// =============================================================================

export function Dashboard() {
  const [searchParams] = useSearchParams();
  const isKioskMode = searchParams.get("kiosk") === "1";

  const { places, commutes, settings } = useConfig();
  const { data, isLoading, isRefreshing, lastUpdated, error, refresh } = useCommutes(
    commutes,
    places,
    {
      refreshInterval: settings.refreshIntervalSeconds,
      // Per-trip countdown should feel “live”, but does not re-fetch network data.
      tickInterval: 1,
      fetchDeviationsData: settings.showDeviations,
    }
  );

  // Current time for display (updates every second in kiosk mode)
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, isKioskMode ? 1000 : 10000);

    return () => clearInterval(interval);
  }, [isKioskMode]);

  // Collect all deviations
  const allDeviations = data.reduce<Deviation[]>((acc, item) => {
    if (item.deviations) {
      // Avoid duplicates
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
    return <EmptyState />;
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      {!isKioskMode && (
        <header className="sticky top-0 z-10 bg-bg-primary border-b border-border">
          <div className="max-w-6xl mx-auto px-4 py-3">
            {/* Responsive header: avoid button overlap on small screens */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              {/* Title and status */}
              <div>
                <h1 className="text-xl font-bold text-text-primary">Commute Dashboard</h1>
                <div className="flex items-center gap-4 text-sm text-text-muted mt-1">
                  {lastUpdated && (
                    <span>
                      Updated {formatLastUpdated(lastUpdated, currentTime)}
                      {isRefreshing && " (refreshing...)"}
                    </span>
                  )}
                  {error && (
                    <span className="text-status-tight">⚠ {error}</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 self-start sm:self-auto">
                <button
                  onClick={() => refresh()}
                  disabled={isRefreshing}
                  className="px-3 py-1.5 text-sm bg-bg-secondary border border-border rounded hover:bg-bg-tertiary disabled:opacity-50 shrink-0 min-w-[6.5rem]"
                >
                  {isRefreshing ? "Refreshing..." : "Refresh"}
                </button>
                <Link
                  to="/setup"
                  className="px-3 py-1.5 text-sm bg-accent text-white rounded hover:opacity-90 shrink-0"
                >
                  Setup
                </Link>
              </div>
            </div>

            {/* Deviations summary */}
            {settings.showDeviations && allDeviations.length > 0 && (
              <div className="mt-2 pt-2 border-t border-border">
                <DeviationSummary deviations={allDeviations} />
              </div>
            )}
          </div>
        </header>
      )}

      {/* Kiosk header */}
      {isKioskMode && (
        <header className="bg-bg-primary border-b-2 border-border py-4 px-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">SL Commute</h1>
            <div className="text-right">
              <div className="text-3xl font-mono font-bold">
                {formatTimeWithSeconds(currentTime)}
              </div>
              {lastUpdated && (
                <div className="text-sm text-text-muted">
                  Data: {formatLastUpdated(lastUpdated, currentTime)}
                </div>
              )}
            </div>
          </div>
        </header>
      )}

      {/* Main content */}
      <main className={`${isKioskMode ? "p-6" : "max-w-6xl mx-auto px-4 py-6"}`}>
        {/* Loading state */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="text-4xl mb-4">🚇</div>
              <p className="text-text-muted">Loading commutes...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Deviation banner */}
            {settings.showDeviations && allDeviations.length > 0 && !isKioskMode && (
              <div className="mb-6">
                <DeviationBanner deviations={allDeviations} limit={2} />
              </div>
            )}

            {/* Commute cards grid */}
            <div
              className={`
                grid gap-6
                ${isKioskMode ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2"}
              `}
            >
              {data.map((commuteData) => (
                <div key={commuteData.commute.id}>
                  {isKioskMode ? (
                    <CompactCommuteCard data={commuteData} now={currentTime} />
                  ) : (
                    <CommuteCard data={commuteData} now={currentTime} />
                  )}

                  {/* Departure board (optional) */}
                  {settings.showDepartureBoards &&
                    commuteData.origin.transportSiteId &&
                    !isKioskMode && (
                      <div className="mt-4">
                        <DepartureBoard
                          siteId={commuteData.origin.transportSiteId}
                          stationName={`Departures from ${commuteData.origin.label}`}
                          limit={6}
                          compact
                        />
                      </div>
                    )}
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      {/* Kiosk footer */}
      {isKioskMode && (
        <footer className="fixed bottom-0 left-0 right-0 bg-bg-secondary border-t border-border py-2 px-6">
          <div className="flex items-center justify-between text-sm text-text-muted">
            <span>Refresh: {settings.refreshIntervalSeconds}s</span>
            {allDeviations.length > 0 && (
              <DeviationSummary deviations={allDeviations} />
            )}
            <span>{commutes.length} commute{commutes.length !== 1 ? "s" : ""}</span>
          </div>
        </footer>
      )}
    </div>
  );
}

// =============================================================================
// Empty State
// =============================================================================

function EmptyState() {
  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-6">🚇</div>
        <h1 className="text-2xl font-bold text-text-primary mb-2">
          Welcome to SL Commute Dashboard
        </h1>
        <p className="text-text-secondary mb-6">
          Set up your places and commutes to see when you need to leave to catch
          your train, bus, or metro.
        </p>
        <Link
          to="/setup"
          className="inline-block px-6 py-3 bg-accent text-white rounded-lg font-semibold hover:opacity-90"
        >
          Get Started →
        </Link>
      </div>
    </div>
  );
}

