// Feature: kitesurf-trip-planner, Property 15: Result display contains all required information
// **Validates: Requirements 10.3, 10.4, 10.5**

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { render, within, cleanup } from "@testing-library/react";
import { ResultsList } from "./ResultsList";
import type { RankedDestination, DriveDetail, FlightDetail } from "../types";

/** Arbitrary for DriveDetail */
const driveDetailArb: fc.Arbitrary<DriveDetail> = fc
  .integer({ min: 1, max: 1440 })
  .map((durationMinutes) => ({
    type: "drive" as const,
    durationMinutes,
  }));

/** Arbitrary for FlightDetail */
const flightDetailArb: fc.Arbitrary<FlightDetail> = fc
  .record({
    availableFlights: fc.integer({ min: 1, max: 50 }),
    shortestFlightMinutes: fc.integer({ min: 30, max: 1440 }),
  })
  .map(({ availableFlights, shortestFlightMinutes }) => ({
    type: "flight" as const,
    availableFlights,
    shortestFlightMinutes,
  }));

/** Generate location names without leading/trailing whitespace or consecutive spaces (realistic names) */
const locationNameArb: fc.Arbitrary<string> = fc
  .array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 -'.split('')), { minLength: 1, maxLength: 30 })
  .map((chars) => chars.join('').replace(/\s+/g, ' ').trim())
  .filter((s) => s.length > 0);

/** Arbitrary for a RankedDestination with drive travel detail */
const driveDestinationArb: fc.Arbitrary<RankedDestination> = fc.record({
  rank: fc.integer({ min: 1, max: 100 }),
  locationName: locationNameArb,
  averageWindSpeedKnots: fc.float({ min: 5, max: 50, noNaN: true }),
  travelDetail: driveDetailArb,
});

/** Arbitrary for a RankedDestination with flight travel detail */
const flightDestinationArb: fc.Arbitrary<RankedDestination> = fc.record({
  rank: fc.integer({ min: 1, max: 100 }),
  locationName: locationNameArb,
  averageWindSpeedKnots: fc.float({ min: 5, max: 50, noNaN: true }),
  travelDetail: flightDetailArb,
});

function formatDriveDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);
  return `${hours}h ${minutes}m`;
}

describe("Property 15: Result display contains all required information", () => {
  it("drive mode: display includes location name, wind speed, and driving duration", () => {
    fc.assert(
      fc.property(driveDestinationArb, (dest) => {
        cleanup();
        const { container } = render(
          <ResultsList
            results={[dest]}
            travelMode="drive"
            message={null}
            error={null}
          />
        );

        const view = within(container);
        const item = view.getByTestId("result-item");

        // Location name is present
        expect(within(item).getByTestId("location-name")).toHaveTextContent(dest.locationName);

        // Wind speed in knots is present
        expect(within(item).getByTestId("wind-speed")).toHaveTextContent(
          `${dest.averageWindSpeedKnots.toFixed(1)}`
        );

        // Drive duration is present (hours and minutes)
        const detail = dest.travelDetail as DriveDetail;
        expect(within(item).getByTestId("drive-duration")).toHaveTextContent(
          formatDriveDuration(detail.durationMinutes)
        );
      }),
      { numRuns: 100 }
    );
  });

  it("flight mode: display includes location name, wind speed, flight count, and shortest flight duration", () => {
    fc.assert(
      fc.property(flightDestinationArb, (dest) => {
        cleanup();
        const { container } = render(
          <ResultsList
            results={[dest]}
            travelMode="flight"
            message={null}
            error={null}
          />
        );

        const view = within(container);
        const item = view.getByTestId("result-item");

        // Location name is present
        expect(within(item).getByTestId("location-name")).toHaveTextContent(dest.locationName);

        // Wind speed in knots is present
        expect(within(item).getByTestId("wind-speed")).toHaveTextContent(
          `${dest.averageWindSpeedKnots.toFixed(1)}`
        );

        // Flight count is present
        const detail = dest.travelDetail as FlightDetail;
        expect(within(item).getByTestId("flight-count")).toHaveTextContent(
          `${detail.availableFlights} flight`
        );

        // Shortest flight duration is present
        expect(within(item).getByTestId("flight-duration")).toHaveTextContent(
          formatDriveDuration(detail.shortestFlightMinutes)
        );
      }),
      { numRuns: 100 }
    );
  });

  it("all required data-testid elements are present for drive results", () => {
    fc.assert(
      fc.property(
        fc.array(driveDestinationArb, { minLength: 1, maxLength: 5 }).map(
          (dests) => dests.map((d, i) => ({ ...d, rank: i + 1 }))
        ),
        (results) => {
          cleanup();
          const { container } = render(
            <ResultsList
              results={results}
              travelMode="drive"
              message={null}
              error={null}
            />
          );

          const view = within(container);
          const items = view.getAllByTestId("result-item");
          expect(items).toHaveLength(results.length);

          for (const item of items) {
            expect(within(item).getByTestId("location-name")).toBeInTheDocument();
            expect(within(item).getByTestId("wind-speed")).toBeInTheDocument();
            expect(within(item).getByTestId("drive-duration")).toBeInTheDocument();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("all required data-testid elements are present for flight results", () => {
    fc.assert(
      fc.property(
        fc.array(flightDestinationArb, { minLength: 1, maxLength: 5 }).map(
          (dests) => dests.map((d, i) => ({ ...d, rank: i + 1 }))
        ),
        (results) => {
          cleanup();
          const { container } = render(
            <ResultsList
              results={results}
              travelMode="flight"
              message={null}
              error={null}
            />
          );

          const view = within(container);
          const items = view.getAllByTestId("result-item");
          expect(items).toHaveLength(results.length);

          for (const item of items) {
            expect(within(item).getByTestId("location-name")).toBeInTheDocument();
            expect(within(item).getByTestId("wind-speed")).toBeInTheDocument();
            expect(within(item).getByTestId("flight-count")).toBeInTheDocument();
            expect(within(item).getByTestId("flight-duration")).toBeInTheDocument();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
