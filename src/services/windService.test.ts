import { describe, it, expect, vi, beforeEach } from "vitest";
import { calculateAverageWindSpeed, fetchWindData } from "./windService";
import type { Location } from "../types";

describe("calculateAverageWindSpeed", () => {
  it("returns 0 for an empty array", () => {
    expect(calculateAverageWindSpeed([])).toBe(0);
  });

  it("returns the single value for a one-element array", () => {
    expect(calculateAverageWindSpeed([20])).toBe(20);
  });

  it("calculates the average of multiple values", () => {
    expect(calculateAverageWindSpeed([10, 20, 30])).toBe(20);
  });

  it("handles decimal values", () => {
    const result = calculateAverageWindSpeed([10.5, 20.5]);
    expect(result).toBeCloseTo(15.5);
  });
});

describe("fetchWindData", () => {
  const mockLocations: Location[] = [
    { name: "Tarifa, Spain", latitude: 36.0143, longitude: -5.6044, airportCode: "AGP" },
    { name: "Cape Town, South Africa", latitude: -33.9249, longitude: 18.4241, airportCode: "CPT" },
  ];

  const startDate = new Date("2025-07-01");
  const endDate = new Date("2025-07-03");

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches wind data and converts km/h to knots", async () => {
    const mockResponse = {
      daily: {
        wind_speed_10m_max: [18.52, 37.04], // 10 knots, 20 knots
      },
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const result = await fetchWindData(mockLocations, startDate, endDate);

    expect(result).toHaveLength(2);
    expect(result[0].locationName).toBe("Tarifa, Spain");
    expect(result[0].averageWindSpeedKnots).toBeCloseTo(15); // avg of 10 and 20
    expect(result[1].locationName).toBe("Cape Town, South Africa");
  });

  it("excludes locations where API returns no wind data", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ daily: { wind_speed_10m_max: [18.52] } }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ daily: { wind_speed_10m_max: [] } }),
      } as Response);

    const result = await fetchWindData(mockLocations, startDate, endDate);

    expect(result).toHaveLength(1);
    expect(result[0].locationName).toBe("Tarifa, Spain");
  });

  it("excludes locations where API returns null wind data", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ daily: { wind_speed_10m_max: [18.52] } }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ daily: {} }),
      } as Response);

    const result = await fetchWindData(mockLocations, startDate, endDate);

    expect(result).toHaveLength(1);
    expect(result[0].locationName).toBe("Tarifa, Spain");
  });

  it("throws when all API requests fail", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"));

    await expect(fetchWindData(mockLocations, startDate, endDate)).rejects.toThrow(
      "Wind data could not be retrieved"
    );
  });

  it("handles partial failures gracefully", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ daily: { wind_speed_10m_max: [18.52] } }),
      } as Response)
      .mockRejectedValueOnce(new Error("Network error"));

    const result = await fetchWindData(mockLocations, startDate, endDate);

    expect(result).toHaveLength(1);
    expect(result[0].locationName).toBe("Tarifa, Spain");
  });

  it("throws when API returns non-ok status for all locations", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 500,
    } as Response);

    await expect(fetchWindData(mockLocations, startDate, endDate)).rejects.toThrow(
      "Wind data could not be retrieved"
    );
  });

  it("formats dates as YYYY-MM-DD in the API URL", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ daily: { wind_speed_10m_max: [18.52] } }),
    } as Response);

    await fetchWindData([mockLocations[0]], startDate, endDate);

    const calledUrl = fetchSpy.mock.calls[0][0] as string;
    expect(calledUrl).toContain("start_date=2025-07-01");
    expect(calledUrl).toContain("end_date=2025-07-03");
  });
});
