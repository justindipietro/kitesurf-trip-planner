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
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&daily=wind_speed_10m_max&start_date=${start}&end_date=${end}&timezone=auto`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`API returned ${response.status} for ${location.name}`);
      }
      const data = await response.json();

      const dailySpeeds: number[] | undefined =
        data?.daily?.wind_speed_10m_max;

      if (!dailySpeeds || dailySpeeds.length === 0) {
        return null;
      }

      const speedsInKnots = dailySpeeds.map((speed: number) => speed / 1.852);
      const averageWindSpeedKnots = calculateAverageWindSpeed(speedsInKnots);

      // Build daily wind breakdown
      const dates: string[] | undefined = data?.daily?.time;
      const dailyWindKnots = dates
        ? dates.map((date: string, i: number) => ({
            date,
            windSpeedKnots: speedsInKnots[i] ?? 0,
          }))
        : [];

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
