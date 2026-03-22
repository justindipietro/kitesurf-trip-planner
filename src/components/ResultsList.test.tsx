import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ResultsList } from "./ResultsList";
import type { RankedDestination } from "../types";

describe("ResultsList", () => {
  it("renders error banner when error is provided", () => {
    render(
      <ResultsList
        results={null}
        travelMode="drive"
        message={null}
        error="Wind data could not be retrieved"
      />
    );
    const banner = screen.getByTestId("error-banner");
    expect(banner).toHaveTextContent("Wind data could not be retrieved");
    expect(banner).toHaveClass("error-banner");
  });

  it("renders message when provided and no error", () => {
    render(
      <ResultsList
        results={null}
        travelMode="drive"
        message="Settings changed. Please search again."
        error={null}
      />
    );
    expect(screen.getByTestId("results-message")).toHaveTextContent(
      "Settings changed. Please search again."
    );
  });

  it("renders error banner even when message is also provided", () => {
    render(
      <ResultsList
        results={null}
        travelMode="drive"
        message="Some message"
        error="An error occurred"
      />
    );
    expect(screen.getByTestId("error-banner")).toBeInTheDocument();
    expect(screen.queryByTestId("results-message")).not.toBeInTheDocument();
  });

  it("renders no-results when results is null", () => {
    render(
      <ResultsList
        results={null}
        travelMode="drive"
        message={null}
        error={null}
      />
    );
    expect(screen.getByTestId("no-results")).toHaveTextContent(
      "No matching locations found"
    );
  });

  it("renders no-results when results is empty array", () => {
    render(
      <ResultsList
        results={[]}
        travelMode="drive"
        message={null}
        error={null}
      />
    );
    expect(screen.getByTestId("no-results")).toHaveTextContent(
      "No matching locations found"
    );
  });

  it("renders drive mode results with duration formatted as Xh Ym", () => {
    const results: RankedDestination[] = [
      {
        rank: 1,
        locationName: "Tarifa",
        averageWindSpeedKnots: 22.5,
        travelDetail: { type: "drive", durationMinutes: 150 },
      },
    ];
    render(
      <ResultsList
        results={results}
        travelMode="drive"
        message={null}
        error={null}
      />
    );
    const items = screen.getAllByTestId("result-item");
    expect(items).toHaveLength(1);
    expect(screen.getByTestId("location-name")).toHaveTextContent("Tarifa");
    expect(screen.getByTestId("wind-speed")).toHaveTextContent("22.5 knots");
    expect(screen.getByTestId("drive-duration")).toHaveTextContent("2h 30m");
  });

  it("renders flight mode results with flight count and duration", () => {
    const results: RankedDestination[] = [
      {
        rank: 1,
        locationName: "Cabarete",
        averageWindSpeedKnots: 18.3,
        travelDetail: {
          type: "flight",
          availableFlights: 3,
          shortestFlightMinutes: 195,
        },
      },
    ];
    render(
      <ResultsList
        results={results}
        travelMode="flight"
        message={null}
        error={null}
      />
    );
    expect(screen.getByTestId("location-name")).toHaveTextContent("Cabarete");
    expect(screen.getByTestId("wind-speed")).toHaveTextContent("18.3 knots");
    expect(screen.getByTestId("flight-count")).toHaveTextContent("3 flights");
    expect(screen.getByTestId("flight-duration")).toHaveTextContent("3h 15m");
  });

  it("renders multiple result items", () => {
    const results: RankedDestination[] = [
      {
        rank: 1,
        locationName: "Tarifa",
        averageWindSpeedKnots: 25,
        travelDetail: { type: "drive", durationMinutes: 120 },
      },
      {
        rank: 2,
        locationName: "Essaouira",
        averageWindSpeedKnots: 20,
        travelDetail: { type: "drive", durationMinutes: 300 },
      },
    ];
    render(
      <ResultsList
        results={results}
        travelMode="drive"
        message={null}
        error={null}
      />
    );
    const items = screen.getAllByTestId("result-item");
    expect(items).toHaveLength(2);
    const names = screen.getAllByTestId("location-name");
    expect(names[0]).toHaveTextContent("Tarifa");
    expect(names[1]).toHaveTextContent("Essaouira");
  });

  it("uses singular 'flight' for single available flight", () => {
    const results: RankedDestination[] = [
      {
        rank: 1,
        locationName: "Maui",
        averageWindSpeedKnots: 20,
        travelDetail: {
          type: "flight",
          availableFlights: 1,
          shortestFlightMinutes: 360,
        },
      },
    ];
    render(
      <ResultsList
        results={results}
        travelMode="flight"
        message={null}
        error={null}
      />
    );
    expect(screen.getByTestId("flight-count")).toHaveTextContent("1 flight");
    expect(screen.getByTestId("flight-count")).not.toHaveTextContent("flights");
  });
});
