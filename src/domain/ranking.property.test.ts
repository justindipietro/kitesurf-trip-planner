import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { filterByWind, filterByTravel, rankDestinations } from "./ranking";
import type { DestinationWithData, DriveDetail, FlightDetail } from "../types";

// Feature: kitesurf-trip-planner, Property 9: Wind threshold filtering invariant

/**
 * **Validates: Requirements 8.5**
 *
 * For any list of destinations with wind data and for any wind threshold value,
 * every destination in the filtered result has an average wind speed greater than
 * or equal to the threshold.
 */

/** Arbitrary for a DriveDetail */
const driveDetailArb: fc.Arbitrary<DriveDetail> = fc.record({
  type: fc.constant("drive" as const),
  durationMinutes: fc.integer({ min: 1, max: 1440 }),
});

/** Arbitrary for a FlightDetail */
const flightDetailArb: fc.Arbitrary<FlightDetail> = fc.record({
  type: fc.constant("flight" as const),
  availableFlights: fc.integer({ min: 0, max: 20 }),
  shortestFlightMinutes: fc.integer({ min: 30, max: 1200 }),
});

/** Arbitrary for a DestinationWithData with a given wind speed */
const destinationArb: fc.Arbitrary<DestinationWithData> = fc.record({
  location: fc.record({
    name: fc.string({ minLength: 1, maxLength: 20 }),
    latitude: fc.double({ min: -90, max: 90, noNaN: true, noDefaultInfinity: true }),
    longitude: fc.double({ min: -180, max: 180, noNaN: true, noDefaultInfinity: true }),
    airportCode: fc.string({ minLength: 3, maxLength: 4 }),
  }),
  averageWindSpeedKnots: fc.double({ min: 0, max: 60, noNaN: true, noDefaultInfinity: true }),
  travelDetail: fc.oneof(driveDetailArb, flightDetailArb),
});

describe("Property 9: Wind threshold filtering invariant", () => {
  it("every destination in the filtered result has wind speed >= threshold", () => {
    fc.assert(
      fc.property(
        fc.array(destinationArb, { minLength: 0, maxLength: 30 }),
        fc.double({ min: 0, max: 60, noNaN: true, noDefaultInfinity: true }),
        (destinations, threshold) => {
          const result = filterByWind(destinations, threshold);

          for (const dest of result) {
            expect(dest.averageWindSpeedKnots).toBeGreaterThanOrEqual(threshold);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("no destination meeting the threshold is excluded from the result", () => {
    fc.assert(
      fc.property(
        fc.array(destinationArb, { minLength: 0, maxLength: 30 }),
        fc.double({ min: 0, max: 60, noNaN: true, noDefaultInfinity: true }),
        (destinations, threshold) => {
          const result = filterByWind(destinations, threshold);

          const expectedCount = destinations.filter(
            (d) => d.averageWindSpeedKnots >= threshold
          ).length;

          expect(result).toHaveLength(expectedCount);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: kitesurf-trip-planner, Property 10: Drive duration filtering invariant

/**
 * **Validates: Requirements 9.2**
 *
 * For any list of destinations with drive data and for any maximum drive duration,
 * every destination in the filtered result has a driving duration less than or equal
 * to the maximum (maxDriveHours * 60 minutes).
 */

/** Arbitrary for a DestinationWithData that always has drive travel detail */
const driveDestinationArb: fc.Arbitrary<DestinationWithData> = fc.record({
  location: fc.record({
    name: fc.string({ minLength: 1, maxLength: 20 }),
    latitude: fc.double({ min: -90, max: 90, noNaN: true, noDefaultInfinity: true }),
    longitude: fc.double({ min: -180, max: 180, noNaN: true, noDefaultInfinity: true }),
    airportCode: fc.string({ minLength: 3, maxLength: 4 }),
  }),
  averageWindSpeedKnots: fc.double({ min: 0, max: 60, noNaN: true, noDefaultInfinity: true }),
  travelDetail: fc.record({
    type: fc.constant("drive" as const),
    durationMinutes: fc.integer({ min: 1, max: 1440 }),
  }),
});

describe("Property 10: Drive duration filtering invariant", () => {
  it("every destination in the filtered result has driving duration <= maxDriveHours * 60", () => {
    fc.assert(
      fc.property(
        fc.array(driveDestinationArb, { minLength: 0, maxLength: 30 }),
        fc.integer({ min: 1, max: 24 }),
        (destinations, maxDriveHours) => {
          const result = filterByTravel(destinations, "drive", maxDriveHours);
          const maxMinutes = maxDriveHours * 60;

          for (const dest of result) {
            expect(dest.travelDetail.type).toBe("drive");
            if (dest.travelDetail.type === "drive") {
              expect(dest.travelDetail.durationMinutes).toBeLessThanOrEqual(maxMinutes);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("no destination within the drive limit is excluded from the result", () => {
    fc.assert(
      fc.property(
        fc.array(driveDestinationArb, { minLength: 0, maxLength: 30 }),
        fc.integer({ min: 1, max: 24 }),
        (destinations, maxDriveHours) => {
          const result = filterByTravel(destinations, "drive", maxDriveHours);
          const maxMinutes = maxDriveHours * 60;

          const expectedCount = destinations.filter(
            (d) =>
              d.travelDetail.type === "drive" &&
              d.travelDetail.durationMinutes <= maxMinutes
          ).length;

          expect(result).toHaveLength(expectedCount);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: kitesurf-trip-planner, Property 14: Result sorting by wind speed then travel time

/**
 * **Validates: Requirements 10.1, 10.2**
 *
 * For any list of ranked destinations, each destination's average wind speed is
 * greater than or equal to the next destination's. When two adjacent destinations
 * have equal wind speed, the first has a travel time less than or equal to the second.
 */

describe("Property 14: Result sorting by wind speed then travel time", () => {
  it("results are sorted by wind speed descending, ties broken by travel time ascending", () => {
    fc.assert(
      fc.property(
        fc.array(destinationArb, { minLength: 0, maxLength: 30 }),
        (destinations) => {
          const ranked = rankDestinations(destinations);

          for (let i = 0; i < ranked.length - 1; i++) {
            const current = ranked[i];
            const next = ranked[i + 1];

            // Primary: wind speed descending
            expect(current.averageWindSpeedKnots).toBeGreaterThanOrEqual(
              next.averageWindSpeedKnots
            );

            // Secondary: when wind speeds are equal, travel time ascending
            if (current.averageWindSpeedKnots === next.averageWindSpeedKnots) {
              const currentTravelTime = getTravelTimeFromRanked(current);
              const nextTravelTime = getTravelTimeFromRanked(next);
              expect(currentTravelTime).toBeLessThanOrEqual(nextTravelTime);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

/** Helper: extract travel time from a RankedDestination */
function getTravelTimeFromRanked(d: { travelDetail: DriveDetail | FlightDetail }): number {
  if (d.travelDetail.type === "drive") {
    return d.travelDetail.durationMinutes;
  }
  return d.travelDetail.shortestFlightMinutes;
}
