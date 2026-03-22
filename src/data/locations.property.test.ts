import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { loadLocationCatalog } from "./locations";

// Feature: kitesurf-trip-planner, Property 17: Location catalog entries have all required fields and unique names

/**
 * **Validates: Requirements 12.2**
 *
 * For any location in the catalog: it has a non-empty name, valid latitude (-90 to 90),
 * valid longitude (-180 to 180), and a non-empty airport code.
 * All location names in the catalog are unique.
 */
describe("Property 17: Location catalog entries have all required fields and unique names", () => {
  const catalog = loadLocationCatalog();

  it("every location has a non-empty name, valid latitude, valid longitude, and non-empty airport code", () => {
    // Generate an index into the catalog and verify the entry at that index
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: catalog.length - 1 }),
        (index) => {
          const location = catalog[index];

          // Non-empty name
          expect(location.name).toBeTruthy();
          expect(location.name.trim().length).toBeGreaterThan(0);

          // Valid latitude: [-90, 90]
          expect(location.latitude).toBeGreaterThanOrEqual(-90);
          expect(location.latitude).toBeLessThanOrEqual(90);

          // Valid longitude: [-180, 180]
          expect(location.longitude).toBeGreaterThanOrEqual(-180);
          expect(location.longitude).toBeLessThanOrEqual(180);

          // Non-empty airport code
          expect(location.airportCode).toBeTruthy();
          expect(location.airportCode.trim().length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("all location names in the catalog are unique", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: catalog.length - 1 }),
        fc.integer({ min: 0, max: catalog.length - 1 }),
        (i, j) => {
          // For any two distinct indices, the names must differ
          if (i !== j) {
            expect(catalog[i].name).not.toBe(catalog[j].name);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
