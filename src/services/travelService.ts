import type { Location, DriveData, FlightData, Flight } from "../types";
import { LOCATION_CATALOG } from "../data/locations";

/**
 * Approximate coordinates for known origin locations.
 * Includes all catalog locations and common US cities.
 */
const ORIGIN_COORDINATES: Record<string, { lat: number; lon: number }> =
  buildOriginCoordinates();

function buildOriginCoordinates(): Record<
  string,
  { lat: number; lon: number }
> {
  const coords: Record<string, { lat: number; lon: number }> = {};

  // Add catalog locations by name and airport code
  for (const loc of LOCATION_CATALOG) {
    coords[loc.name.toLowerCase()] = {
      lat: loc.latitude,
      lon: loc.longitude,
    };
    coords[loc.airportCode.toLowerCase()] = {
      lat: loc.latitude,
      lon: loc.longitude,
    };
  }

  // Common US cities with approximate coordinates
  const usCities: [string, string, number, number][] = [
    ["New York", "JFK", 40.6413, -73.7781],
    ["Los Angeles", "LAX", 33.9425, -118.4081],
    ["Chicago", "ORD", 41.9742, -87.9073],
    ["Miami", "MIA", 25.7959, -80.287],
    ["Dallas", "DFW", 32.8998, -97.0403],
    ["Houston", "IAH", 29.9902, -95.3368],
    ["Atlanta", "ATL", 33.6407, -84.4277],
    ["Denver", "DEN", 39.8561, -104.6737],
    ["Seattle", "SEA", 47.4502, -122.3088],
    ["San Francisco", "SFO", 37.6213, -122.379],
    ["Boston", "BOS", 42.3656, -71.0096],
    ["Washington DC", "DCA", 38.8512, -77.0402],
    ["Orlando", "MCO", 28.4312, -81.308],
    ["Phoenix", "PHX", 33.4373, -112.0078],
    ["Las Vegas", "LAS", 36.084, -115.1537],
  ];

  for (const [city, code, lat, lon] of usCities) {
    coords[city.toLowerCase()] = { lat, lon };
    coords[code.toLowerCase()] = { lat, lon };
  }

  // Common aliases
  coords["nyc"] = coords["new york"];
  coords["la"] = coords["los angeles"];
  coords["sf"] = coords["san francisco"];
  coords["dc"] = coords["washington dc"];

  // NYC area airports
  coords["ewr"] = { lat: 40.6895, lon: -74.1745 }; // Newark Liberty
  coords["newark"] = coords["ewr"];
  coords["lga"] = { lat: 40.7769, lon: -73.874 };   // LaGuardia
  coords["laguardia"] = coords["lga"];

  return coords;
}

/**
 * Haversine formula: calculates the great-circle distance in km
 * between two points on Earth given their latitude/longitude in degrees.
 */
export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Filters flights to only those where isDirect is true.
 */
export function filterDirectFlights(flights: Flight[]): Flight[] {
  return flights.filter((f) => f.isDirect);
}

/**
 * Sorts flights with Delta airline first, preserving relative order within groups.
 */
export function sortFlightsByDeltaPreference(flights: Flight[]): Flight[] {
  const delta: Flight[] = [];
  const others: Flight[] = [];
  for (const f of flights) {
    if (f.airline === "Delta") {
      delta.push(f);
    } else {
      others.push(f);
    }
  }
  return [...delta, ...others];
}

const AIRLINES = ["Delta", "United", "American", "JetBlue", "Southwest"];

/**
 * Simple seeded pseudo-random number generator for deterministic flight generation.
 * Uses a hash of the location name to produce consistent results per destination.
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/**
 * Fetches simulated driving data from origin to each location.
 * Uses Haversine distance and estimates driving time at ~80 km/h average speed.
 * Excludes locations where the origin cannot be resolved to coordinates.
 */
export async function fetchDriveData(
  origin: string,
  locations: Location[]
): Promise<DriveData[]> {
  const originKey = origin.trim().toLowerCase();
  const originCoords = ORIGIN_COORDINATES[originKey];

  if (!originCoords) {
    return [];
  }

  const results: DriveData[] = [];

  for (const loc of locations) {
    const distanceKm = haversineDistanceKm(
      originCoords.lat,
      originCoords.lon,
      loc.latitude,
      loc.longitude
    );
    // Estimate driving time at 80 km/h average speed
    const durationMinutes = Math.round((distanceKm / 80) * 60);

    results.push({
      locationName: loc.name,
      durationMinutes,
    });
  }

  return results;
}

/**
 * Fetches simulated flight data from origin to each location.
 * Generates mock flights based on distance, with filtering and sorting options.
 * Excludes locations with no flights after filtering.
 */
export async function fetchFlightData(
  origin: string,
  locations: Location[],
  _startDate: Date,
  _endDate: Date,
  directOnly: boolean,
  preferDelta: boolean
): Promise<FlightData[]> {
  const originKey = origin.trim().toLowerCase();
  const originCoords = ORIGIN_COORDINATES[originKey];

  if (!originCoords) {
    return [];
  }

  const results: FlightData[] = [];

  for (const loc of locations) {
    const distanceKm = haversineDistanceKm(
      originCoords.lat,
      originCoords.lon,
      loc.latitude,
      loc.longitude
    );

    // Flight duration based on distance at ~800 km/h
    const baseDurationMinutes = Math.round((distanceKm / 800) * 60);

    // Generate 1-5 flights deterministically based on location name
    const seed = simpleHash(loc.name);
    const flightCount = (seed % 5) + 1;

    let flights: Flight[] = [];
    for (let i = 0; i < flightCount; i++) {
      const airlineIndex = (seed + i) % AIRLINES.length;
      const isDirect = (seed + i) % 3 !== 0; // ~2/3 direct
      const durationVariation = Math.round(baseDurationMinutes * (1 + (((seed + i) % 10) / 20)));

      // Generate price based on distance, directness, and airline
      const basePrice = Math.round(150 + (distanceKm / 20));
      const directMultiplier = isDirect ? 1 : 0.75;
      const airlineMultiplier = [1.1, 1.0, 1.05, 0.85, 0.8][airlineIndex]; // Delta, United, American, JetBlue, Southwest
      const variation = 1 + (((seed + i * 7) % 20) - 10) / 100; // ±10%
      const priceUsd = Math.round(basePrice * directMultiplier * airlineMultiplier * variation);

      flights.push({
        airline: AIRLINES[airlineIndex],
        durationMinutes: Math.max(durationVariation, 30), // minimum 30 min
        isDirect,
        priceUsd: Math.max(priceUsd, 89), // minimum $89
      });
    }

    // Apply direct-only filter
    if (directOnly) {
      flights = filterDirectFlights(flights);
    }

    // Apply Delta preference sorting
    if (preferDelta) {
      flights = sortFlightsByDeltaPreference(flights);
    }

    // Exclude locations with no flights after filtering
    if (flights.length > 0) {
      results.push({
        locationName: loc.name,
        flights,
      });
    }
  }

  return results;
}
