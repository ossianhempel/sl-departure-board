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
    <div className="min-h-screen bg-bg-primary bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-50/50 via-bg-primary to-bg-primary dark:from-indigo-950/20 dark:via-bg-primary dark:to-bg-primary transition-colors duration-300">
      {/* Header */}
      {!isKioskMode && (
        <header className="sticky top-0 z-10 bg-bg-primary/80 backdrop-blur-md border-b border-border transition-colors duration-300">
          <div className="max-w-6xl mx-auto px-4 py-4">
            {/* Responsive header: avoid button overlap on small screens */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              {/* Title and status */}
              <div>
                <h1 className="text-2xl font-bold text-text-primary tracking-tight">Commute Dashboard</h1>
                <div className="flex items-center gap-4 text-sm text-text-muted mt-1 font-medium">
                  {lastUpdated && (
                    <span>
                      Updated {formatLastUpdated(lastUpdated, currentTime)}
                      {isRefreshing && " (refreshing...)"}
                    </span>
                  )}
                  {error && (
                    <span className="text-status-tight flex items-center gap-1">
                      <span className="inline-block w-2 h-2 rounded-full bg-status-tight animate-pulse" />
                      {error}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 self-start sm:self-auto">
                <button
                  onClick={() => refresh()}
                  disabled={isRefreshing}
                  className="btn px-4 py-2 text-sm font-medium bg-bg-secondary border border-border text-text-secondary hover:bg-bg-tertiary hover:border-border-strong disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
                >
                  {isRefreshing ? "Refreshing..." : "Refresh"}
                </button>
                <Link
                  to="/setup"
                  className="btn px-4 py-2 text-sm font-medium bg-accent text-white hover:bg-accent-hover shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
                >
                  Setup
                </Link>
              </div>
            </div>

            {/* Deviations summary */}
            {settings.showDeviations && allDeviations.length > 0 && (
              <div className="mt-4 pt-3 border-t border-border">
                <DeviationSummary deviations={allDeviations} />
              </div>
            )}
          </div>
        </header>
      )}

      {/* Kiosk header */}
      {isKioskMode && (
        <header className="bg-bg-primary border-b-2 border-border py-6 px-8">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight">SL Commute</h1>
            <div className="text-right">
              <div className="text-4xl font-mono font-bold tracking-tight text-text-primary">
                {formatTimeWithSeconds(currentTime)}
              </div>
              {lastUpdated && (
                <div className="text-base text-text-muted mt-1">
                  Data: {formatLastUpdated(lastUpdated, currentTime)}
                </div>
              )}
            </div>
          </div>
        </header>
      )}

      {/* Main content */}
      <main className={`${isKioskMode ? "p-8" : "max-w-6xl mx-auto px-4 py-8"}`}>
        {/* Loading state */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 animate-fade-in">
            <div className="text-6xl mb-6 animate-bounce">🚇</div>
            <p className="text-xl font-medium text-text-muted">Loading your commutes...</p>
          </div>
        ) : (
          <>
            {/* Deviation banner */}
            {settings.showDeviations && allDeviations.length > 0 && !isKioskMode && (
              <div className="mb-8">
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
                <div key={commuteData.commute.id} className="contents">
                  {isKioskMode ? (
                    <CompactCommuteCard data={commuteData} now={currentTime} />
                  ) : (
                    <CommuteCard data={commuteData} now={currentTime} />
                  )}
                  
                  {/* Departure board is handled inside CommuteCard or separately depending on design, 
                      but preserving current logic of separate component */}
                  {settings.showDepartureBoards &&
                    commuteData.origin.transportSiteId &&
                    !isKioskMode && (
                      <div className="mt-4 card p-4">
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
        <footer className="fixed bottom-0 left-0 right-0 bg-bg-secondary border-t border-border py-3 px-8 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
          <div className="flex items-center justify-between text-lg font-medium text-text-muted">
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
    <div className="min-h-screen bg-bg-primary bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-50/50 via-bg-primary to-bg-primary flex items-center justify-center p-4">
      <div className="card max-w-lg w-full p-12 text-center shadow-xl border-border/50 bg-bg-secondary/80 backdrop-blur-sm">
        <div className="text-7xl mb-8 transform hover:scale-110 transition-transform duration-300 inline-block">🚇</div>
        <h1 className="text-3xl font-bold text-text-primary mb-4 tracking-tight">
          SL Commute Dashboard
        </h1>
        <p className="text-text-secondary text-lg mb-8 leading-relaxed">
          Set up your places and commutes to see exactly when you need to leave to catch
          your train, bus, or metro.
        </p>
        <Link
          to="/setup"
          className="btn inline-block px-8 py-4 bg-accent text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl hover:-translate-y-1 hover:bg-accent-hover transition-all"
        >
          Get Started →
        </Link>
      </div>
    </div>
  );
}

