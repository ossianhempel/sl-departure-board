/**
 * Configuration storage layer
 * Handles persistence of places, commutes, and settings to localStorage
 */

import type { AppConfig, Place, Commute, AppSettings } from "../types";
import { DEFAULT_CONFIG } from "../types";

// =============================================================================
// Constants
// =============================================================================

const STORAGE_KEY = "sl-commute-config";
const CURRENT_VERSION = 1;

// =============================================================================
// Core Storage Functions
// =============================================================================

/**
 * Load configuration from localStorage
 * Returns default config if none exists or if parsing fails
 */
export function loadConfig(): AppConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      console.log("[Config] No stored config found, using defaults");
      return { ...DEFAULT_CONFIG };
    }

    const parsed = JSON.parse(stored) as AppConfig;

    // Validate and migrate if needed
    const migrated = migrateConfig(parsed);

    return migrated;
  } catch (error) {
    console.error("[Config] Failed to load config:", error);
    return { ...DEFAULT_CONFIG };
  }
}

/**
 * Save configuration to localStorage
 */
export function saveConfig(config: AppConfig): void {
  try {
    const serialized = JSON.stringify(config);
    localStorage.setItem(STORAGE_KEY, serialized);
    console.log("[Config] Saved config");
  } catch (error) {
    console.error("[Config] Failed to save config:", error);
    throw new Error("Failed to save configuration");
  }
}

/**
 * Clear all stored configuration
 */
export function clearConfig(): void {
  localStorage.removeItem(STORAGE_KEY);
  console.log("[Config] Cleared config");
}

// =============================================================================
// Export / Import
// =============================================================================

/**
 * Export configuration as a JSON string
 * Suitable for backup or sharing
 */
export function exportConfigJSON(): string {
  const config = loadConfig();
  return JSON.stringify(config, null, 2);
}

/**
 * Import configuration from a JSON string
 * Validates the structure before saving
 * @returns The imported config
 * @throws Error if the JSON is invalid or malformed
 */
export function importConfigJSON(json: string): AppConfig {
  try {
    const parsed = JSON.parse(json);

    // Validate basic structure
    if (!validateConfigStructure(parsed)) {
      throw new Error("Invalid configuration structure");
    }

    // Migrate if needed
    const migrated = migrateConfig(parsed);

    // Save the imported config
    saveConfig(migrated);

    return migrated;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error("Invalid JSON format");
    }
    throw error;
  }
}

// =============================================================================
// Place Management
// =============================================================================

/**
 * Add a new place to the configuration
 */
export function addPlace(place: Place): void {
  const config = loadConfig();

  // Check for duplicate ID
  if (config.places.some((p) => p.id === place.id)) {
    throw new Error(`Place with ID "${place.id}" already exists`);
  }

  config.places.push(place);
  saveConfig(config);
}

/**
 * Update an existing place
 */
export function updatePlace(place: Place): void {
  const config = loadConfig();
  const index = config.places.findIndex((p) => p.id === place.id);

  if (index === -1) {
    throw new Error(`Place with ID "${place.id}" not found`);
  }

  config.places[index] = place;
  saveConfig(config);
}

/**
 * Delete a place by ID
 * Also removes any commutes that reference this place
 */
export function deletePlace(placeId: string): void {
  const config = loadConfig();

  // Remove the place
  config.places = config.places.filter((p) => p.id !== placeId);

  // Remove commutes that use this place
  config.commutes = config.commutes.filter(
    (c) => c.originPlaceId !== placeId && c.destinationPlaceId !== placeId
  );

  saveConfig(config);
}

/**
 * Get a place by ID
 */
export function getPlace(placeId: string): Place | undefined {
  const config = loadConfig();
  return config.places.find((p) => p.id === placeId);
}

// =============================================================================
// Commute Management
// =============================================================================

/**
 * Add a new commute to the configuration
 */
export function addCommute(commute: Commute): void {
  const config = loadConfig();

  // Check for duplicate ID
  if (config.commutes.some((c) => c.id === commute.id)) {
    throw new Error(`Commute with ID "${commute.id}" already exists`);
  }

  // Validate that places exist
  if (!config.places.some((p) => p.id === commute.originPlaceId)) {
    throw new Error(`Origin place "${commute.originPlaceId}" not found`);
  }
  if (!config.places.some((p) => p.id === commute.destinationPlaceId)) {
    throw new Error(`Destination place "${commute.destinationPlaceId}" not found`);
  }

  config.commutes.push(commute);
  saveConfig(config);
}

