/**
 * React hook for configuration management
 * Provides reactive access to places, commutes, and settings
 */

import { useState, useEffect, useCallback } from "react";
import type {
  AppConfig,
  Place,
  Commute,
  AppSettings,
} from "../types";
import { DEFAULT_TRANSPORT_MODES } from "../types";
import {
  loadConfig,
  addPlace as storageAddPlace,
  updatePlace as storageUpdatePlace,
  deletePlace as storageDeletePlace,
  addCommute as storageAddCommute,
  updateCommute as storageUpdateCommute,
  deleteCommute as storageDeleteCommute,
  updateSettings as storageUpdateSettings,
  exportConfigJSON,
  importConfigJSON,
  generateId,
} from "../store/config";

// =============================================================================
// Hook
// =============================================================================

export interface UseConfigResult {
  /** Current configuration */
  config: AppConfig;
  /** Loading state */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;

  // Place operations
  places: Place[];
  addPlace: (place: Omit<Place, "id">) => void;
  updatePlace: (place: Place) => void;
  deletePlace: (placeId: string) => void;
  getPlaceById: (placeId: string) => Place | undefined;

  // Commute operations
  commutes: Commute[];
  addCommute: (commute: Omit<Commute, "id">) => void;
  updateCommute: (commute: Commute) => void;
  deleteCommute: (commuteId: string) => void;
  getCommuteById: (commuteId: string) => Commute | undefined;

  // Settings operations
  settings: AppSettings;
  updateSettings: (settings: Partial<AppSettings>) => void;

  // Export/Import
  exportConfig: () => string;
  importConfig: (json: string) => void;

  // Refresh
  refresh: () => void;
}

/**
 * Hook for managing application configuration
 */
export function useConfig(): UseConfigResult {
  const [config, setConfig] = useState<AppConfig>(() => loadConfig());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reload config from storage
  const refresh = useCallback(() => {
    setConfig(loadConfig());
    setError(null);
  }, []);

  // Listen for storage changes (from other tabs)
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === "sl-commute-config") {
        refresh();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [refresh]);

  // ==========================================================================
  // Place Operations
  // ==========================================================================

  const addPlace = useCallback((placeData: Omit<Place, "id">) => {
    try {
      const place: Place = {
        ...placeData,
        id: generateId(),
      };
      storageAddPlace(place);
      setConfig(loadConfig());
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to add place";
      setError(message);
      throw err;
    }
  }, []);

  const updatePlace = useCallback((place: Place) => {
    try {
      storageUpdatePlace(place);
      setConfig(loadConfig());
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update place";
      setError(message);
      throw err;
    }
  }, []);

  const deletePlace = useCallback((placeId: string) => {
    try {
      storageDeletePlace(placeId);
      setConfig(loadConfig());
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete place";
      setError(message);
      throw err;
    }
  }, []);

  const getPlaceById = useCallback(
    (placeId: string) => config.places.find((p) => p.id === placeId),
    [config.places]
  );

  // ==========================================================================
  // Commute Operations
  // ==========================================================================

  const addCommute = useCallback((commuteData: Omit<Commute, "id">) => {
    try {
      const commute: Commute = {
        ...commuteData,
        id: generateId(),
      };
      storageAddCommute(commute);
      setConfig(loadConfig());
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to add commute";
      setError(message);
      throw err;
    }
  }, []);

  const updateCommute = useCallback((commute: Commute) => {
    try {
      storageUpdateCommute(commute);
      setConfig(loadConfig());
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update commute";
      setError(message);
      throw err;
    }
  }, []);

  const deleteCommute = useCallback((commuteId: string) => {
    try {
      storageDeleteCommute(commuteId);
      setConfig(loadConfig());
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete commute";
      setError(message);
      throw err;
    }
  }, []);

  const getCommuteById = useCallback(
    (commuteId: string) => config.commutes.find((c) => c.id === commuteId),
    [config.commutes]
  );

  // ==========================================================================
  // Settings Operations
  // ==========================================================================

  const updateSettings = useCallback((settings: Partial<AppSettings>) => {
    try {
      storageUpdateSettings(settings);
      setConfig(loadConfig());
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update settings";
      setError(message);
      throw err;
    }
  }, []);

  // ==========================================================================
  // Export/Import
  // ==========================================================================

  const exportConfig = useCallback(() => {
    return exportConfigJSON();
  }, []);

  const importConfig = useCallback((json: string) => {
    setIsLoading(true);
    try {
      importConfigJSON(json);
      setConfig(loadConfig());
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to import config";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    config,
    isLoading,
    error,

    places: config.places,
    addPlace,
    updatePlace,
    deletePlace,
    getPlaceById,

    commutes: config.commutes,
    addCommute,
    updateCommute,
    deleteCommute,
    getCommuteById,

    settings: config.settings,
    updateSettings,

    exportConfig,
    importConfig,

    refresh,
  };
}

// =============================================================================
// Helper: Create default place
// =============================================================================

export function createDefaultPlace(): Omit<Place, "id"> {
  return {
    label: "",
    coord: { lat: 59.3293, lon: 18.0686 }, // Stockholm default
    journeyPlannerLocationId: "",
    transportSiteId: undefined,
    prepSeconds: 120, // 2 minutes default prep time
  };
}

// =============================================================================
// Helper: Create default commute
// =============================================================================

export function createDefaultCommute(
  originPlaceId: string,
  destinationPlaceId: string
): Omit<Commute, "id"> {
  return {
    label: "",
    originPlaceId,
    destinationPlaceId,
    modes: { ...DEFAULT_TRANSPORT_MODES },
    bufferSeconds: 120, // 2 minutes buffer
    maxTrips: 3,
  };
}

