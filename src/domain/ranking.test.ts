import { describe, it, expect } from "vitest";
import { filterByWind, filterByTravel, rankDestinations } from "./ranking";
import type { DestinationWithData } from "../types";

const makeDriveDest = (
  name: string,
  wind: number,
  driveMinutes: number
): DestinationWithData => ({
  location: { name, latitude: 0, longitude: 0, airportCode: "TST" },
  averageWindSpeedKnots: wind,
  travelDetail: { type: "drive", durationMinutes: driveMinutes },
});

const makeFlightDest = (
  name: string,
  wind: number,
  flights: number,
  shortestMin: number
): DestinationWithData => ({
  location: { name, latitude: 0, longitude: 0, airportCode: "TST" },
  averageWindSpeedKnots: wind,
  travelDetail: { type: "flight", availableFlights: flights, shortestFlightMinutes: shortestMin },
});

describe("filterByWind", () => {
  it("removes destinations below the threshold", () => {
    const dests = [makeDriveDest("A", 20, 60), makeDriveDest("B", 10, 60)];
    const result = filterByWind(dests, 15);
    expect(result).toHaveLength(1);
    expect(result[0].location.name).toBe("A");
  });

  it("keeps destinations exactly at the threshold", () => {
    const dests = [makeDriveDest("A", 15, 60)];
    const result = filterByWind(dests, 15);
    expect(result).toHaveLength(1);
  });

  it("returns empty array when no destinations meet threshold", () => {
    const dests = [makeDriveDest("A", 5, 60), makeDriveDest("B", 3, 60)];
    const result = filterByWind(dests, 10);
    expect(result).toHaveLength(0);
  });

  it("returns all destinations when all meet threshold", () => {
    const dests = [makeDriveDest("A", 20, 60), makeDriveDest("B", 25, 60)];
    const result = filterByWind(dests, 15);
    expect(result).toHaveLength(2);
  });
});

describe("filterByTravel", () => {
  describe("drive mode", () => {
    it("removes destinations exceeding max drive hours", () => {
      const dests = [makeDriveDest("A", 20, 120), makeDriveDest("B", 20, 600)];
      const result = filterByTravel(dests, "drive", 5);
      expect(result).toHaveLength(1);
      expect(result[0].location.name).toBe("A");
    });

    it("keeps destinations exactly at the max drive limit", () => {
      const dests = [makeDriveDest("A", 20, 300)]; // 300 min = 5 hours
      const result = filterByTravel(dests, "drive", 5);
      expect(result).toHaveLength(1);
    });

    it("keeps all when maxDriveHours is undefined", () => {
      const dests = [makeDriveDest("A", 20, 9999)];
      const result = filterByTravel(dests, "drive");
      expect(result).toHaveLength(1);
    });

    it("excludes flight-type destinations in drive mode", () => {
      const dests = [makeFlightDest("A", 20, 3, 120)];
      const result = filterByTravel(dests, "drive", 8);
      expect(result).toHaveLength(0);
    });
  });

  describe("flight mode", () => {
    it("removes destinations with no available flights", () => {
      const dests = [
        makeFlightDest("A", 20, 3, 120),
        makeFlightDest("B", 20, 0, 0),
      ];
      const result = filterByTravel(dests, "flight");
      expect(result).toHaveLength(1);
      expect(result[0].location.name).toBe("A");
    });

    it("excludes drive-type destinations in flight mode", () => {
      const dests = [makeDriveDest("A", 20, 60)];
      const result = filterByTravel(dests, "flight");
      expect(result).toHaveLength(0);
    });
  });
});

describe("rankDestinations", () => {
  it("sorts by wind speed descending", () => {
    const dests = [
      makeDriveDest("Low", 10, 60),
      makeDriveDest("High", 25, 60),
      makeDriveDest("Mid", 18, 60),
    ];
    const ranked = rankDestinations(dests);
    expect(ranked.map((r) => r.locationName)).toEqual(["High", "Mid", "Low"]);
  });

  it("breaks ties by travel time ascending (drive)", () => {
    const dests = [
      makeDriveDest("Far", 20, 300),
      makeDriveDest("Close", 20, 60),
    ];
    const ranked = rankDestinations(dests);
    expect(ranked[0].locationName).toBe("Close");
    expect(ranked[1].locationName).toBe("Far");
  });

  it("breaks ties by travel time ascending (flight)", () => {
    const dests = [
      makeFlightDest("Long", 20, 2, 300),
      makeFlightDest("Short", 20, 5, 90),
    ];
    const ranked = rankDestinations(dests);
    expect(ranked[0].locationName).toBe("Short");
    expect(ranked[1].locationName).toBe("Long");
  });

  it("assigns rank starting at 1", () => {
    const dests = [makeDriveDest("A", 20, 60), makeDriveDest("B", 15, 60)];
    const ranked = rankDestinations(dests);
    expect(ranked[0].rank).toBe(1);
    expect(ranked[1].rank).toBe(2);
  });

  it("maps to RankedDestination with correct fields", () => {
    const dests = [makeDriveDest("Spot", 22, 180)];
    const ranked = rankDestinations(dests);
    expect(ranked[0]).toMatchObject({
      rank: 1,
      locationName: "Spot",
      averageWindSpeedKnots: 22,
      travelDetail: { type: "drive", durationMinutes: 180 },
    });
  });

  it("returns empty array for empty input", () => {
    expect(rankDestinations([])).toEqual([]);
  });
});
