// Feature: kitesurf-trip-planner, Property 16: Settings change clears stale results
// **Validates: Requirements 11.1, 11.2**

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fc from "fast-check";
import { render, screen, fireEvent, act, cleanup, waitFor } from "@testing-library/react";
import App from "./App";
import type { WindData, DriveData, FlightData } from "./types";

const MOCK_WIND_DATA: WindData[] = [
  { locationName: "Tarifa, Spain", averageWindSpeedKnots: 25 },
  { locationName: "Cabarete, Dominican Republic", averageWindSpeedKnots: 20 },
];

const MOCK_DRIVE_DATA: DriveData[] = [
  { locationName: "Tarifa, Spain", durationMinutes: 120 },
  { locationName: "Cabarete, Dominican Republic", durationMinutes: 300 },
];

const MOCK_FLIGHT_DATA: FlightData[] = [
  {
    locationName: "Tarifa, Spain",
    flights: [{ airline: "Delta", durationMinutes: 480, isDirect: true, priceUsd: 350 }],
  },
  {
    locationName: "Cabarete, Dominican Republic",
    flights: [{ airline: "United", durationMinutes: 240, isDirect: true, priceUsd: 280 }],
  },
];

// Mock modules
vi.mock("./data/locations", () => ({
  LOCATION_CATALOG: [
    { name: "Tarifa, Spain", latitude: 36.0143, longitude: -5.6044, airportCode: "AGP" },
    { name: "Cabarete, Dominican Republic", latitude: 19.758, longitude: -70.4083, airportCode: "POP" },
  ],
  loadLocationCatalog: () => [
    { name: "Tarifa, Spain", latitude: 36.0143, longitude: -5.6044, airportCode: "AGP" },
    { name: "Cabarete, Dominican Republic", latitude: 19.758, longitude: -70.4083, airportCode: "POP" },
  ],
}));

vi.mock("./services/windService", () => ({
  fetchWindData: vi.fn(),
}));

vi.mock("./services/travelService", () => ({
  fetchDriveData: vi.fn(),
  fetchFlightData: vi.fn(),
}));

import { fetchWindData } from "./services/windService";
import { fetchDriveData, fetchFlightData } from "./services/travelService";

const mockedFetchWindData = vi.mocked(fetchWindData);
const mockedFetchDriveData = vi.mocked(fetchDriveData);
const mockedFetchFlightData = vi.mocked(fetchFlightData);


/**
 * Represents a setting change action that can be performed on the SettingsPanel.
 * Each action produces a value that differs from the defaults used during the initial search,
 * ensuring the DOM actually fires a change event.
 *
 * Initial search state:
 *   origin: "New York", travelMode: "flight", windThreshold: 15,
 *   startDate: tomorrow, endDate: tomorrow+3
 */
type SettingChangeAction =
  | { type: "origin"; value: string }
  | { type: "travelMode"; value: "drive" }
  | { type: "windThreshold"; value: number }
  | { type: "startDate"; value: string }
  | { type: "endDate"; value: string };

/**
 * Arbitrary for generating a setting change action.
 * All generated values differ from the initial search state so that
 * the DOM change/click event actually fires.
 */
const settingChangeArb: fc.Arbitrary<SettingChangeAction> = fc.oneof(
  // Origin: any string different from "New York"
  fc.constantFrom("Miami", "Chicago", "Boston", "Dallas", "Atlanta").map((v) => ({
    type: "origin" as const,
    value: v,
  })),
  // Travel mode: always "drive" since search is done in "flight" mode
  fc.constant({ type: "travelMode" as const, value: "drive" as const }),
  // Wind threshold: any integer in [5,50] except 15 (the default)
  fc.integer({ min: 5, max: 50 }).filter((v) => v !== 15).map((v) => ({
    type: "windThreshold" as const,
    value: v,
  })),
  // Start date: a different future date
  fc.integer({ min: 5, max: 14 }).map((offset) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    const fmt = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return { type: "startDate" as const, value: fmt };
  }),
  // End date: a different future date
  fc.integer({ min: 6, max: 15 }).map((offset) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    const fmt = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return { type: "endDate" as const, value: fmt };
  })
);

