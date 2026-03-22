import { describe, it, expect } from "vitest";
import {
  haversineDistanceKm,
  filterDirectFlights,
  sortFlightsByDeltaPreference,
  fetchDriveData,
  fetchFlightData,
} from "./travelService";
import type { Location, Flight } from "../types";

const sampleLocations: Location[] = [
  { name: "Tarifa, Spain", latitude: 36.0143, longitude: -5.6044, airportCode: "AGP" },
  { name: "Outer Banks, North Carolina", latitude: 35.5585, longitude: -75.4665, airportCode: "ORF" },
];

describe("haversineDistanceKm", () => {
  it("returns 0 for identical points", () => {
    expect(haversineDistanceKm(40, -74, 40, -74)).toBe(0);
  });

  it("calculates approximate distance between New York and London", () => {
    // ~5570 km
    const dist = haversineDistanceKm(40.7128, -74.006, 51.5074, -0.1278);
    expect(dist).toBeGreaterThan(5500);
    expect(dist).toBeLessThan(5700);
  });

  it("is symmetric", () => {
    const d1 = haversineDistanceKm(10, 20, 30, 40);
    const d2 = haversineDistanceKm(30, 40, 10, 20);
    expect(d1).toBeCloseTo(d2, 5);
  });
});

describe("filterDirectFlights", () => {
  it("returns only direct flights", () => {
    const flights: Flight[] = [
      { airline: "Delta", durationMinutes: 120, isDirect: true, priceUsd: 200 },
      { airline: "United", durationMinutes: 180, isDirect: false, priceUsd: 300 },
      { airline: "American", durationMinutes: 150, isDirect: true, priceUsd: 250 },
    ];
    const result = filterDirectFlights(flights);
    expect(result).toHaveLength(2);
    expect(result.every((f) => f.isDirect)).toBe(true);
  });

  it("returns empty array when no direct flights", () => {
    const flights: Flight[] = [
      { airline: "United", durationMinutes: 180, isDirect: false, priceUsd: 300 },
    ];
    expect(filterDirectFlights(flights)).toHaveLength(0);
  });

  it("returns all flights when all are direct", () => {
    const flights: Flight[] = [
      { airline: "Delta", durationMinutes: 120, isDirect: true, priceUsd: 200 },
      { airline: "JetBlue", durationMinutes: 130, isDirect: true, priceUsd: 220 },
    ];
    expect(filterDirectFlights(flights)).toHaveLength(2);
  });

  it("handles empty array", () => {
    expect(filterDirectFlights([])).toHaveLength(0);
  });
});

describe("sortFlightsByDeltaPreference", () => {
  it("places Delta flights before others", () => {
    const flights: Flight[] = [
      { airline: "United", durationMinutes: 180, isDirect: true, priceUsd: 300 },
      { airline: "Delta", durationMinutes: 120, isDirect: true, priceUsd: 200 },
      { airline: "American", durationMinutes: 150, isDirect: false, priceUsd: 250 },
      { airline: "Delta", durationMinutes: 200, isDirect: false, priceUsd: 280 },
    ];
    const result = sortFlightsByDeltaPreference(flights);
    expect(result[0].airline).toBe("Delta");
    expect(result[1].airline).toBe("Delta");
    expect(result.slice(2).every((f) => f.airline !== "Delta")).toBe(true);
  });

  it("preserves relative order within Delta group", () => {
    const flights: Flight[] = [
      { airline: "Delta", durationMinutes: 200, isDirect: false, priceUsd: 280 },
      { airline: "United", durationMinutes: 180, isDirect: true, priceUsd: 300 },
      { airline: "Delta", durationMinutes: 120, isDirect: true, priceUsd: 200 },
    ];
    const result = sortFlightsByDeltaPreference(flights);
    expect(result[0].durationMinutes).toBe(200);
    expect(result[1].durationMinutes).toBe(120);
  });

  it("preserves relative order within non-Delta group", () => {
    const flights: Flight[] = [
      { airline: "United", durationMinutes: 180, isDirect: true, priceUsd: 300 },
      { airline: "Delta", durationMinutes: 120, isDirect: true, priceUsd: 200 },
      { airline: "American", durationMinutes: 150, isDirect: false, priceUsd: 250 },
    ];
    const result = sortFlightsByDeltaPreference(flights);
    // Delta first, then United, then American (original non-Delta order preserved)
    expect(result[0].airline).toBe("Delta");
    expect(result[1].airline).toBe("United");
    expect(result[2].airline).toBe("American");
  });

  it("handles empty array", () => {
    expect(sortFlightsByDeltaPreference([])).toHaveLength(0);
  });

  it("handles no Delta flights", () => {
    const flights: Flight[] = [
      { airline: "United", durationMinutes: 180, isDirect: true, priceUsd: 300 },
      { airline: "American", durationMinutes: 150, isDirect: false, priceUsd: 250 },
    ];
    const result = sortFlightsByDeltaPreference(flights);
    expect(result).toHaveLength(2);
    expect(result[0].airline).toBe("United");
    expect(result[1].airline).toBe("American");
  });
});

