import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fc from "fast-check";
import { calculateAverageWindSpeed, fetchWindData } from "./windService";
import type { Location } from "../types";

// Feature: kitesurf-trip-planner, Property 8: Wind speed averaging is correct

/**
 * **Validates: Requirements 8.2**
 *
 * For any non-empty array of daily wind speed values, the computed average
 * equals the sum of all values divided by the count of values.
 */

describe("Property 8: Wind speed averaging is correct", () => {
  it("average equals sum of all values divided by count for any non-empty array of positive wind speeds", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.double({ min: 0.1, max: 100, noNaN: true, noDefaultInfinity: true }),
          { minLength: 1, maxLength: 50 }
        ),
        (speeds) => {
          const result = calculateAverageWindSpeed(speeds);
          const expectedAverage = speeds.reduce((sum, s) => sum + s, 0) / speeds.length;

          expect(result).toBeCloseTo(expectedAverage, 10);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("average of a single value equals that value", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.1, max: 100, noNaN: true, noDefaultInfinity: true }),
        (speed) => {
          const result = calculateAverageWindSpeed([speed]);
          expect(result).toBeCloseTo(speed, 10);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("average is always between the minimum and maximum value in the array", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.double({ min: 0.1, max: 100, noNaN: true, noDefaultInfinity: true }),
          { minLength: 1, maxLength: 50 }
        ),
        (speeds) => {
          const result = calculateAverageWindSpeed(speeds);
          const min = Math.min(...speeds);
          const max = Math.max(...speeds);

          expect(result).toBeGreaterThanOrEqual(min - 1e-10);
          expect(result).toBeLessThanOrEqual(max + 1e-10);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: kitesurf-trip-planner, Property 13: Graceful exclusion of locations with missing data

/**
 * **Validates: Requirements 8.4, 9.6**
 *
 * For any set of locations where a subset has missing wind data (API returns
 * no data), those locations are excluded from results, and all locations with
 * complete data are preserved in the output.
 */

describe("Property 13: Graceful exclusion of locations with missing data", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Generate a list of locations with unique names and unique coordinates,
   * plus a set of indices that should have missing data.
   * At least one location has valid data (so fetchWindData doesn't throw).
   */
  const locationsWithSubsetsArb = fc
    .integer({ min: 2, max: 6 })
    .chain((count) =>
      fc.tuple(
        fc.array(
          fc.record({
            name: fc.stringMatching(/^[a-zA-Z]{3,10}$/),
            latitude: fc.double({ min: -89, max: 89, noNaN: true, noDefaultInfinity: true }),
            longitude: fc.double({ min: -179, max: 179, noNaN: true, noDefaultInfinity: true }),
            airportCode: fc.stringMatching(/^[A-Z]{3}$/),
          }),
          { minLength: count, maxLength: count }
        ),
        fc.subarray(
          Array.from({ length: count }, (_, i) => i),
          { minLength: 1, maxLength: count - 1 }
        )
      )
    )
    .map(([locs, missingIndices]) => {
      // Ensure unique names by appending index
      const locations: Location[] = locs.map((loc, i) => ({
        ...loc,
        name: `${loc.name}_${i}`,
        // Ensure unique coordinates by offsetting with index
        latitude: loc.latitude + i * 0.01,
        longitude: loc.longitude + i * 0.01,
      }));
      return { locations, missingSet: new Set(missingIndices) };
    });

  it("locations with missing wind data are excluded and locations with valid data are preserved", async () => {
    await fc.assert(
      fc.asyncProperty(locationsWithSubsetsArb, async ({ locations, missingSet }) => {
        const startDate = new Date("2025-07-01");
        const endDate = new Date("2025-07-03");

        // Build a lookup from lat+lon to index for URL-based matching
        const coordToIndex = new Map<string, number>();
        for (let i = 0; i < locations.length; i++) {
          // Round to match what appears in the URL
          const key = `${locations[i].latitude},${locations[i].longitude}`;
          coordToIndex.set(key, i);
        }

        vi.stubGlobal(
          "fetch",
          vi.fn((url: string) => {
            const latMatch = url.match(/latitude=([-\d.e+]+)/);
            const lonMatch = url.match(/longitude=([-\d.e+]+)/);
            const lat = latMatch ? parseFloat(latMatch[1]) : NaN;
            const lon = lonMatch ? parseFloat(lonMatch[1]) : NaN;

            // Find which location this request is for
            let idx = -1;
            for (const [i, loc] of locations.entries()) {
              if (
                Math.abs(loc.latitude - lat) < 0.001 &&
                Math.abs(loc.longitude - lon) < 0.001
              ) {
                idx = i;
                break;
              }
            }

            if (idx >= 0 && missingSet.has(idx)) {
              // Missing data: return response with null wind data
              return Promise.resolve({
                ok: true,
                json: () =>
                  Promise.resolve({
                    daily: { wind_speed_10m_max: null },
                  }),
              });
            }

            // Valid data: return some wind speeds
            return Promise.resolve({
              ok: true,
              json: () =>
                Promise.resolve({
                  daily: { wind_speed_10m_max: [15.0, 20.0, 18.0] },
                }),
            });
          })
        );

        const result = await fetchWindData(locations, startDate, endDate);

        const validLocations = locations.filter((_, i) => !missingSet.has(i));
        const missingLocations = locations.filter((_, i) => missingSet.has(i));
        const resultNames = result.map((r) => r.locationName);

        // All valid locations are preserved
        for (const loc of validLocations) {
          expect(resultNames).toContain(loc.name);
        }

        // No missing-data locations appear in results
        for (const loc of missingLocations) {
          expect(resultNames).not.toContain(loc.name);
        }

        // Result count matches valid location count
        expect(result.length).toBe(validLocations.length);
      }),
      { numRuns: 100 }
    );
  });
});
