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
      const weatherResponse = await fetch(weatherUrl);
      if (!weatherResponse.ok) {
        throw new Error(`API returned ${weatherResponse.status} for ${location.name}`);
      }
      const weatherData = await weatherResponse.json();

      const hourlyTimes: string[] | undefined = weatherData?.hourly?.time;
      const hourlySpeeds: number[] | undefined = weatherData?.hourly?.wind_speed_10m;
      const hourlyTemps: number[] | undefined = weatherData?.hourly?.temperature_2m;

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

      // Fetch water temp from marine API (best effort)
      let averageWaterTempF: number | undefined;
      try {
        const marineUrl = `https://marine-api.open-meteo.com/v1/marine?latitude=${location.latitude}&longitude=${location.longitude}&daily=wave_height_max,ocean_temperature_2m_max&start_date=${start}&end_date=${end}&timezone=auto`;
        const marineResponse = await fetch(marineUrl);
        if (marineResponse.ok) {
          const marineData = await marineResponse.json();
          const waterTemps: number[] | undefined = marineData?.daily?.ocean_temperature_2m_max;
          if (waterTemps && waterTemps.length > 0) {
            const validTemps = waterTemps.filter((t: number) => t != null);
            if (validTemps.length > 0) {
              const avgC = validTemps.reduce((a: number, b: number) => a + b, 0) / validTemps.length;
              averageWaterTempF = celsiusToFahrenheit(avgC);
            }
          }
        }
      } catch {
        // Water temp is best-effort, don't fail the whole location
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
