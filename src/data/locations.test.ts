import { describe, it, expect } from "vitest";
import { LOCATION_CATALOG, loadLocationCatalog } from "./locations";

describe("Location Catalog", () => {
  it("contains at least 8 destinations", () => {
    expect(LOCATION_CATALOG.length).toBeGreaterThanOrEqual(8);
  });

  it("each location has all required fields", () => {
    for (const loc of LOCATION_CATALOG) {
      expect(loc.name).toBeTruthy();
      expect(typeof loc.latitude).toBe("number");
      expect(typeof loc.longitude).toBe("number");
      expect(loc.airportCode).toBeTruthy();
    }
  });

  it("all location names are unique", () => {
    const names = LOCATION_CATALOG.map((l) => l.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("loadLocationCatalog returns the catalog", () => {
    const result = loadLocationCatalog();
    expect(result).toBe(LOCATION_CATALOG);
    expect(result.length).toBeGreaterThanOrEqual(1);
  });
});
