import type { SearchSettings, ValidationResult } from "../types";
import { LOCATION_CATALOG } from "../data/locations";

/**
 * Set of known origins for validation (case-insensitive).
 * Includes location catalog names/airport codes and common US cities/airports.
 */
const KNOWN_ORIGINS: Set<string> = buildKnownOrigins();

function buildKnownOrigins(): Set<string> {
  const origins = new Set<string>();

  // Add location catalog names and airport codes
  for (const loc of LOCATION_CATALOG) {
    origins.add(loc.name.toLowerCase());
    origins.add(loc.airportCode.toLowerCase());
  }

  // Common US cities and their airport codes
  const usCities: [string, string][] = [
    ["New York", "JFK"],
    ["Los Angeles", "LAX"],
    ["Chicago", "ORD"],
    ["Miami", "MIA"],
    ["Dallas", "DFW"],
    ["Houston", "IAH"],
    ["Atlanta", "ATL"],
    ["Denver", "DEN"],
    ["Seattle", "SEA"],
    ["San Francisco", "SFO"],
    ["Boston", "BOS"],
    ["Washington DC", "DCA"],
    ["Orlando", "MCO"],
    ["Phoenix", "PHX"],
    ["Las Vegas", "LAS"],
  ];

  for (const [city, code] of usCities) {
    origins.add(city.toLowerCase());
    origins.add(code.toLowerCase());
  }

  // Common aliases
  const aliases: [string, string][] = [
    ["NYC", "New York"],
    ["LA", "Los Angeles"],
    ["SF", "San Francisco"],
    ["DC", "Washington DC"],
    ["NOLA", "New Orleans"],
    ["PHI", "Philadelphia"],
    ["SD", "San Diego"],
    ["EWR", "Newark"],
    ["LGA", "LaGuardia"],
    ["Newark", "Newark"],
    ["LaGuardia", "LaGuardia"],
  ];

  for (const [alias] of aliases) {
    origins.add(alias.toLowerCase());
  }

  return origins;
}

/**
 * Validates that the origin resolves to a known city or airport.
 * Case-insensitive matching.
 */
export function validateOrigin(origin: string): boolean {
  if (!origin || origin.trim().length === 0) {
    return false;
  }
  return KNOWN_ORIGINS.has(origin.trim().toLowerCase());
}

/**
 * Validates that drive duration is an integer in [1, 24].
 */
export function validateDriveDuration(hours: number): boolean {
  return Number.isInteger(hours) && hours >= 1 && hours <= 24;
}

/**
 * Validates that flight duration is an integer in [1, 24].
 */
export function validateFlightDuration(hours: number): boolean {
  return Number.isInteger(hours) && hours >= 1 && hours <= 24;
}

/**
 * Validates that wind threshold is an integer in [5, 50].
 */
export function validateWindThreshold(knots: number): boolean {
  return Number.isInteger(knots) && knots >= 5 && knots <= 50;
}

/**
 * Validates a date range for the search.
 * - start must be today or later
 * - end must be on or after start
 * - both must be provided
 * - range must not exceed 16 days
 */
export function validateDateRange(
  startDate: Date,
  endDate: Date
): ValidationResult {
  const errors: Record<string, string> = {};

  if (!startDate || !(startDate instanceof Date) || isNaN(startDate.getTime())) {
    errors.startDate = "Start date is required";
  }

  if (!endDate || !(endDate instanceof Date) || isNaN(endDate.getTime())) {
    errors.endDate = "End date is required";
  }

  // If either date is invalid, return early
  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  // Normalize dates to start of day for comparison
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  if (start < today) {
    errors.startDate = "Start date must be today or later";
  }

  if (end < start) {
    errors.endDate = "End date must be on or after start date";
  }

  // Check range does not exceed 16 days
  const diffMs = end.getTime() - start.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays > 16) {
    errors.dateRange =
      "Date range exceeds Open-Meteo 16-day forecast limit";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Orchestrates all validations for search settings.
 * Returns aggregated errors from all validators.
 */
export function validateSearchSettings(
  settings: SearchSettings
): ValidationResult {
  const errors: Record<string, string> = {};

  // Validate origin
  if (!validateOrigin(settings.origin)) {
    errors.origin = "Origin not recognized";
  }

  // Validate wind threshold
  if (!validateWindThreshold(settings.windThresholdKnots)) {
    errors.windThresholdKnots =
      "Wind threshold must be a whole number between 5 and 50 knots";
  }

  // Validate mode-specific options
  if (settings.travelMode === "drive") {
    if (
      settings.maxDriveHours !== undefined &&
      !validateDriveDuration(settings.maxDriveHours)
    ) {
      errors.maxDriveHours =
        "Drive duration must be a whole number between 1 and 24 hours";
    }
  }

  if (settings.travelMode === "flight") {
    if (
      settings.maxFlightHours !== undefined &&
      !validateFlightDuration(settings.maxFlightHours)
    ) {
      errors.maxFlightHours =
        "Flight duration must be a whole number between 1 and 24 hours";
    }
  }

  // Validate date range
  const dateResult = validateDateRange(settings.startDate, settings.endDate);
  if (!dateResult.valid) {
    Object.assign(errors, dateResult.errors);
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
