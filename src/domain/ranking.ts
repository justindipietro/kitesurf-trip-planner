import type {
  DestinationWithData,
  RankedDestination,
  TravelMode,
} from "../types";

/**
 * Removes destinations with average wind speed below the threshold.
 */
export function filterByWind(
  destinations: DestinationWithData[],
  threshold: number
): DestinationWithData[] {
  return destinations.filter(
    (d) => d.averageWindSpeedKnots >= threshold
  );
}

/**
 * In Drive_Mode, removes destinations where driving duration exceeds maxDriveHours.
 * In Flight_Mode, removes destinations with no flights or shortest flight exceeding maxFlightHours.
 */
export function filterByTravel(
  destinations: DestinationWithData[],
  mode: TravelMode,
  maxDriveHours?: number,
  maxFlightHours?: number
): DestinationWithData[] {
  return destinations.filter((d) => {
    if (mode === "drive") {
      if (d.travelDetail.type !== "drive") return false;
      if (maxDriveHours === undefined) return true;
      const maxMinutes = maxDriveHours * 60;
      return d.travelDetail.durationMinutes <= maxMinutes;
    }
    // flight mode
    if (d.travelDetail.type !== "flight") return false;
    if (d.travelDetail.availableFlights === 0) return false;
    if (maxFlightHours !== undefined) {
      const maxMinutes = maxFlightHours * 60;
      return d.travelDetail.shortestFlightMinutes <= maxMinutes;
    }
    return true;
  });
}

/**
 * Returns the travel time used for tie-breaking:
 * - drive: durationMinutes
 * - flight: shortestFlightMinutes
 */
function getTravelTime(d: DestinationWithData): number {
  if (d.travelDetail.type === "drive") {
    return d.travelDetail.durationMinutes;
  }
  return d.travelDetail.shortestFlightMinutes;
}

/**
 * Sorts destinations by average wind speed descending, ties broken by travel time ascending.
 * Maps to RankedDestination with rank starting at 1.
 */
export function rankDestinations(
  destinations: DestinationWithData[]
): RankedDestination[] {
  const sorted = [...destinations].sort((a, b) => {
    const windDiff = b.averageWindSpeedKnots - a.averageWindSpeedKnots;
    if (windDiff !== 0) return windDiff;
    return getTravelTime(a) - getTravelTime(b);
  });

  return sorted.map((d, i) => ({
    rank: i + 1,
    locationName: d.location.name,
    averageWindSpeedKnots: d.averageWindSpeedKnots,
    travelDetail: d.travelDetail,
    dailyWindKnots: d.dailyWindKnots,
    location: d.location,
    averageAirTempF: d.averageAirTempF,
    averageWaterTempF: d.averageWaterTempF,
  }));
}
