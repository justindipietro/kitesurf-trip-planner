import { describe, it, expect } from "vitest";
import {
  validateOrigin,
  validateDriveDuration,
  validateWindThreshold,
  validateDateRange,
  validateSearchSettings,
} from "./validation";

describe("validateOrigin", () => {
  it("accepts a known catalog location name", () => {
    expect(validateOrigin("Tarifa, Spain")).toBe(true);
  });

  it("accepts a catalog airport code", () => {
    expect(validateOrigin("POP")).toBe(true);
  });

  it("accepts a common US city", () => {
    expect(validateOrigin("New York")).toBe(true);
  });

  it("accepts a common US airport code", () => {
    expect(validateOrigin("JFK")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(validateOrigin("new york")).toBe(true);
    expect(validateOrigin("jfk")).toBe(true);
    expect(validateOrigin("TARIFA, SPAIN")).toBe(true);
  });

  it("rejects an unknown origin", () => {
    expect(validateOrigin("Narnia")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(validateOrigin("")).toBe(false);
  });

  it("rejects whitespace-only string", () => {
    expect(validateOrigin("   ")).toBe(false);
  });
});

describe("validateDriveDuration", () => {
  it("accepts 1 (lower bound)", () => {
    expect(validateDriveDuration(1)).toBe(true);
  });

  it("accepts 24 (upper bound)", () => {
    expect(validateDriveDuration(24)).toBe(true);
  });

  it("accepts 8 (default)", () => {
    expect(validateDriveDuration(8)).toBe(true);
  });

  it("rejects 0", () => {
    expect(validateDriveDuration(0)).toBe(false);
  });

  it("rejects 25", () => {
    expect(validateDriveDuration(25)).toBe(false);
  });

  it("rejects non-integer", () => {
    expect(validateDriveDuration(5.5)).toBe(false);
  });

  it("rejects negative", () => {
    expect(validateDriveDuration(-1)).toBe(false);
  });
});

describe("validateWindThreshold", () => {
  it("accepts 5 (lower bound)", () => {
    expect(validateWindThreshold(5)).toBe(true);
  });

  it("accepts 50 (upper bound)", () => {
    expect(validateWindThreshold(50)).toBe(true);
  });

  it("accepts 15 (default)", () => {
    expect(validateWindThreshold(15)).toBe(true);
  });

  it("rejects 4", () => {
    expect(validateWindThreshold(4)).toBe(false);
  });

  it("rejects 51", () => {
    expect(validateWindThreshold(51)).toBe(false);
  });

  it("rejects non-integer", () => {
    expect(validateWindThreshold(10.5)).toBe(false);
  });
});

describe("validateDateRange", () => {
  it("accepts a valid same-day range starting today", () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const result = validateDateRange(today, today);
    expect(result.valid).toBe(true);
    expect(Object.keys(result.errors)).toHaveLength(0);
  });

  it("accepts exactly 16-day range", () => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 16);
    const result = validateDateRange(start, end);
    expect(result.valid).toBe(true);
  });

  it("rejects start date in the past", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const result = validateDateRange(yesterday, today);
    expect(result.valid).toBe(false);
    expect(result.errors.startDate).toBeDefined();
  });

  it("rejects end date before start date", () => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() - 1);
    const result = validateDateRange(start, end);
    expect(result.valid).toBe(false);
    expect(result.errors.endDate).toBeDefined();
  });

  it("rejects range exceeding 16 days", () => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 17);
    const result = validateDateRange(start, end);
    expect(result.valid).toBe(false);
    expect(result.errors.dateRange).toBeDefined();
  });
});

describe("validateSearchSettings", () => {
  function validSettings(): import("../types").SearchSettings {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 3);
    return {
      origin: "New York",
      travelMode: "drive",
      windThresholdKnots: 15,
      startDate: start,
      endDate: end,
      maxDriveHours: 8,
    };
  }

  it("returns valid for correct settings", () => {
    const result = validateSearchSettings(validSettings());
    expect(result.valid).toBe(true);
    expect(Object.keys(result.errors)).toHaveLength(0);
  });

  it("returns error for invalid origin", () => {
    const s = validSettings();
    s.origin = "Narnia";
    const result = validateSearchSettings(s);
    expect(result.valid).toBe(false);
    expect(result.errors.origin).toBeDefined();
  });

  it("returns error for invalid wind threshold", () => {
    const s = validSettings();
    s.windThresholdKnots = 100;
    const result = validateSearchSettings(s);
    expect(result.valid).toBe(false);
    expect(result.errors.windThresholdKnots).toBeDefined();
  });

  it("returns error for invalid drive duration in drive mode", () => {
    const s = validSettings();
    s.maxDriveHours = 30;
    const result = validateSearchSettings(s);
    expect(result.valid).toBe(false);
    expect(result.errors.maxDriveHours).toBeDefined();
  });

  it("does not validate drive duration in flight mode", () => {
    const s = validSettings();
    s.travelMode = "flight";
    s.maxDriveHours = 999;
    const result = validateSearchSettings(s);
    expect(result.valid).toBe(true);
  });

  it("aggregates multiple errors", () => {
    const s = validSettings();
    s.origin = "";
    s.windThresholdKnots = 0;
    const result = validateSearchSettings(s);
    expect(result.valid).toBe(false);
    expect(result.errors.origin).toBeDefined();
    expect(result.errors.windThresholdKnots).toBeDefined();
  });
});
