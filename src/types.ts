/** Travel mode enum */
export type TravelMode = "drive" | "flight";

/** User-configured search settings */
export interface SearchSettings {
  origin: string;
  travelMode: TravelMode;
  windThresholdKnots: number;
  startDate: Date;
  endDate: Date;
  // Drive mode
  maxDriveHours?: number;
  // Flight mode
  maxFlightHours?: number;
  directFlightsOnly?: boolean;
  deltaPreferred?: boolean;
}

/** Validated search request passed to services */
export interface SearchRequest {
  origin: string;
  travelMode: TravelMode;
  windThresholdKnots: number;
  startDate: Date;
  endDate: Date;
  maxDriveHours?: number;
  maxFlightHours?: number;
  directFlightsOnly?: boolean;
  deltaPreferred?: boolean;
}

/** A kitesurfing destination in the catalog */
export interface Location {
  name: string;
  latitude: number;
  longitude: number;
  airportCode: string;
}

/** Wind data returned by the Wind Service */
export interface WindData {
  locationName: string;
  averageWindSpeedKnots: number;
  dailyWindKnots?: DailyWind[];
}

/** Daily wind speed for a single day */
export interface DailyWind {
  date: string; // YYYY-MM-DD
  windSpeedKnots: number;
}

/** Drive data returned by the Travel Service */
export interface DriveData {
  locationName: string;
  durationMinutes: number;
}

/** Flight data returned by the Travel Service */
export interface FlightData {
  locationName: string;
  flights: Flight[];
}

/** A single flight option */
export interface Flight {
  airline: string;
  durationMinutes: number;
  isDirect: boolean;
  priceUsd: number;
}

/** Travel detail for driving */
export interface DriveDetail {
  type: "drive";
  durationMinutes: number;
}

/** Travel detail for flying */
export interface FlightDetail {
  type: "flight";
  availableFlights: number;
  shortestFlightMinutes: number;
  flights?: Flight[];
}

/** A catalog location enriched with fetched data */
export interface DestinationWithData {
  location: Location;
  averageWindSpeedKnots: number;
  travelDetail: DriveDetail | FlightDetail;
  dailyWindKnots?: DailyWind[];
}

/** Final ranked result for display */
export interface RankedDestination {
  rank: number;
  locationName: string;
  averageWindSpeedKnots: number;
  travelDetail: DriveDetail | FlightDetail;
  dailyWindKnots?: DailyWind[];
  location?: Location;
}

/** Validation result returned by the validation module */
export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}
