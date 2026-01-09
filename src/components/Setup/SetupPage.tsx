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
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-bg-primary border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-text-primary">Setup</h1>
            <Link
              to="/"
              className="px-4 py-2 bg-accent text-white rounded font-semibold hover:opacity-90"
            >
              ← Dashboard
            </Link>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4">
            {(["places", "commutes", "settings"] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`
                  px-4 py-2 rounded-t font-medium capitalize
                  ${
                    activeTab === tab
                      ? "bg-bg-secondary text-text-primary border-b-2 border-accent"
                      : "text-text-muted hover:text-text-primary"
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
        <div className="bg-status-missed/10 border-b border-status-missed px-4 py-3 text-status-missed">
          ⚠ {error}
        </div>
      )}

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Places tab */}
        {activeTab === "places" && (
          <div>
            {/* Add button */}
            {!showPlaceForm && !editingPlace && (
              <button
                onClick={() => setShowPlaceForm(true)}
                className="mb-6 px-4 py-2 bg-accent text-white rounded font-semibold hover:opacity-90"
              >
                + Add Place
              </button>
            )}

            {/* Place form */}
            {(showPlaceForm || editingPlace) && (
              <div className="mb-6 bg-bg-secondary rounded-lg p-6 border border-border">
                <h2 className="text-lg font-bold mb-4">
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
              <div className="text-center py-12 text-text-muted">
                <p className="text-lg mb-2">No places configured</p>
                <p className="text-sm">Add a place to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
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
          <div>
            {/* Add button */}
            {!showCommuteForm && !editingCommute && places.length >= 2 && (
              <button
                onClick={() => setShowCommuteForm(true)}
                className="mb-6 px-4 py-2 bg-accent text-white rounded font-semibold hover:opacity-90"
              >
                + Add Commute
              </button>
            )}

            {places.length < 2 && (
              <div className="mb-6 p-4 bg-status-tight/10 border border-status-tight rounded-lg text-status-tight">
                You need at least 2 places to create a commute.{" "}
                <button
                  onClick={() => setActiveTab("places")}
                  className="underline"
                >
                  Add places first
                </button>
              </div>
            )}

            {/* Commute form */}
            {(showCommuteForm || editingCommute) && (
              <div className="mb-6 bg-bg-secondary rounded-lg p-6 border border-border">
                <h2 className="text-lg font-bold mb-4">
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
              <div className="text-center py-12 text-text-muted">
                <p className="text-lg mb-2">No commutes configured</p>
                <p className="text-sm">Add a commute to track your trips</p>
              </div>
            ) : (
              <div className="space-y-3">
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
          <div className="space-y-6">
            {/* Refresh interval */}
            <div className="bg-bg-secondary rounded-lg p-6 border border-border">
              <h3 className="font-semibold mb-4">Refresh Settings</h3>
              <div>
                <label className="block text-sm text-text-secondary mb-1">
                  Refresh interval (seconds)
                </label>
                <select
                  value={settings.refreshIntervalSeconds}
                  onChange={(e) =>
                    updateSettings({
                      refreshIntervalSeconds: parseInt(e.target.value, 10),
                    })
                  }
                  className="px-3 py-2 bg-bg-primary border border-border rounded"
                >
                  <option value="30">30 seconds</option>
                  <option value="60">1 minute</option>
                  <option value="120">2 minutes</option>
                  <option value="300">5 minutes</option>
                </select>
              </div>
            </div>

            {/* Display settings */}
            <div className="bg-bg-secondary rounded-lg p-6 border border-border">
              <h3 className="font-semibold mb-4">Display Settings</h3>
              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={settings.showDepartureBoards}
                    onChange={(e) =>
                      updateSettings({ showDepartureBoards: e.target.checked })
                    }
                    className="w-5 h-5 rounded border-border"
                  />
                  <span>Show departure boards on dashboard</span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={settings.showDeviations}
                    onChange={(e) =>
                      updateSettings({ showDeviations: e.target.checked })
                    }
                    className="w-5 h-5 rounded border-border"
                  />
                  <span>Show service deviations</span>
                </label>
              </div>
            </div>

            {/* Theme */}
            <div className="bg-bg-secondary rounded-lg p-6 border border-border">
              <h3 className="font-semibold mb-4">Theme</h3>
              <div className="flex gap-2">
                {(["light", "dark", "system"] as const).map((theme) => (
                  <button
                    key={theme}
                    onClick={() => updateSettings({ theme })}
                    className={`
                      px-4 py-2 rounded capitalize
                      ${
                        settings.theme === theme
                          ? "bg-accent text-white"
                          : "bg-bg-tertiary text-text-secondary hover:bg-bg-primary"
                      }
                    `}
                  >
                    {theme}
                  </button>
                ))}
              </div>
            </div>

            {/* Export/Import */}
            <div className="bg-bg-secondary rounded-lg p-6 border border-border">
              <h3 className="font-semibold mb-4">Backup & Restore</h3>
              <div className="flex gap-3">
                <button
                  onClick={handleExport}
                  className="px-4 py-2 bg-bg-tertiary border border-border rounded hover:bg-bg-primary"
                >
                  Export Config
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-bg-tertiary border border-border rounded hover:bg-bg-primary"
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
            <div className="bg-bg-secondary rounded-lg p-6 border border-border">
              <h3 className="font-semibold mb-4">Display Mode</h3>
              <p className="text-sm text-text-muted mb-3">
                Open the dashboard in kiosk mode for full-screen display.
              </p>
              <Link
                to="/?kiosk=1"
                className="inline-block px-4 py-2 bg-accent text-white rounded hover:opacity-90"
                target="_blank"
              >
                Open Kiosk Mode →
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
    <div className="bg-bg-secondary rounded-lg p-4 border border-border flex items-center justify-between gap-4">
      <div className="min-w-0">
        <h3 className="font-semibold text-text-primary">{place.label}</h3>
        <div className="text-sm text-text-muted mt-1 font-mono truncate">
          JP: {place.journeyPlannerLocationId}
          {place.transportSiteId && ` | Site: ${place.transportSiteId}`}
        </div>
        <div className="text-xs text-text-muted mt-0.5">
          Prep: {Math.round(place.prepSeconds / 60)} min | Coords:{" "}
          {place.coord.lat.toFixed(4)}, {place.coord.lon.toFixed(4)}
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onEdit}
          className="px-3 py-1.5 text-sm bg-bg-tertiary border border-border rounded hover:bg-bg-primary"
        >
          Edit
        </button>
        <button
          onClick={onDelete}
          className="px-3 py-1.5 text-sm text-status-missed border border-status-missed/30 rounded hover:bg-status-missed/10"
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
    <div className="bg-bg-secondary rounded-lg p-4 border border-border flex items-center justify-between gap-4">
      <div className="min-w-0">
        <h3 className="font-semibold text-text-primary">{commute.label}</h3>
        <div className="text-sm text-text-muted mt-1">
          {originLabel} → {destinationLabel}
        </div>
        <div className="text-xs text-text-muted mt-0.5">
          Buffer: {Math.round(commute.bufferSeconds / 60)} min | Trips:{" "}
          {commute.maxTrips}
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onEdit}
          className="px-3 py-1.5 text-sm bg-bg-tertiary border border-border rounded hover:bg-bg-primary"
        >
          Edit
        </button>
        <button
          onClick={onDelete}
          className="px-3 py-1.5 text-sm text-status-missed border border-status-missed/30 rounded hover:bg-status-missed/10"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