/**
 * Update an existing commute
 */
export function updateCommute(commute: Commute): void {
  const config = loadConfig();
  const index = config.commutes.findIndex((c) => c.id === commute.id);

  if (index === -1) {
    throw new Error(`Commute with ID "${commute.id}" not found`);
  }

  config.commutes[index] = commute;
  saveConfig(config);
}

/**
 * Delete a commute by ID
 */
export function deleteCommute(commuteId: string): void {
  const config = loadConfig();
  config.commutes = config.commutes.filter((c) => c.id !== commuteId);
  saveConfig(config);
}

/**
 * Get a commute by ID
 */
export function getCommute(commuteId: string): Commute | undefined {
  const config = loadConfig();
  return config.commutes.find((c) => c.id === commuteId);
}

// =============================================================================
// Settings Management
// =============================================================================

/**
 * Update application settings
 */
export function updateSettings(settings: Partial<AppSettings>): void {
  const config = loadConfig();
  config.settings = { ...config.settings, ...settings };
  saveConfig(config);
}

/**
 * Get current settings
 */
export function getSettings(): AppSettings {
  const config = loadConfig();
  return config.settings;
}

// =============================================================================
// Validation
// =============================================================================

/**
 * Validate the basic structure of a config object
 */
function validateConfigStructure(obj: unknown): obj is AppConfig {
  if (!obj || typeof obj !== "object") {
    return false;
  }

  const config = obj as Record<string, unknown>;

  // Check required top-level properties
  if (!Array.isArray(config.places)) {
    return false;
  }
  if (!Array.isArray(config.commutes)) {
    return false;
  }
  if (!config.settings || typeof config.settings !== "object") {
    return false;
  }

  // Validate places
  for (const place of config.places) {
    if (!validatePlace(place)) {
      return false;
    }
  }

  // Validate commutes
  for (const commute of config.commutes) {
    if (!validateCommute(commute)) {
      return false;
    }
  }

  return true;
}

/**
 * Validate a place object
 */
function validatePlace(obj: unknown): obj is Place {
  if (!obj || typeof obj !== "object") {
    return false;
  }

  const place = obj as Record<string, unknown>;

  return (
    typeof place.id === "string" &&
    typeof place.label === "string" &&
    (place.journeyPlannerLocationId === undefined ||
      typeof place.journeyPlannerLocationId === "string") &&
    typeof place.prepSeconds === "number" &&
    place.coord !== null &&
    typeof place.coord === "object" &&
    typeof (place.coord as Record<string, unknown>).lat === "number" &&
    typeof (place.coord as Record<string, unknown>).lon === "number"
  );
}

/**
 * Validate a commute object
 */
function validateCommute(obj: unknown): obj is Commute {
  if (!obj || typeof obj !== "object") {
    return false;
  }

  const commute = obj as Record<string, unknown>;

  return (
    typeof commute.id === "string" &&
    typeof commute.label === "string" &&
    typeof commute.originPlaceId === "string" &&
    typeof commute.destinationPlaceId === "string" &&
    typeof commute.bufferSeconds === "number" &&
    typeof commute.maxTrips === "number"
  );
}

// =============================================================================
// Migration
// =============================================================================

/**
 * Migrate config from older versions to the current version
 */
function migrateConfig(config: AppConfig): AppConfig {
  let migrated = { ...config };

  // Ensure version exists
  if (!migrated.version) {
    migrated.version = 0;
  }

  // Apply migrations based on version
  // (Add migration logic here as the schema evolves)

  // Ensure all required fields exist with defaults
  migrated = {
    version: CURRENT_VERSION,
    places: migrated.places || [],
    commutes: migrated.commutes || [],
    settings: {
      ...DEFAULT_CONFIG.settings,
      ...migrated.settings,
    },
  };

  return migrated;
}

// =============================================================================
// ID Generation
// =============================================================================

/**
 * Generate a unique ID for a new place or commute
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

