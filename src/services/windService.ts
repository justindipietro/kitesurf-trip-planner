import type { Location, WindData } from "../types";

/**
 * Formats a Date as a YYYY-MM-DD string for the Open-Meteo API.
 */
function formatDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Calculates the average of an array of wind speeds.
 * Returns the sum divided by the count.
 */
export function calculateAverageWindSpeed(dailySpeeds: number[]): number {
  if (dailySpeeds.length === 0) {
    return 0;
  }
  const sum = dailySpeeds.reduce((acc, speed) => acc + speed, 0);
  return sum / dailySpeeds.length;
}

/**
 * Fetches wind data from the Open-Meteo API for each location over the given date range.
 * Uses hourly data filtered to daytime hours (7AM-7PM local time via timezone=auto).
 * Converts wind speeds from km/h to knots (divide by 1.852).
 * Excludes locations where the API returns no data.
 * Throws if the API is entirely unavailable (all requests fail).
 */
export async function fetchWindData(
  locations: Location[],
  startDate: Date,
  endDate: Date
): Promise<WindData[]> {
  const start = formatDate(startDate);
  const end = formatDate(endDate);

  const results = await Promise.allSettled(
    locations.map(async (location) => {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&hourly=wind_speed_10m&start_date=${start}&end_date=${end}&timezone=auto`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`API returned ${response.status} for ${location.name}`);
      }
      const data = await response.json();

      const hourlyTimes: string[] | undefined = data?.hourly?.time;
      const hourlySpeeds: number[] | undefined = data?.hourly?.wind_speed_10m;

      if (!hourlyTimes || !hourlySpeeds || hourlySpeeds.length === 0) {
        return null;
      }

      // Group hourly data by date, filtering to daytime hours (7AM-7PM local)
      const dayMap = new Map<string, number[]>();
      for (let i = 0; i < hourlyTimes.length; i++) {
        const timestamp = hourlyTimes[i]; // e.g. "2025-07-01T08:00"
        const hour = parseInt(timestamp.slice(11, 13), 10);
        if (hour < 7 || hour >= 19) continue; // skip nighttime
        const date = timestamp.slice(0, 10);
        if (!dayMap.has(date)) dayMap.set(date, []);
        dayMap.get(date)!.push(hourlySpeeds[i]);
      }

      // Build daily wind breakdown from daytime averages
      const dailyWindKnots: { date: string; windSpeedKnots: number }[] = [];
      const allDaytimeSpeedsKnots: number[] = [];

      for (const [date, speeds] of dayMap) {
        const avgKmh = speeds.reduce((a, b) => a + b, 0) / speeds.length;
        const avgKnots = avgKmh / 1.852;
        dailyWindKnots.push({ date, windSpeedKnots: avgKnots });
        allDaytimeSpeedsKnots.push(avgKnots);
      }

      if (allDaytimeSpeedsKnots.length === 0) return null;

      const averageWindSpeedKnots = calculateAverageWindSpeed(allDaytimeSpeedsKnots);

      return {
        locationName: location.name,
        averageWindSpeedKnots,
        dailyWindKnots,
      } as WindData;
    })
  );

  const allFailed = results.every((r) => r.status === "rejected");
  if (allFailed) {
    throw new Error("Wind data could not be retrieved");
  }

  const windData: WindData[] = [];
  for (const result of results) {
    if (result.status === "fulfilled" && result.value !== null) {
      windData.push(result.value);
    }
  }

  return windData;
}
