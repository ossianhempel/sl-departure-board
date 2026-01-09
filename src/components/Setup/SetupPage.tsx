/**
 * SetupPage Component
 * Main setup page for managing places, commutes, and settings
 */

import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { useConfig } from "../../hooks/useConfig";
import type { Place, Commute } from "../../types";
import { PlaceForm } from "./PlaceForm";
import { CommuteForm } from "./CommuteForm";

// =============================================================================
// Types
// =============================================================================

type Tab = "places" | "commutes" | "settings";

// =============================================================================
// Component
// =============================================================================

export function SetupPage() {
  const [activeTab, setActiveTab] = useState<Tab>("places");
  const {
    places,
    commutes,
    settings,
    addPlace,
    updatePlace,
    deletePlace,
    addCommute,
    updateCommute,
    deleteCommute,
    updateSettings,
    exportConfig,
    importConfig,
    error,
  } = useConfig();

  // Edit state
  const [editingPlace, setEditingPlace] = useState<Place | null>(null);
  const [editingCommute, setEditingCommute] = useState<Commute | null>(null);
  const [showPlaceForm, setShowPlaceForm] = useState(false);
  const [showCommuteForm, setShowCommuteForm] = useState(false);

  // Import ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle export
  const handleExport = () => {
    const json = exportConfig();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sl-commute-config-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Handle import
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = event.target?.result as string;
        importConfig(json);
        alert("Configuration imported successfully!");
      } catch (err) {
        alert(
          `Import failed: ${err instanceof Error ? err.message : "Unknown error"}`
        );
      }
    };
    reader.readAsText(file);

    // Reset input
    e.target.value = "";
  };

  return (
    <div className="min-h-screen bg-bg-primary bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-50/50 via-bg-primary to-bg-primary dark:from-indigo-950/20 dark:via-bg-primary dark:to-bg-primary transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-bg-primary/80 backdrop-blur-md border-b border-border transition-colors duration-300">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-text-primary tracking-tight">Setup</h1>
            <Link
              to="/"
              className="btn px-4 py-2 bg-accent text-white rounded font-semibold hover:bg-accent-hover shadow-sm hover:shadow-md transition-all"
            >
              ← Dashboard
            </Link>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-6">
            {(["places", "commutes", "settings"] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`
                  px-4 py-2 rounded-t-lg font-medium capitalize transition-all duration-200 relative top-[1px]
                  ${
                    activeTab === tab
                      ? "bg-bg-secondary text-accent border-b-2 border-accent shadow-sm"
                      : "text-text-muted hover:text-text-primary hover:bg-bg-secondary/50"
                  }
                `}
              >
                {tab}
                {tab === "places" && ` (${places.length})`}
                {tab === "commutes" && ` (${commutes.length})`}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Error banner */}
      {error && (
        <div className="bg-status-missed/10 border-b border-status-missed px-4 py-3 text-status-missed flex items-center gap-2">
          <span className="text-lg">⚠</span> {error}
        </div>
      )}

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Places tab */}
        {activeTab === "places" && (
          <div className="animate-fade-in">
            {/* Add button */}
            {!showPlaceForm && !editingPlace && (
              <button
                onClick={() => setShowPlaceForm(true)}
                className="btn mb-6 px-4 py-2 bg-accent text-white font-semibold hover:bg-accent-hover shadow-md hover:shadow-lg transition-all"
              >
                + Add Place
              </button>
            )}

            {/* Place form */}
            {(showPlaceForm || editingPlace) && (
              <div className="mb-6 card p-6">
                <h2 className="text-xl font-bold mb-6 text-text-primary">
                  {editingPlace ? "Edit Place" : "Add New Place"}
                </h2>
                <PlaceForm
                  place={editingPlace || undefined}
                  onSubmit={(place) => {
                    if ("id" in place) {
                      updatePlace(place);
                    } else {
                      addPlace(place);
                    }
                    setShowPlaceForm(false);
                    setEditingPlace(null);
                  }}
                  onCancel={() => {
                    setShowPlaceForm(false);
                    setEditingPlace(null);
                  }}
                />
              </div>
            )}

            {/* Places list */}
            {places.length === 0 ? (
              <div className="text-center py-12 text-text-muted card p-8 border-dashed">
                <p className="text-lg mb-2 font-medium">No places configured</p>
                <p className="text-sm">Add a place to get started</p>
              </div>
            ) : (
              <div className="space-y-4">
                {places.map((place) => (
                  <PlaceItem
                    key={place.id}
                    place={place}
                    onEdit={() => setEditingPlace(place)}
                    onDelete={() => {
                      if (
                        confirm(
                          `Delete "${place.label}"? This will also remove any commutes using this place.`
                        )
                      ) {
                        deletePlace(place.id);
                      }
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Commutes tab */}
        {activeTab === "commutes" && (
          <div className="animate-fade-in">
            {/* Add button */}
            {!showCommuteForm && !editingCommute && places.length >= 2 && (
              <button
                onClick={() => setShowCommuteForm(true)}
                className="btn mb-6 px-4 py-2 bg-accent text-white font-semibold hover:bg-accent-hover shadow-md hover:shadow-lg transition-all"
              >
                + Add Commute
              </button>
            )}

            {places.length < 2 && (
              <div className="mb-6 p-6 bg-status-tight/10 border border-status-tight rounded-xl text-status-tight flex items-start gap-3">
                <span className="text-2xl">👉</span>
                <div>
                  <p className="font-bold">Setup Required</p>
                  <p className="mt-1">You need at least 2 places to create a commute.</p>
                  <button
                    onClick={() => setActiveTab("places")}
                    className="mt-2 text-sm underline hover:no-underline font-semibold"
                  >
                    Go to Places →
                  </button>
                </div>
              </div>
            )}

            {/* Commute form */}
            {(showCommuteForm || editingCommute) && (
              <div className="mb-6 card p-6">
                <h2 className="text-xl font-bold mb-6 text-text-primary">
                  {editingCommute ? "Edit Commute" : "Add New Commute"}
                </h2>
                <CommuteForm
                  commute={editingCommute || undefined}
                  places={places}
                  onSubmit={(commute) => {
                    if ("id" in commute) {
                      updateCommute(commute);
                    } else {
                      addCommute(commute);
                    }
                    setShowCommuteForm(false);
                    setEditingCommute(null);
                  }}
                  onCancel={() => {
                    setShowCommuteForm(false);
                    setEditingCommute(null);
                  }}
                />
              </div>
            )}

            {/* Commutes list */}
            {commutes.length === 0 ? (
              <div className="text-center py-12 text-text-muted card p-8 border-dashed">
                <p className="text-lg mb-2 font-medium">No commutes configured</p>
                <p className="text-sm">Add a commute to track your trips</p>
              </div>
            ) : (
              <div className="space-y-4">
                {commutes.map((commute) => {
                  const origin = places.find(
                    (p) => p.id === commute.originPlaceId
                  );
                  const destination = places.find(
                    (p) => p.id === commute.destinationPlaceId
                  );
                  return (
                    <CommuteItem
                      key={commute.id}
                      commute={commute}
                      originLabel={origin?.label || "Unknown"}
                      destinationLabel={destination?.label || "Unknown"}
                      onEdit={() => setEditingCommute(commute)}
                      onDelete={() => {
                        if (confirm(`Delete "${commute.label}"?`)) {
                          deleteCommute(commute.id);
                        }
                      }}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Settings tab */}
        {activeTab === "settings" && (
          <div className="space-y-6 animate-fade-in">
            {/* Refresh interval */}
            <div className="card p-6">
              <h3 className="text-lg font-bold mb-4 text-text-primary">Refresh Settings</h3>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Refresh interval (seconds)
                </label>
                <select
                  value={settings.refreshIntervalSeconds}
                  onChange={(e) =>
                    updateSettings({
                      refreshIntervalSeconds: parseInt(e.target.value, 10),
                    })
                  }
                  className="w-full sm:w-auto px-4 py-2 bg-bg-primary border border-border rounded-lg focus:ring-2 focus:ring-accent outline-none transition-all"
                >
                  <option value="30">30 seconds</option>
                  <option value="60">1 minute</option>
                  <option value="120">2 minutes</option>
                  <option value="300">5 minutes</option>
                </select>
              </div>
            </div>

            {/* Display settings */}
            <div className="card p-6">
              <h3 className="text-lg font-bold mb-4 text-text-primary">Display Settings</h3>
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={settings.showDepartureBoards}
                    onChange={(e) =>
                      updateSettings({ showDepartureBoards: e.target.checked })
                    }
                    className="w-5 h-5 rounded border-border text-accent focus:ring-accent"
                  />
                  <span className="group-hover:text-text-primary transition-colors">Show departure boards on dashboard</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={settings.showDeviations}
                    onChange={(e) =>
                      updateSettings({ showDeviations: e.target.checked })
                    }
                    className="w-5 h-5 rounded border-border text-accent focus:ring-accent"
                  />
                  <span className="group-hover:text-text-primary transition-colors">Show service deviations</span>
                </label>
              </div>
            </div>

            {/* Theme */}
            <div className="card p-6">
              <h3 className="text-lg font-bold mb-4 text-text-primary">Theme</h3>
              <div className="flex flex-wrap gap-2">
                {(["light", "dark", "system"] as const).map((theme) => (
                  <button
                    key={theme}
                    onClick={() => updateSettings({ theme })}
                    className={`
                      btn px-4 py-2 rounded-lg capitalize font-medium
                      ${
                        settings.theme === theme
                          ? "bg-accent text-white shadow-md"
                          : "bg-bg-tertiary text-text-secondary hover:bg-bg-secondary hover:shadow-sm"
                      }
                    `}
                  >
                    {theme}
                  </button>
                ))}
              </div>
            </div>

            {/* Export/Import */}
            <div className="card p-6">
              <h3 className="text-lg font-bold mb-4 text-text-primary">Backup & Restore</h3>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleExport}
                  className="btn px-4 py-2 bg-bg-tertiary border border-border text-text-secondary rounded-lg hover:bg-bg-secondary hover:shadow-sm transition-all"
                >
                  Export Config
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="btn px-4 py-2 bg-bg-tertiary border border-border text-text-secondary rounded-lg hover:bg-bg-secondary hover:shadow-sm transition-all"
                >
                  Import Config
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="hidden"
                />
              </div>
            </div>

            {/* Kiosk mode link */}
            <div className="card p-6 bg-gradient-to-br from-bg-secondary to-bg-tertiary">
              <h3 className="text-lg font-bold mb-2 text-text-primary">Display Mode</h3>
              <p className="text-sm text-text-secondary mb-4">
                Open the dashboard in kiosk mode for full-screen display.
              </p>
              <Link
                to="/?kiosk=1"
                className="btn inline-block px-5 py-2.5 bg-text-primary text-bg-primary rounded-lg font-semibold hover:opacity-90 shadow-md transition-all"
                target="_blank"
              >
                Open Kiosk Mode ↗
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// =============================================================================
// Place Item
// =============================================================================

interface PlaceItemProps {
  place: Place;
  onEdit: () => void;
  onDelete: () => void;
}

function PlaceItem({ place, onEdit, onDelete }: PlaceItemProps) {
  return (
    <div className="card p-5 flex items-center justify-between gap-4 group hover:border-accent/30 transition-colors">
      <div className="min-w-0">
        <h3 className="font-bold text-lg text-text-primary">{place.label}</h3>
        <div className="text-sm text-text-muted mt-1 font-mono truncate bg-bg-tertiary px-2 py-0.5 rounded inline-block">
          JP: {place.journeyPlannerLocationId}
          {place.transportSiteId && ` | Site: ${place.transportSiteId}`}
        </div>
        <div className="text-xs text-text-muted mt-2 flex items-center gap-2">
           <span className="font-medium">Prep: {Math.round(place.prepSeconds / 60)} min</span>
           <span>•</span>
           <span className="font-mono">{place.coord.lat.toFixed(4)}, {place.coord.lon.toFixed(4)}</span>
        </div>
      </div>
      <div className="flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        <button
          onClick={onEdit}
          className="btn px-3 py-1.5 text-sm bg-bg-tertiary border border-border rounded hover:bg-bg-primary hover:shadow-sm"
        >
          Edit
        </button>
        <button
          onClick={onDelete}
          className="btn px-3 py-1.5 text-sm text-status-missed border border-status-missed/20 bg-status-missed/5 rounded hover:bg-status-missed/10"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// Commute Item
// =============================================================================

interface CommuteItemProps {
  commute: Commute;
  originLabel: string;
  destinationLabel: string;
  onEdit: () => void;
  onDelete: () => void;
}

function CommuteItem({
  commute,
  originLabel,
  destinationLabel,
  onEdit,
  onDelete,
}: CommuteItemProps) {
  return (
    <div className="card p-5 flex items-center justify-between gap-4 group hover:border-accent/30 transition-colors">
      <div className="min-w-0">
        <h3 className="font-bold text-lg text-text-primary">{commute.label}</h3>
        <div className="text-sm text-text-secondary mt-1 font-medium flex items-center gap-2">
          {originLabel} <span className="text-text-muted">→</span> {destinationLabel}
        </div>
        <div className="text-xs text-text-muted mt-2 flex items-center gap-2">
          <span className="bg-bg-tertiary px-2 py-0.5 rounded">Buffer: {Math.round(commute.bufferSeconds / 60)} min</span>
          <span className="bg-bg-tertiary px-2 py-0.5 rounded">Trips: {commute.maxTrips}</span>
        </div>
      </div>
      <div className="flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        <button
          onClick={onEdit}
          className="btn px-3 py-1.5 text-sm bg-bg-tertiary border border-border rounded hover:bg-bg-primary hover:shadow-sm"
        >
          Edit
        </button>
        <button
          onClick={onDelete}
          className="btn px-3 py-1.5 text-sm text-status-missed border border-status-missed/20 bg-status-missed/5 rounded hover:bg-status-missed/10"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

