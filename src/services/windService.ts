import type { Location, WindData } from "../types";

/**
 * Simple in-memory fetch cache with 3-hour TTL.
 * Deduplicates concurrent requests to the same URL.
 */
const CACHE_TTL_MS = 3 * 60 * 60 * 1000;
const fetchCache = new Map<string, { data: unknown; timestamp: number }>();
const inflightRequests = new Map<string, Promise<unknown>>();

/** Clears the in-memory fetch cache. Exported for testing. */
export function clearFetchCache(): void {
  fetchCache.clear();
  inflightRequests.clear();
}

async function cachedFetchJson(url: string): Promise<unknown> {
  const cached = fetchCache.get(url);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  // Deduplicate concurrent requests to the same URL
  const inflight = inflightRequests.get(url);
  if (inflight) return inflight;

  const promise = fetch(url).then(async (res) => {
    if (!res.ok) throw new Error(`API returned ${res.status}`);
    const data = await res.json();
    fetchCache.set(url, { data, timestamp: Date.now() });
    inflightRequests.delete(url);
    return data;
  }).catch((err) => {
    inflightRequests.delete(url);
    throw err;
  });

  inflightRequests.set(url, promise);
  return promise;
}

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
 * Converts Celsius to Fahrenheit.
 */
function celsiusToFahrenheit(c: number): number {
  return c * 9 / 5 + 32;
}

/**
 * Fetches wind data from the Open-Meteo API for each location over the given date range.
 * Uses hourly data filtered to daytime hours (7AM-7PM local time via timezone=auto).
 * Also fetches air temperature (daytime avg) and water temperature (from marine API).
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
      // Fetch wind + air temp (hourly, daytime filtered)
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&hourly=wind_speed_10m,temperature_2m&start_date=${start}&end_date=${end}&timezone=auto`;
      const weatherData = await cachedFetchJson(weatherUrl) as Record<string, unknown>;

      const hourly = weatherData?.hourly as Record<string, unknown> | undefined;
      const hourlyTimes = hourly?.time as string[] | undefined;
      const hourlySpeeds = hourly?.wind_speed_10m as number[] | undefined;
      const hourlyTemps = hourly?.temperature_2m as number[] | undefined;

      if (!hourlyTimes || !hourlySpeeds || hourlySpeeds.length === 0) {
        return null;
      }

      // Group hourly data by date, filtering to daytime hours (7AM-7PM local)
      const dayMap = new Map<string, number[]>();
      const daytimeTempsC: number[] = [];
      for (let i = 0; i < hourlyTimes.length; i++) {
        const timestamp = hourlyTimes[i];
        const hour = parseInt(timestamp.slice(11, 13), 10);
        if (hour < 7 || hour >= 19) continue;
        const date = timestamp.slice(0, 10);
        if (!dayMap.has(date)) dayMap.set(date, []);
        dayMap.get(date)!.push(hourlySpeeds[i]);
        if (hourlyTemps && hourlyTemps[i] != null) {
          daytimeTempsC.push(hourlyTemps[i]);
        }
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
      const averageAirTempF = daytimeTempsC.length > 0
        ? celsiusToFahrenheit(daytimeTempsC.reduce((a, b) => a + b, 0) / daytimeTempsC.length)
        : undefined;

      // Water temp from marine API (best-effort)
      let averageWaterTempF: number | undefined = undefined;
      try {
        const marineUrl = `https://marine-api.open-meteo.com/v1/marine?latitude=${location.latitude}&longitude=${location.longitude}&hourly=sea_surface_temperature&start_date=${start}&end_date=${end}&timezone=auto`;
        const marineData = await cachedFetchJson(marineUrl) as Record<string, unknown>;
        const hourly = marineData?.hourly as Record<string, unknown> | undefined;
        const waterTemps = hourly?.sea_surface_temperature as number[] | undefined;
        if (waterTemps && waterTemps.length > 0) {
          const validTemps = waterTemps.filter((t: number) => t != null && !isNaN(t));
          if (validTemps.length > 0) {
            const avgC = validTemps.reduce((a: number, b: number) => a + b, 0) / validTemps.length;
            averageWaterTempF = celsiusToFahrenheit(avgC);
          }
        }
      } catch {
        // Marine API failure is non-fatal — water temp just won't show
      }

      return {
        locationName: location.name,
        averageWindSpeedKnots,
        dailyWindKnots,
        averageAirTempF,
        averageWaterTempF,
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
