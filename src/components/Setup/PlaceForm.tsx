/**
 * PlaceForm Component
 * Form for creating/editing a place
 */

import { useState, useEffect } from "react";
import type { Place } from "../../types";
import { searchStopsAndAddresses } from "../../api/journeyPlanner";
import type { StopFinderResult } from "../../api/journeyPlanner";
import { searchSites } from "../../api/transport";
import type { TransportSite } from "../../api/transport";

// =============================================================================
// Types
// =============================================================================

interface PlaceFormProps {
  /** Existing place to edit (or undefined for new) */
  place?: Place;
  /** Callback when form is submitted */
  onSubmit: (place: Omit<Place, "id"> | Place) => void;
  /** Callback when form is cancelled */
  onCancel: () => void;
}

// =============================================================================
// Component
// =============================================================================

export function PlaceForm({ place, onSubmit, onCancel }: PlaceFormProps) {
  // Form state
  const [label, setLabel] = useState(place?.label || "");
  const [journeyPlannerLocationId, setJourneyPlannerLocationId] = useState(
    place?.journeyPlannerLocationId || ""
  );
  const [transportSiteId, setTransportSiteId] = useState(
    place?.transportSiteId || ""
  );
  const [lat, setLat] = useState(place?.coord.lat?.toString() || "");
  const [lon, setLon] = useState(place?.coord.lon?.toString() || "");
  const [prepSeconds, setPrepSeconds] = useState(
    (place?.prepSeconds || 120).toString()
  );

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<StopFinderResult[]>([]);
  const [siteResults, setSiteResults] = useState<TransportSite[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  // Search for stops AND addresses
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      setSiteResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        // Search stops+addresses and transport sites in parallel
        const [stopsResult, sites] = await Promise.all([
          searchStopsAndAddresses(searchQuery),
          searchSites(searchQuery),
        ]);

        if (stopsResult.success) {
          setSearchResults(stopsResult.data);
        } else if (stopsResult.cachedData) {
          setSearchResults(stopsResult.cachedData);
        }
        setSiteResults(sites);
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handle stop/address selection
  const handleSelectStop = (stop: StopFinderResult) => {
    // Extract label intelligently:
    // "Stockholm, T-Centralen" -> "T-Centralen"
    // "Stockholm, Karlbergsvägen 14" -> "Karlbergsvägen 14"
    // "Odenplan" -> "Odenplan"
    const parts = stop.label.split(",").map((p) => p.trim());
    const extractedLabel = parts.length > 1 ? parts[1] : parts[0];
    
    setLabel(extractedLabel);
    setLat(stop.coord.lat.toString());
    setLon(stop.coord.lon.toString());

    if (stop.type === "stop") {
      // For transit stops, set the Journey Planner ID
      setJourneyPlannerLocationId(stop.id);
      
      // Try to find matching transport site
      const matchingSite = siteResults.find(
        (s) =>
          s.name.toLowerCase().includes(extractedLabel.toLowerCase()) ||
          extractedLabel.toLowerCase().includes(s.name.toLowerCase())
      );
      if (matchingSite) {
        setTransportSiteId(matchingSite.id);
      }
    } else {
      // For addresses (home), DON'T set Journey Planner ID
      // This enables coordinate-based trip planning which includes walk/bus access legs
      setJourneyPlannerLocationId("");
      setTransportSiteId("");
    }

    setShowSearch(false);
    setSearchQuery("");
  };

  // Handle site selection
  const handleSelectSite = (site: TransportSite) => {
    setTransportSiteId(site.id);
    if (!label) {
      setLabel(site.name);
    }
    if (site.coord) {
      setLat(site.coord.lat.toString());
      setLon(site.coord.lon.toString());
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const placeData: Omit<Place, "id"> = {
      label: label.trim(),
      coord: {
        lat: parseFloat(lat) || 0,
        lon: parseFloat(lon) || 0,
      },
      // Optional: allow coordinate-only places (e.g., Home) so JP can include access legs
      journeyPlannerLocationId: journeyPlannerLocationId.trim() || undefined,
      transportSiteId: transportSiteId.trim() || undefined,
      prepSeconds: parseInt(prepSeconds, 10) || 120,
    };

    if (place?.id) {
      onSubmit({ ...placeData, id: place.id });
    } else {
      onSubmit(placeData);
    }
  };

  // For coordinate-origin planning, Journey Planner ID is optional.
  // Coordinates are required for all places.
  const isValid = Boolean(label.trim() && lat && lon);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Search section */}
      <div className="bg-bg-tertiary rounded-lg p-4">
        <label className="block text-sm font-semibold text-text-primary mb-2">
          Search for a stop or address
        </label>
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearch(true);
            }}
            onFocus={() => setShowSearch(true)}
            placeholder="Station (Odenplan) or address (Kungsgatan 1 Stockholm)"
            className="w-full px-3 py-2 bg-bg-primary border border-border rounded focus:outline-none focus:border-accent"
          />
          {isSearching && (
            <span className="absolute right-3 top-2.5 text-text-muted">
              Searching...
            </span>
          )}
        </div>

        {/* Search results */}
        {showSearch && (searchResults.length > 0 || siteResults.length > 0) && (
          <div className="mt-2 max-h-60 overflow-y-auto bg-bg-primary border border-border rounded divide-y divide-border">
            {searchResults.map((result) => (
              <button
                key={result.id}
                type="button"
                onClick={() => handleSelectStop(result)}
                className="w-full px-3 py-2 text-left hover:bg-bg-secondary"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg" title={result.type === "address" ? "Address" : "Transit stop"}>
                    {result.type === "address" ? "🏠" : "🚇"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{result.label}</div>
                    <div className="text-xs text-text-muted truncate">
                      {result.type === "address" ? "Address (coordinates only)" : `Stop ID: ${result.id.slice(0, 20)}...`}
                    </div>
                  </div>
                </div>
              </button>
            ))}
            {searchResults.length === 0 && siteResults.length > 0 && (
              <div className="px-3 py-2 text-sm text-text-muted">
                Transport sites:
              </div>
            )}
            {searchResults.length === 0 &&
              siteResults.map((site) => (
                <button
                  key={site.id}
                  type="button"
                  onClick={() => handleSelectSite(site)}
                  className="w-full px-3 py-2 text-left hover:bg-bg-secondary"
                >
                  <div className="font-medium">{site.name}</div>
                  <div className="text-xs text-text-muted">
                    Site ID: {site.id}
                  </div>
                </button>
              ))}
          </div>
        )}
      </div>

      {/* Label */}
      <div>
        <label className="block text-sm font-semibold text-text-primary mb-1">
          Label *
        </label>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g., Home, Work, T-Centralen"
          className="w-full px-3 py-2 bg-bg-secondary border border-border rounded focus:outline-none focus:border-accent"
          required
        />
      </div>

      {/* Journey Planner ID */}
      <div>
        <label className="block text-sm font-semibold text-text-primary mb-1">
          Journey Planner Location ID (optional)
        </label>
        <input
          type="text"
          value={journeyPlannerLocationId}
          onChange={(e) => setJourneyPlannerLocationId(e.target.value)}
          placeholder="e.g., 9091001000009182"
          className="w-full px-3 py-2 bg-bg-secondary border border-border rounded focus:outline-none focus:border-accent font-mono text-sm"
        />
        <p className="text-xs text-text-muted mt-1">
          If set, trip planning starts from this stop. If empty, trip planning starts from your coordinates (best for “Home”).
        </p>
      </div>

      {/* Transport Site ID */}
      <div>
        <label className="block text-sm font-semibold text-text-primary mb-1">
          Transport Site ID (optional)
        </label>
        <input
          type="text"
          value={transportSiteId}
          onChange={(e) => setTransportSiteId(e.target.value)}
          placeholder="e.g., 9192"
          className="w-full px-3 py-2 bg-bg-secondary border border-border rounded focus:outline-none focus:border-accent font-mono text-sm"
        />
        <p className="text-xs text-text-muted mt-1">
          Used for departure boards. Usually a 4-5 digit number.
        </p>
      </div>

      {/* Coordinates */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-text-primary mb-1">
            Latitude *
          </label>
          <input
            type="text"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            placeholder="59.3293"
            className="w-full px-3 py-2 bg-bg-secondary border border-border rounded focus:outline-none focus:border-accent font-mono text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-text-primary mb-1">
            Longitude *
          </label>
          <input
            type="text"
            value={lon}
            onChange={(e) => setLon(e.target.value)}
            placeholder="18.0686"
            className="w-full px-3 py-2 bg-bg-secondary border border-border rounded focus:outline-none focus:border-accent font-mono text-sm"
            required
          />
        </div>
      </div>

      {/* Prep time */}
      <div>
        <label className="block text-sm font-semibold text-text-primary mb-1">
          Prep time (seconds)
        </label>
        <input
          type="number"
          value={prepSeconds}
          onChange={(e) => setPrepSeconds(e.target.value)}
          min="0"
          max="3600"
          step="30"
          className="w-full px-3 py-2 bg-bg-secondary border border-border rounded focus:outline-none focus:border-accent"
        />
        <p className="text-xs text-text-muted mt-1">
          Time to get ready before leaving (default: 2 minutes)
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={!isValid}
          className="flex-1 px-4 py-2 bg-accent text-white rounded font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {place ? "Save Changes" : "Add Place"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-bg-secondary border border-border rounded hover:bg-bg-tertiary"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

