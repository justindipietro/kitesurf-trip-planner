import { describe, it, expect, vi, beforeEach } from "vitest";
import { calculateAverageWindSpeed, fetchWindData, clearFetchCache } from "./windService";
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

/** Helper: build hourly mock data for Open-Meteo with daytime hours (7-18) having wind */
function buildHourlyMock(dailyWindKmh: number[][]): {
  hourly: { time: string[]; wind_speed_10m: number[]; temperature_2m: number[] };
} {
  const times: string[] = [];
  const speeds: number[] = [];
  const temps: number[] = [];
  const baseDate = new Date("2025-07-01");

  for (let day = 0; day < dailyWindKmh.length; day++) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + day);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    for (let hour = 0; hour < 24; hour++) {
      times.push(`${dateStr}T${String(hour).padStart(2, "0")}:00`);
      if (hour >= 7 && hour < 19) {
        speeds.push(dailyWindKmh[day][0] ?? 0);
        temps.push(25); // 25°C daytime
      } else {
        speeds.push(5);
        temps.push(15); // 15°C nighttime
      }
    }
  }

  return { hourly: { time: times, wind_speed_10m: speeds, temperature_2m: temps } };
}

/** Helper: build marine API mock response */
function buildMarineMock(): { hourly: { sea_surface_temperature: number[] } } {
  return { hourly: { sea_surface_temperature: [22, 23, 22.5] } };
}

/**
 * Mock fetch to handle both weather and marine API calls.
 * Weather URLs get the weather mock, marine URLs get the marine mock.
 */
function mockFetchForWeatherAndMarine(weatherMock: unknown, marineMock?: unknown) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();
    if (url.includes("marine-api.open-meteo.com")) {
      return {
        ok: true,
        json: async () => marineMock ?? buildMarineMock(),
      } as Response;
    }
    return {
      ok: true,
      json: async () => weatherMock,
    } as Response;
  });
}

describe("fetchWindData", () => {
  const mockLocations: Location[] = [
    { name: "Tarifa, Spain", latitude: 36.0143, longitude: -5.6044, airportCode: "AGP" },
    { name: "Cape Town, South Africa", latitude: -33.9249, longitude: 18.4241, airportCode: "CPT" },
  ];

  const startDate = new Date("2025-07-01");
  const endDate = new Date("2025-07-03");

  beforeEach(() => {
    vi.restoreAllMocks();
    clearFetchCache();
  });

  it("fetches wind data and converts km/h to knots using daytime hours only", async () => {
    const mockResponse = buildHourlyMock([[18.52], [37.04], [27.78]]);
    mockFetchForWeatherAndMarine(mockResponse);

    const result = await fetchWindData(mockLocations, startDate, endDate);

    expect(result).toHaveLength(2);
    expect(result[0].locationName).toBe("Tarifa, Spain");
    expect(result[0].averageWindSpeedKnots).toBeCloseTo(15);
    expect(result[1].locationName).toBe("Cape Town, South Africa");
  });

  it("excludes locations where API returns no wind data", async () => {
    const validMock = buildHourlyMock([[18.52]]);
    const emptyMock = { hourly: { time: [], wind_speed_10m: [] } };

    let callCount = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("marine-api.open-meteo.com")) {
        return { ok: true, json: async () => buildMarineMock() } as Response;
      }
      callCount++;
      const mock = callCount === 1 ? validMock : emptyMock;
      return { ok: true, json: async () => mock } as Response;
    });

    const result = await fetchWindData(mockLocations, startDate, endDate);

    expect(result).toHaveLength(1);
    expect(result[0].locationName).toBe("Tarifa, Spain");
  });

  it("excludes locations where API returns null wind data", async () => {
    const validMock = buildHourlyMock([[18.52]]);

    let callCount = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("marine-api.open-meteo.com")) {
        return { ok: true, json: async () => buildMarineMock() } as Response;
      }
      callCount++;
      const mock = callCount === 1 ? validMock : { hourly: {} };
      return { ok: true, json: async () => mock } as Response;
    });

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
    const validMock = buildHourlyMock([[18.52]]);

    let weatherCallCount = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("marine-api.open-meteo.com")) {
        return { ok: true, json: async () => buildMarineMock() } as Response;
      }
      weatherCallCount++;
      if (weatherCallCount === 1) {
        return { ok: true, json: async () => validMock } as Response;
      }
      throw new Error("Network error");
    });

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

  it("formats dates as YYYY-MM-DD in the API URL and uses hourly endpoint", async () => {
    const validMock = buildHourlyMock([[18.52]]);
    const fetchSpy = mockFetchForWeatherAndMarine(validMock);

    await fetchWindData([mockLocations[0]], startDate, endDate);

    // Find the weather API call (not marine)
    const weatherCall = fetchSpy.mock.calls.find(
      (c) => !(c[0] as string).includes("marine-api")
    );
    expect(weatherCall).toBeDefined();
    const calledUrl = weatherCall![0] as string;
    expect(calledUrl).toContain("start_date=2025-07-01");
    expect(calledUrl).toContain("end_date=2025-07-03");
    expect(calledUrl).toContain("hourly=wind_speed_10m");
  });

  it("only considers daytime hours 7AM-7PM for wind averages", async () => {
    const mockResponse = buildHourlyMock([[37.04]]);
    mockFetchForWeatherAndMarine(mockResponse);

    const result = await fetchWindData([mockLocations[0]], startDate, endDate);

    expect(result).toHaveLength(1);
    expect(result[0].averageWindSpeedKnots).toBeCloseTo(20, 0);
  });
});
