import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { validateOrigin, validateDriveDuration, validateWindThreshold, validateDateRange, validateSearchSettings } from "./validation";
import { LOCATION_CATALOG } from "../data/locations";
import type { SearchSettings } from "../types";

// Feature: kitesurf-trip-planner, Property 1: Origin validation rejects unknown locations

/**
 * **Validates: Requirements 1.2, 1.3**
 *
 * For any string NOT in the known origins list, validateOrigin returns false.
 * For any known origin (catalog names, airport codes, US cities/airports), validateOrigin returns true.
 */
describe("Property 1: Origin validation rejects unknown locations", () => {
  // Build the complete set of known origins (lowercase) to match validation.ts logic
  const knownOriginsLower = new Set<string>();

  for (const loc of LOCATION_CATALOG) {
    knownOriginsLower.add(loc.name.toLowerCase());
    knownOriginsLower.add(loc.airportCode.toLowerCase());
  }

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
    knownOriginsLower.add(city.toLowerCase());
    knownOriginsLower.add(code.toLowerCase());
  }

  // All known origins as an array for sampling
  const knownOriginsList = Array.from(knownOriginsLower);

  it("rejects any random string that is not a known origin", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter(
          (s) => s.trim().length > 0 && !knownOriginsLower.has(s.trim().toLowerCase())
        ),
        (unknownOrigin) => {
          expect(validateOrigin(unknownOrigin)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("accepts any known origin from the known origins list", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: knownOriginsList.length - 1 }),
        (index) => {
          const origin = knownOriginsList[index];
          expect(validateOrigin(origin)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: kitesurf-trip-planner, Property 4: Drive duration validation accepts only integers in [1, 24]

/**
 * **Validates: Requirements 3.2, 3.3, 3.4**
 *
 * For any integer in [1, 24], validateDriveDuration returns true.
 * For any number outside [1, 24] or any non-integer, validateDriveDuration returns false.
 */
describe("Property 4: Drive duration validation accepts only integers in [1, 24]", () => {
  it("accepts any integer in [1, 24]", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 24 }),
        (hours) => {
          expect(validateDriveDuration(hours)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("rejects any integer outside [1, 24]", () => {
    fc.assert(
      fc.property(
        fc.integer().filter((n) => n < 1 || n > 24),
        (hours) => {
          expect(validateDriveDuration(hours)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("rejects any non-integer number", () => {
    fc.assert(
      fc.property(
        fc.double({ noNaN: true, noDefaultInfinity: true }).filter(
          (n) => !Number.isInteger(n)
        ),
        (hours) => {
          expect(validateDriveDuration(hours)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: kitesurf-trip-planner, Property 5: Wind threshold validation accepts only integers in [5, 50]

/**
 * **Validates: Requirements 5.3, 5.4, 5.5**
 *
 * For any integer in [5, 50], validateWindThreshold returns true.
 * For any number outside [5, 50] or any non-integer, validateWindThreshold returns false.
 */
describe("Property 5: Wind threshold validation accepts only integers in [5, 50]", () => {
  it("accepts any integer in [5, 50]", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 5, max: 50 }),
        (knots) => {
          expect(validateWindThreshold(knots)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("rejects any integer outside [5, 50]", () => {
    fc.assert(
      fc.property(
        fc.integer().filter((n) => n < 5 || n > 50),
        (knots) => {
          expect(validateWindThreshold(knots)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("rejects any non-integer number", () => {
    fc.assert(
      fc.property(
        fc.double({ noNaN: true, noDefaultInfinity: true }).filter(
          (n) => !Number.isInteger(n)
        ),
        (knots) => {
          expect(validateWindThreshold(knots)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: kitesurf-trip-planner, Property 6: Date range validation

/**
 * **Validates: Requirements 6.2, 6.3, 6.4, 6.5**
 *
 * For any pair of dates (startDate, endDate), validateDateRange returns valid if and only if:
 * startDate is today or later, endDate is on or after startDate, both dates are provided,
 * and the range does not exceed 16 days.
 */
describe("Property 6: Date range validation", () => {
  /** Helper: create a Date at midnight for a given day offset from today */
  function dateFromToday(offsetDays: number): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + offsetDays);
    return d;
  }

  it("returns valid for any start ≥ today, end ≥ start, and range ≤ 16 days", () => {
    fc.assert(
      fc.property(
        // startOffset: 0..100 days from today
        fc.integer({ min: 0, max: 100 }),
        // rangeLength: 0..16 days
        fc.integer({ min: 0, max: 16 }),
        (startOffset, rangeLength) => {
          const start = dateFromToday(startOffset);
          const end = dateFromToday(startOffset + rangeLength);
          const result = validateDateRange(start, end);
          expect(result.valid).toBe(true);
          expect(Object.keys(result.errors)).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("returns invalid with startDate error for any start date in the past", () => {
    fc.assert(
      fc.property(
        // pastOffset: 1..365 days before today
        fc.integer({ min: 1, max: 365 }),
        // rangeLength: 0..16 days (end relative to start, keeping range valid otherwise)
        fc.integer({ min: 0, max: 16 }),
        (pastOffset, rangeLength) => {
          const start = dateFromToday(-pastOffset);
          const end = dateFromToday(-pastOffset + rangeLength);
          const result = validateDateRange(start, end);
          expect(result.valid).toBe(false);
          expect(result.errors).toHaveProperty("startDate");
        }
      ),
      { numRuns: 100 }
    );
  });

  it("returns invalid with endDate error for any end date before start date", () => {
    fc.assert(
      fc.property(
        // startOffset: 0..100 days from today
        fc.integer({ min: 0, max: 100 }),
        // gap: 1..30 days that end is BEFORE start
        fc.integer({ min: 1, max: 30 }),
        (startOffset, gap) => {
          const start = dateFromToday(startOffset);
          const end = dateFromToday(startOffset - gap);
          const result = validateDateRange(start, end);
          expect(result.valid).toBe(false);
          expect(result.errors).toHaveProperty("endDate");
        }
      ),
      { numRuns: 100 }
    );
  });

  it("returns invalid with dateRange error for any range exceeding 16 days", () => {
    fc.assert(
      fc.property(
        // startOffset: 0..100 days from today
        fc.integer({ min: 0, max: 100 }),
        // rangeLength: 17..60 days (exceeds 16-day limit)
        fc.integer({ min: 17, max: 60 }),
        (startOffset, rangeLength) => {
          const start = dateFromToday(startOffset);
          const end = dateFromToday(startOffset + rangeLength);
          const result = validateDateRange(start, end);
          expect(result.valid).toBe(false);
          expect(result.errors).toHaveProperty("dateRange");
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: kitesurf-trip-planner, Property 7: Search is blocked when any setting is invalid

/**
 * **Validates: Requirements 7.2, 7.3**
 *
 * For any SearchSettings where at least one field fails validation,
 * validateSearchSettings returns { valid: false } with at least one error,
 * and the search must not proceed.
 */
describe("Property 7: Search is blocked when any setting is invalid", () => {
  /** Helper: create a Date at midnight for a given day offset from today */
  function dateFromToday(offsetDays: number): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + offsetDays);
    return d;
  }

  // Build known origins for generating valid ones
  const knownOriginsList: string[] = [];
  for (const loc of LOCATION_CATALOG) {
    knownOriginsList.push(loc.name);
    knownOriginsList.push(loc.airportCode);
  }

  /** Arbitrary for a valid origin (sampled from known origins) */
  const validOriginArb = fc.constantFrom(...knownOriginsList);

  /** Arbitrary for an invalid origin (empty or random unknown string) */
  const invalidOriginArb = fc.oneof(
    fc.constant(""),
    fc.constant("   "),
    fc.string({ minLength: 20, maxLength: 30 }).map((s) => "zzqx" + s)
  );

  /** Arbitrary for a valid wind threshold (integer in [5, 50]) */
  const validWindArb = fc.integer({ min: 5, max: 50 });

  /** Arbitrary for an invalid wind threshold */
  const invalidWindArb = fc.oneof(
    fc.integer({ min: -100, max: 4 }),
    fc.integer({ min: 51, max: 200 }),
    fc.double({ min: 5.1, max: 49.9, noNaN: true, noDefaultInfinity: true }).filter((n) => !Number.isInteger(n))
  );

  /** Arbitrary for a valid date range (start >= today, end >= start, range <= 16 days) */
  const validDateRangeArb = fc.tuple(
    fc.integer({ min: 0, max: 50 }),
    fc.integer({ min: 0, max: 16 })
  ).map(([startOffset, rangeLen]) => ({
    startDate: dateFromToday(startOffset),
    endDate: dateFromToday(startOffset + rangeLen),
  }));

  /** Arbitrary for an invalid date range */
  const invalidDateRangeArb = fc.oneof(
    // start in the past
    fc.integer({ min: 1, max: 100 }).map((pastOffset) => ({
      startDate: dateFromToday(-pastOffset),
      endDate: dateFromToday(-pastOffset + 1),
    })),
    // end before start
    fc.integer({ min: 0, max: 50 }).map((startOffset) => ({
      startDate: dateFromToday(startOffset),
      endDate: dateFromToday(startOffset - 2),
    })),
    // range exceeds 16 days
    fc.tuple(
      fc.integer({ min: 0, max: 50 }),
      fc.integer({ min: 17, max: 60 })
    ).map(([startOffset, rangeLen]) => ({
      startDate: dateFromToday(startOffset),
      endDate: dateFromToday(startOffset + rangeLen),
    }))
  );

  /** Arbitrary for a valid travel mode */
  const travelModeArb = fc.constantFrom<"drive" | "flight">("drive", "flight");

  it("returns invalid when origin is invalid (all other fields valid)", () => {
    fc.assert(
      fc.property(
        invalidOriginArb,
        travelModeArb,
        validWindArb,
        validDateRangeArb,
        (origin, travelMode, wind, dates) => {
          const settings: SearchSettings = {
            origin,
            travelMode,
            windThresholdKnots: wind,
            startDate: dates.startDate,
            endDate: dates.endDate,
            ...(travelMode === "drive" ? { maxDriveHours: 8 } : {}),
          };
          const result = validateSearchSettings(settings);
          expect(result.valid).toBe(false);
          expect(Object.keys(result.errors).length).toBeGreaterThanOrEqual(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("returns invalid when wind threshold is invalid (all other fields valid)", () => {
    fc.assert(
      fc.property(
        validOriginArb,
        travelModeArb,
        invalidWindArb,
        validDateRangeArb,
        (origin, travelMode, wind, dates) => {
          const settings: SearchSettings = {
            origin,
            travelMode,
            windThresholdKnots: wind,
            startDate: dates.startDate,
            endDate: dates.endDate,
            ...(travelMode === "drive" ? { maxDriveHours: 8 } : {}),
          };
          const result = validateSearchSettings(settings);
          expect(result.valid).toBe(false);
          expect(Object.keys(result.errors).length).toBeGreaterThanOrEqual(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("returns invalid when date range is invalid (all other fields valid)", () => {
    fc.assert(
      fc.property(
        validOriginArb,
        travelModeArb,
        validWindArb,
        invalidDateRangeArb,
        (origin, travelMode, wind, dates) => {
          const settings: SearchSettings = {
            origin,
            travelMode,
            windThresholdKnots: wind,
            startDate: dates.startDate,
            endDate: dates.endDate,
            ...(travelMode === "drive" ? { maxDriveHours: 8 } : {}),
          };
          const result = validateSearchSettings(settings);
          expect(result.valid).toBe(false);
          expect(Object.keys(result.errors).length).toBeGreaterThanOrEqual(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("returns invalid when drive duration is invalid in drive mode (all other fields valid)", () => {
    const invalidDriveHoursArb = fc.oneof(
      fc.integer({ min: -50, max: 0 }),
      fc.integer({ min: 25, max: 100 }),
      fc.double({ min: 1.1, max: 23.9, noNaN: true, noDefaultInfinity: true }).filter((n) => !Number.isInteger(n))
    );

    fc.assert(
      fc.property(
        validOriginArb,
        validWindArb,
        validDateRangeArb,
        invalidDriveHoursArb,
        (origin, wind, dates, driveHours) => {
          const settings: SearchSettings = {
            origin,
            travelMode: "drive",
            windThresholdKnots: wind,
            startDate: dates.startDate,
            endDate: dates.endDate,
            maxDriveHours: driveHours,
          };
          const result = validateSearchSettings(settings);
          expect(result.valid).toBe(false);
          expect(Object.keys(result.errors).length).toBeGreaterThanOrEqual(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("returns invalid with at least one error for settings with multiple invalid fields", () => {
    fc.assert(
      fc.property(
        invalidOriginArb,
        travelModeArb,
        invalidWindArb,
        invalidDateRangeArb,
        (origin, travelMode, wind, dates) => {
          const settings: SearchSettings = {
            origin,
            travelMode,
            windThresholdKnots: wind,
            startDate: dates.startDate,
            endDate: dates.endDate,
          };
          const result = validateSearchSettings(settings);
          expect(result.valid).toBe(false);
          expect(Object.keys(result.errors).length).toBeGreaterThanOrEqual(1);
        }
      ),
      { numRuns: 100 }
    );
  });
});
