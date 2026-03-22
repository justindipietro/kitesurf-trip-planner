// Feature: kitesurf-trip-planner, Property 2: Travel mode is always exactly one value
// **Validates: Requirements 2.1**

import { describe, it, expect, vi } from "vitest";
import * as fc from "fast-check";
import { render, screen, fireEvent } from "@testing-library/react";
import { SettingsPanel } from "./SettingsPanel";
import type { TravelMode } from "../types";

const VALID_TRAVEL_MODES: TravelMode[] = ["drive", "flight"];

describe("Property 2: Travel mode is always exactly one value", () => {
  it("TravelMode type value is always exactly 'drive' or 'flight'", () => {
    fc.assert(
      fc.property(
        fc.constantFrom<TravelMode>("drive", "flight"),
        (mode: TravelMode) => {
          expect(VALID_TRAVEL_MODES).toContain(mode);
          // Exactly one: it must be one of the two, and the two are mutually exclusive strings
          if (mode === "drive") {
            expect(mode).not.toBe("flight");
          } else {
            expect(mode).toBe("flight");
            expect(mode).not.toBe("drive");
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("random strings that are not 'drive' or 'flight' are never valid TravelMode values", () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => s !== "drive" && s !== "flight"),
        (randomStr: string) => {
          expect(VALID_TRAVEL_MODES).not.toContain(randomStr);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("SettingsPanel always has exactly one travel mode radio checked after random clicks", () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom("drive", "flight"), { minLength: 1, maxLength: 20 }),
        (clicks: string[]) => {
          const { unmount } = render(
            <SettingsPanel
              onSearch={vi.fn()}
              isSearching={false}
              onSettingsChange={vi.fn()}
            />
          );

          for (const mode of clicks) {
            const testId = mode === "drive" ? "travel-mode-drive" : "travel-mode-flight";
            fireEvent.click(screen.getByTestId(testId));
          }

          const driveRadio = screen.getByTestId("travel-mode-drive") as HTMLInputElement;
          const flightRadio = screen.getByTestId("travel-mode-flight") as HTMLInputElement;

          // Exactly one must be checked
          const checkedCount = [driveRadio.checked, flightRadio.checked].filter(Boolean).length;
          expect(checkedCount).toBe(1);

          // The checked one should match the last click
          const lastClick = clicks[clicks.length - 1];
          if (lastClick === "drive") {
            expect(driveRadio.checked).toBe(true);
            expect(flightRadio.checked).toBe(false);
          } else {
            expect(driveRadio.checked).toBe(false);
            expect(flightRadio.checked).toBe(true);
          }

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: kitesurf-trip-planner, Property 3: Mode-specific options visibility
// **Validates: Requirements 2.3, 2.4**

describe("Property 3: Mode-specific options visibility", () => {
  it("drive mode shows drive-specific options and hides flight-specific options", () => {
    fc.assert(
      fc.property(
        fc.constant("drive" as TravelMode),
        (mode) => {
          const { unmount } = render(
            <SettingsPanel
              onSearch={vi.fn()}
              isSearching={false}
              onSettingsChange={vi.fn()}
            />
          );

          // Click the drive radio to ensure drive mode is active
          fireEvent.click(screen.getByTestId(`travel-mode-${mode}`));

          // Drive-specific option should be visible
          expect(screen.queryByTestId("max-drive-hours")).not.toBeNull();

          // Flight-specific options should be hidden
          expect(screen.queryByTestId("direct-flights-only")).toBeNull();
          expect(screen.queryByTestId("delta-preferred")).toBeNull();

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  it("flight mode shows flight-specific options and hides drive-specific options", () => {
    fc.assert(
      fc.property(
        fc.constant("flight" as TravelMode),
        (mode) => {
          const { unmount } = render(
            <SettingsPanel
              onSearch={vi.fn()}
              isSearching={false}
              onSettingsChange={vi.fn()}
            />
          );

          // Click the flight radio to ensure flight mode is active
          fireEvent.click(screen.getByTestId(`travel-mode-${mode}`));

          // Flight-specific options should be visible
          expect(screen.queryByTestId("direct-flights-only")).not.toBeNull();
          expect(screen.queryByTestId("delta-preferred")).not.toBeNull();

          // Drive-specific option should be hidden
          expect(screen.queryByTestId("max-drive-hours")).toBeNull();

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  it("for any travel mode, only the corresponding options are visible", () => {
    fc.assert(
      fc.property(
        fc.constantFrom<TravelMode>("drive", "flight"),
        (mode) => {
          const { unmount } = render(
            <SettingsPanel
              onSearch={vi.fn()}
              isSearching={false}
              onSettingsChange={vi.fn()}
            />
          );

          fireEvent.click(screen.getByTestId(`travel-mode-${mode}`));

          if (mode === "drive") {
            // Drive-specific visible
            expect(screen.queryByTestId("max-drive-hours")).not.toBeNull();
            // Flight-specific hidden
            expect(screen.queryByTestId("direct-flights-only")).toBeNull();
            expect(screen.queryByTestId("delta-preferred")).toBeNull();
          } else {
            // Flight-specific visible
            expect(screen.queryByTestId("direct-flights-only")).not.toBeNull();
            expect(screen.queryByTestId("delta-preferred")).not.toBeNull();
            // Drive-specific hidden
            expect(screen.queryByTestId("max-drive-hours")).toBeNull();
          }

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });
});