/** Helper: fill in valid settings and submit the search form */
async function fillAndSearch() {
  // Set origin to a known valid value
  const originInput = screen.getByTestId("origin-input");
  fireEvent.change(originInput, { target: { value: "New York" } });

  // Set wind threshold
  const windInput = screen.getByTestId("wind-threshold");
  fireEvent.change(windInput, { target: { value: "15" } });

  // Set dates (future dates)
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() + 1);
  const end = new Date(start);
  end.setDate(end.getDate() + 3);

  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const startInput = screen.getByTestId("start-date");
  fireEvent.change(startInput, { target: { value: fmt(start) } });

  const endInput = screen.getByTestId("end-date");
  fireEvent.change(endInput, { target: { value: fmt(end) } });

  // Click search
  const searchButton = screen.getByTestId("search-button");
  await act(async () => {
    fireEvent.click(searchButton);
  });
}

/** Helper: apply a setting change action to the rendered form */
function applySettingChange(action: SettingChangeAction) {
  switch (action.type) {
    case "origin":
      fireEvent.change(screen.getByTestId("origin-input"), {
        target: { value: action.value },
      });
      break;
    case "travelMode":
      fireEvent.click(
        screen.getByTestId(
          action.value === "drive" ? "travel-mode-drive" : "travel-mode-flight"
        )
      );
      break;
    case "windThreshold":
      fireEvent.change(screen.getByTestId("wind-threshold"), {
        target: { value: String(action.value) },
      });
      break;
    case "startDate":
      fireEvent.change(screen.getByTestId("start-date"), {
        target: { value: action.value },
      });
      break;
    case "endDate":
      fireEvent.change(screen.getByTestId("end-date"), {
        target: { value: action.value },
      });
      break;
  }
}

describe("Property 16: Settings change clears stale results", () => {
  beforeEach(() => {
    mockedFetchWindData.mockResolvedValue(MOCK_WIND_DATA);
    mockedFetchDriveData.mockResolvedValue(MOCK_DRIVE_DATA);
    mockedFetchFlightData.mockResolvedValue(MOCK_FLIGHT_DATA);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("for any setting change after a completed search, results are cleared and re-search message is shown", async () => {
    await fc.assert(
      fc.asyncProperty(settingChangeArb, async (action) => {
        cleanup();
        vi.clearAllMocks();
        mockedFetchWindData.mockResolvedValue(MOCK_WIND_DATA);
        mockedFetchDriveData.mockResolvedValue(MOCK_DRIVE_DATA);
        mockedFetchFlightData.mockResolvedValue(MOCK_FLIGHT_DATA);

        render(<App />);

        // Step 1: Fill in valid settings and perform a search
        await fillAndSearch();

        // Wait for search to complete and results to appear
        await waitFor(() => {
          expect(screen.getAllByTestId("result-item").length).toBeGreaterThan(0);
        });

        // Verify results are displayed
        const resultItems = screen.getAllByTestId("result-item");
        expect(resultItems.length).toBeGreaterThan(0);

        // Step 2: Change a setting
        await act(async () => {
          applySettingChange(action);
        });

        // Step 3: Verify results are cleared and re-search message is shown
        await waitFor(() => {
          expect(screen.queryAllByTestId("result-item")).toHaveLength(0);
        });
        expect(screen.getByTestId("results-message")).toHaveTextContent(
          "Settings changed. Please search again."
        );

        cleanup();
      }),
      { numRuns: 100 }
    );
  });

  it("a new search after settings change replaces the re-search message with new results", async () => {
    render(<App />);

    // Perform initial search
    await fillAndSearch();

    await waitFor(() => {
      expect(screen.getAllByTestId("result-item").length).toBeGreaterThan(0);
    });

    // Change a setting
    act(() => {
      fireEvent.change(screen.getByTestId("origin-input"), {
        target: { value: "Miami" },
      });
    });

    // Verify re-search message
    expect(screen.getByTestId("results-message")).toHaveTextContent(
      "Settings changed. Please search again."
    );

    // Fix origin back to valid and set valid dates for new search
    fireEvent.change(screen.getByTestId("origin-input"), {
      target: { value: "Miami" },
    });

    // Perform new search
    await fillAndSearch();

    await waitFor(() => {
      expect(screen.getAllByTestId("result-item").length).toBeGreaterThan(0);
    });

    // Verify new results replaced the message
    expect(screen.queryByTestId("results-message")).toBeNull();
    expect(screen.getAllByTestId("result-item").length).toBeGreaterThan(0);
  });
});