describe("fetchDriveData", () => {
  it("returns drive data for known origin", async () => {
    const result = await fetchDriveData("New York", sampleLocations);
    expect(result).toHaveLength(2);
    expect(result[0].locationName).toBe("Tarifa, Spain");
    expect(result[0].durationMinutes).toBeGreaterThan(0);
    expect(result[1].locationName).toBe("Outer Banks, North Carolina");
    expect(result[1].durationMinutes).toBeGreaterThan(0);
  });

  it("returns empty array for unknown origin", async () => {
    const result = await fetchDriveData("Unknown City", sampleLocations);
    expect(result).toHaveLength(0);
  });

  it("is case-insensitive for origin", async () => {
    const r1 = await fetchDriveData("new york", sampleLocations);
    const r2 = await fetchDriveData("NEW YORK", sampleLocations);
    expect(r1).toEqual(r2);
  });

  it("works with airport code as origin", async () => {
    const result = await fetchDriveData("JFK", sampleLocations);
    expect(result).toHaveLength(2);
  });

  it("returns shorter drive for closer destinations", async () => {
    const result = await fetchDriveData("Miami", sampleLocations);
    // Outer Banks is closer to Miami than Tarifa
    const tarifa = result.find((d) => d.locationName === "Tarifa, Spain");
    const outerBanks = result.find((d) => d.locationName === "Outer Banks, North Carolina");
    expect(outerBanks!.durationMinutes).toBeLessThan(tarifa!.durationMinutes);
  });
});

describe("fetchFlightData", () => {
  const start = new Date("2025-07-01");
  const end = new Date("2025-07-07");

  it("returns flight data for known origin", async () => {
    const result = await fetchFlightData("New York", sampleLocations, start, end, false, false);
    expect(result.length).toBeGreaterThan(0);
    for (const fd of result) {
      expect(fd.locationName).toBeTruthy();
      expect(fd.flights.length).toBeGreaterThan(0);
    }
  });

  it("returns empty array for unknown origin", async () => {
    const result = await fetchFlightData("Unknown City", sampleLocations, start, end, false, false);
    expect(result).toHaveLength(0);
  });

  it("filters to direct flights only when directOnly is true", async () => {
    const result = await fetchFlightData("New York", sampleLocations, start, end, true, false);
    for (const fd of result) {
      expect(fd.flights.every((f) => f.isDirect)).toBe(true);
    }
  });

  it("sorts Delta flights first when preferDelta is true", async () => {
    const result = await fetchFlightData("New York", sampleLocations, start, end, false, true);
    for (const fd of result) {
      let seenNonDelta = false;
      for (const f of fd.flights) {
        if (f.airline !== "Delta") seenNonDelta = true;
        if (seenNonDelta) expect(f.airline).not.toBe("Delta");
      }
    }
  });

  it("excludes locations with no flights after direct-only filter", async () => {
    // All locations in result should have at least one flight
    const result = await fetchFlightData("New York", sampleLocations, start, end, true, false);
    for (const fd of result) {
      expect(fd.flights.length).toBeGreaterThan(0);
    }
  });

  it("generates flights with positive duration", async () => {
    const result = await fetchFlightData("New York", sampleLocations, start, end, false, false);
    for (const fd of result) {
      for (const f of fd.flights) {
        expect(f.durationMinutes).toBeGreaterThan(0);
      }
    }
  });
});
