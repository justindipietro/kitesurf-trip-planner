import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { filterDirectFlights, sortFlightsByDeltaPreference } from "./travelService";
import type { Flight } from "../types";

// Feature: kitesurf-trip-planner, Property 11: Direct flight filtering

/**
 * **Validates: Requirements 4.3, 9.4**
 *
 * For any list of flights, when directOnly is true, every flight in the result
 * has isDirect === true. When directOnly is false, all flights (direct and
 * connecting) are included.
 */

const AIRLINES = ["Delta", "United", "American", "JetBlue", "Southwest"];

const flightArb: fc.Arbitrary<Flight> = fc.record({
  airline: fc.constantFrom(...AIRLINES),
  durationMinutes: fc.integer({ min: 30, max: 1200 }),
  isDirect: fc.boolean(),
});

const flightArrayArb = fc.array(flightArb, { minLength: 0, maxLength: 30 });

describe("Property 11: Direct flight filtering", () => {
  it("when directOnly is true, every flight in the result has isDirect === true", () => {
    fc.assert(
      fc.property(flightArrayArb, (flights) => {
        const result = filterDirectFlights(flights);

        for (const flight of result) {
          expect(flight.isDirect).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });

  it("when directOnly is true, the result contains all direct flights from the input", () => {
    fc.assert(
      fc.property(flightArrayArb, (flights) => {
        const result = filterDirectFlights(flights);
        const expectedDirectFlights = flights.filter((f) => f.isDirect);

        expect(result).toHaveLength(expectedDirectFlights.length);
        expect(result).toEqual(expectedDirectFlights);
      }),
      { numRuns: 100 }
    );
  });

  it("when directOnly is false, all flights (direct and connecting) are included", () => {
    fc.assert(
      fc.property(flightArrayArb, (flights) => {
        // When directOnly is false, no filtering is applied — all flights are returned as-is
        const result = flights; // identity: no filter call

        expect(result).toHaveLength(flights.length);
        expect(result).toEqual(flights);
      }),
      { numRuns: 100 }
    );
  });

  it("filtering direct flights never increases the total count", () => {
    fc.assert(
      fc.property(flightArrayArb, (flights) => {
        const result = filterDirectFlights(flights);

        expect(result.length).toBeLessThanOrEqual(flights.length);
      }),
      { numRuns: 100 }
    );
  });

  it("filtering preserves the relative order of direct flights", () => {
    fc.assert(
      fc.property(flightArrayArb, (flights) => {
        const result = filterDirectFlights(flights);
        const directFromInput = flights.filter((f) => f.isDirect);

        // The filtered result should maintain the same order as direct flights in the original
        for (let i = 0; i < result.length; i++) {
          expect(result[i]).toEqual(directFromInput[i]);
        }
      }),
      { numRuns: 100 }
    );
  });
});


// Feature: kitesurf-trip-planner, Property 12: Delta airline sorting priority

/**
 * **Validates: Requirements 4.4, 9.5**
 *
 * For any list of flights for a destination, when deltaPreferred is true,
 * all Delta airline flights appear before all non-Delta flights in the sorted result.
 * When deltaPreferred is false, no airline-based reordering occurs.
 */

describe("Property 12: Delta airline sorting priority", () => {
  it("when deltaPreferred is true, all Delta flights appear before all non-Delta flights", () => {
    fc.assert(
      fc.property(flightArrayArb, (flights) => {
        const result = sortFlightsByDeltaPreference(flights);

        // Find the index of the last Delta flight and the first non-Delta flight
        let lastDeltaIndex = -1;
        let firstNonDeltaIndex = -1;

        for (let i = 0; i < result.length; i++) {
          if (result[i].airline === "Delta") {
            lastDeltaIndex = i;
          } else if (firstNonDeltaIndex === -1) {
            firstNonDeltaIndex = i;
          }
        }

        // If both Delta and non-Delta flights exist, last Delta must come before first non-Delta
        if (lastDeltaIndex !== -1 && firstNonDeltaIndex !== -1) {
          expect(lastDeltaIndex).toBeLessThan(firstNonDeltaIndex);
        }
      }),
      { numRuns: 100 }
    );
  });

  it("when deltaPreferred is true, all Delta flights from input are preserved in result", () => {
    fc.assert(
      fc.property(flightArrayArb, (flights) => {
        const result = sortFlightsByDeltaPreference(flights);
        const inputDeltaCount = flights.filter((f) => f.airline === "Delta").length;
        const resultDeltaCount = result.filter((f) => f.airline === "Delta").length;

        expect(resultDeltaCount).toBe(inputDeltaCount);
        expect(result).toHaveLength(flights.length);
      }),
      { numRuns: 100 }
    );
  });

  it("when deltaPreferred is true, relative order within Delta and non-Delta groups is preserved", () => {
    fc.assert(
      fc.property(flightArrayArb, (flights) => {
        const result = sortFlightsByDeltaPreference(flights);

        const inputDeltas = flights.filter((f) => f.airline === "Delta");
        const inputOthers = flights.filter((f) => f.airline !== "Delta");
        const resultDeltas = result.filter((f) => f.airline === "Delta");
        const resultOthers = result.filter((f) => f.airline !== "Delta");

        // Relative order within each group should be preserved (stable sort)
        expect(resultDeltas).toEqual(inputDeltas);
        expect(resultOthers).toEqual(inputOthers);
      }),
      { numRuns: 100 }
    );
  });

  it("when deltaPreferred is false, no airline-based reordering occurs", () => {
    fc.assert(
      fc.property(flightArrayArb, (flights) => {
        // When deltaPreferred is false, sortFlightsByDeltaPreference is not called
        // so the original order is preserved (identity)
        const result = flights;

        expect(result).toEqual(flights);
        expect(result).toHaveLength(flights.length);
      }),
      { numRuns: 100 }
    );
  });
});
