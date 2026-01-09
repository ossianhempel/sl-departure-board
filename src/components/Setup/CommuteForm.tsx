/**
 * CommuteForm Component
 * Form for creating/editing a commute
 */

import { useState } from "react";
import type { Commute, Place, TransportModes } from "../../types";
import { DEFAULT_TRANSPORT_MODES } from "../../types";

// =============================================================================
// Types
// =============================================================================

interface CommuteFormProps {
  /** Existing commute to edit (or undefined for new) */
  commute?: Commute;
  /** Available places to choose from */
  places: Place[];
  /** Callback when form is submitted */
  onSubmit: (commute: Omit<Commute, "id"> | Commute) => void;
  /** Callback when form is cancelled */
  onCancel: () => void;
}

// =============================================================================
// Component
// =============================================================================

export function CommuteForm({
  commute,
  places,
  onSubmit,
  onCancel,
}: CommuteFormProps) {
  // Form state
  const [label, setLabel] = useState(commute?.label || "");
  const [originPlaceId, setOriginPlaceId] = useState(commute?.originPlaceId || "");
  const [destinationPlaceId, setDestinationPlaceId] = useState(
    commute?.destinationPlaceId || ""
  );
  const [modes, setModes] = useState<TransportModes>(
    commute?.modes || { ...DEFAULT_TRANSPORT_MODES }
  );
  const [bufferSeconds, setBufferSeconds] = useState(
    (commute?.bufferSeconds || 120).toString()
  );
  const [maxTrips, setMaxTrips] = useState((commute?.maxTrips || 3).toString());

  // Handle mode toggle
  const handleModeToggle = (mode: keyof TransportModes) => {
    setModes((prev) => ({ ...prev, [mode]: !prev[mode] }));
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Generate label if not provided
    const origin = places.find((p) => p.id === originPlaceId);
    const destination = places.find((p) => p.id === destinationPlaceId);
    const generatedLabel =
      label.trim() ||
      `${origin?.label || "Unknown"} → ${destination?.label || "Unknown"}`;

    const commuteData: Omit<Commute, "id"> = {
      label: generatedLabel,
      originPlaceId,
      destinationPlaceId,
      modes,
      bufferSeconds: parseInt(bufferSeconds, 10) || 120,
      maxTrips: parseInt(maxTrips, 10) || 3,
    };

    if (commute?.id) {
      onSubmit({ ...commuteData, id: commute.id });
    } else {
      onSubmit(commuteData);
    }
  };

  const isValid =
    originPlaceId &&
    destinationPlaceId &&
    originPlaceId !== destinationPlaceId;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Label */}
      <div>
        <label className="block text-sm font-semibold text-text-primary mb-1">
          Label (optional)
        </label>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g., Morning commute, Home to work"
          className="w-full px-3 py-2 bg-bg-secondary border border-border rounded focus:outline-none focus:border-accent"
        />
        <p className="text-xs text-text-muted mt-1">
          If empty, will be auto-generated from origin and destination
        </p>
      </div>

      {/* Origin */}
      <div>
        <label className="block text-sm font-semibold text-text-primary mb-1">
          Origin *
        </label>
        <select
          value={originPlaceId}
          onChange={(e) => setOriginPlaceId(e.target.value)}
          className="w-full px-3 py-2 bg-bg-secondary border border-border rounded focus:outline-none focus:border-accent"
          required
        >
          <option value="">Select origin...</option>
          {places.map((place) => (
            <option key={place.id} value={place.id}>
              {place.label}
            </option>
          ))}
        </select>
      </div>

      {/* Destination */}
      <div>
        <label className="block text-sm font-semibold text-text-primary mb-1">
          Destination *
        </label>
        <select
          value={destinationPlaceId}
          onChange={(e) => setDestinationPlaceId(e.target.value)}
          className="w-full px-3 py-2 bg-bg-secondary border border-border rounded focus:outline-none focus:border-accent"
          required
        >
          <option value="">Select destination...</option>
          {places
            .filter((p) => p.id !== originPlaceId)
            .map((place) => (
              <option key={place.id} value={place.id}>
                {place.label}
              </option>
            ))}
        </select>
      </div>

      {/* Transport modes */}
      <div>
        <label className="block text-sm font-semibold text-text-primary mb-2">
          Transport modes
        </label>
        <div className="flex flex-wrap gap-2">
          {(
            [
              { key: "metro", label: "🚇 Metro" },
              { key: "train", label: "🚆 Train" },
              { key: "tram", label: "🚊 Tram" },
              { key: "bus", label: "🚌 Bus" },
              { key: "ship", label: "⛴️ Ferry" },
            ] as { key: keyof TransportModes; label: string }[]
          ).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => handleModeToggle(key)}
              className={`
                px-3 py-1.5 rounded border text-sm
                ${
                  modes[key]
                    ? "bg-accent text-white border-accent"
                    : "bg-bg-secondary border-border text-text-secondary hover:bg-bg-tertiary"
                }
              `}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Buffer time */}
      <div>
        <label className="block text-sm font-semibold text-text-primary mb-1">
          Buffer time (seconds)
        </label>
        <input
          type="number"
          value={bufferSeconds}
          onChange={(e) => setBufferSeconds(e.target.value)}
          min="0"
          max="1800"
          step="30"
          className="w-full px-3 py-2 bg-bg-secondary border border-border rounded focus:outline-none focus:border-accent"
        />
        <p className="text-xs text-text-muted mt-1">
          Extra safety margin for this commute (default: 2 minutes)
        </p>
      </div>

      {/* Max trips */}
      <div>
        <label className="block text-sm font-semibold text-text-primary mb-1">
          Number of alternatives
        </label>
        <select
          value={maxTrips}
          onChange={(e) => setMaxTrips(e.target.value)}
          className="w-full px-3 py-2 bg-bg-secondary border border-border rounded focus:outline-none focus:border-accent"
        >
          <option value="1">1 trip</option>
          <option value="2">2 trips</option>
          <option value="3">3 trips</option>
          <option value="4">4 trips</option>
          <option value="5">5 trips</option>
        </select>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={!isValid}
          className="flex-1 px-4 py-2 bg-accent text-white rounded font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {commute ? "Save Changes" : "Add Commute"}
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

