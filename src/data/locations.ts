import type { Location } from "../types";

/**
 * Static catalog of kitesurfing destinations.
 * Top 50 locations within ~8 hours of NYC, ranked by wind quality.
 */
export const LOCATION_CATALOG: Location[] = [
  // Caribbean
  { name: "Cabarete, Dominican Republic", latitude: 19.758, longitude: -70.4083, airportCode: "POP" },
  { name: "Bonaire, Netherlands Antilles", latitude: 12.1443, longitude: -68.2655, airportCode: "BON" },
  { name: "Aruba", latitude: 12.5211, longitude: -69.9683, airportCode: "AUA" },
  { name: "Long Bay Beach, Turks & Caicos", latitude: 21.7937, longitude: -72.1694, airportCode: "PLS" },
  { name: "Playa Jobos, Puerto Rico", latitude: 18.5088, longitude: -67.1518, airportCode: "BQN" },
  { name: "Crash Boat Beach, Puerto Rico", latitude: 18.4937, longitude: -67.1647, airportCode: "BQN" },
  { name: "Silver Sands, Barbados", latitude: 13.0494, longitude: -59.5283, airportCode: "BGI" },
  { name: "Orient Bay, St. Martin", latitude: 18.1058, longitude: -63.0137, airportCode: "SXM" },
  { name: "Jabberwock Beach, Antigua", latitude: 17.1489, longitude: -61.8206, airportCode: "ANU" },
  { name: "Le Moule, Guadeloupe", latitude: 16.3333, longitude: -61.3500, airportCode: "PTP" },
  { name: "Le Vauclin, Martinique", latitude: 14.5500, longitude: -60.8333, airportCode: "FDF" },
  { name: "Levera Beach, Grenada", latitude: 12.2272, longitude: -61.6100, airportCode: "GND" },
  { name: "Long Bay, Jamaica", latitude: 18.1833, longitude: -76.1833, airportCode: "KIN" },
  { name: "Green Turtle Cay, Bahamas", latitude: 26.7667, longitude: -77.3333, airportCode: "NAS" },
  { name: "Long Island, Bahamas", latitude: 23.0833, longitude: -75.0833, airportCode: "NAS" },
  { name: "South Shore, Bermuda", latitude: 32.2833, longitude: -64.7833, airportCode: "BDA" },
  { name: "Carenage Bay, Trinidad", latitude: 10.6667, longitude: -61.5167, airportCode: "POS" },
  // Eastern USA & Canada
  { name: "Cape Hatteras, North Carolina", latitude: 35.2293, longitude: -75.5244, airportCode: "ORF" },
  { name: "Outer Banks, North Carolina", latitude: 35.5585, longitude: -75.4665, airportCode: "ORF" },
  { name: "Corpus Christi, Texas", latitude: 27.8006, longitude: -97.3964, airportCode: "CRP" },
  { name: "Key West, Florida", latitude: 24.5551, longitude: -81.7800, airportCode: "EYW" },
  { name: "Sarasota, Florida", latitude: 27.3364, longitude: -82.5307, airportCode: "SRQ" },
  { name: "Virginia Beach, Virginia", latitude: 36.8529, longitude: -75.9780, airportCode: "ORF" },
  { name: "Cape Cod, Massachusetts", latitude: 41.6688, longitude: -70.2962, airportCode: "HYA" },
  { name: "Squamish, Canada", latitude: 49.7016, longitude: -123.1558, airportCode: "YVR" },

  // Pacific USA & Mexico
  { name: "Hood River, Oregon", latitude: 45.7054, longitude: -121.5215, airportCode: "PDX" },
  { name: "San Francisco Bay, California", latitude: 37.8044, longitude: -122.4700, airportCode: "SFO" },
  { name: "La Ventana, Mexico", latitude: 24.0500, longitude: -109.9833, airportCode: "SJD" },
  { name: "Los Barriles, Mexico", latitude: 23.5500, longitude: -109.6833, airportCode: "SJD" },
  { name: "La Paz, Mexico", latitude: 24.1426, longitude: -110.3128, airportCode: "LAP" },
  { name: "Holbox Island, Mexico", latitude: 21.5233, longitude: -87.3792, airportCode: "CUN" },
  { name: "Isla Mujeres, Mexico", latitude: 21.2320, longitude: -86.7318, airportCode: "CUN" },
  { name: "Sayulita, Mexico", latitude: 20.8691, longitude: -105.4410, airportCode: "PVR" },
  { name: "Barra de la Cruz, Mexico", latitude: 15.8333, longitude: -95.9667, airportCode: "HUX" },

  // South & Central America
  { name: "El Yaque, Venezuela", latitude: 10.9500, longitude: -63.9167, airportCode: "PMV" },
  { name: "Santa Marta, Colombia", latitude: 11.2408, longitude: -74.1990, airportCode: "SMR" },
  { name: "Cartagena, Colombia", latitude: 10.3910, longitude: -75.5144, airportCode: "CTG" },
  { name: "Bocas del Toro, Panama", latitude: 9.3403, longitude: -82.2419, airportCode: "BOC" },
  { name: "Lake Arenal, Costa Rica", latitude: 10.5000, longitude: -84.9167, airportCode: "SJO" },
  { name: "Las Penitas, Nicaragua", latitude: 12.3833, longitude: -86.9500, airportCode: "MGA" },
  { name: "Ambergris Caye, Belize", latitude: 18.0000, longitude: -87.9500, airportCode: "BZE" },
  { name: "Cumbuco, Brazil", latitude: -3.6167, longitude: -38.7333, airportCode: "FOR" },
  { name: "Barra Grande, Brazil", latitude: -2.9000, longitude: -41.4000, airportCode: "THE" },

  // Atlantic Islands & Europe
  { name: "Azores, Portugal", latitude: 38.7167, longitude: -27.2167, airportCode: "PDL" },
  { name: "Sagres, Portugal", latitude: 37.0086, longitude: -8.9403, airportCode: "FAO" },
  { name: "Guincho, Portugal", latitude: 38.7292, longitude: -9.4742, airportCode: "LIS" },
  { name: "Essaouira, Morocco", latitude: 31.5085, longitude: -9.7595, airportCode: "ESU" },
  { name: "Achill Island, Ireland", latitude: 53.9667, longitude: -10.0833, airportCode: "KNO" },
  { name: "Tiree Island, Scotland", latitude: 56.5000, longitude: -6.8833, airportCode: "TRE" },
  { name: "Tarifa, Spain", latitude: 36.0143, longitude: -5.6044, airportCode: "AGP" },
];

/**
 * Loads the location catalog.
 * @returns The array of kitesurfing destinations.
 * @throws Error if the catalog is empty.
 */
export function loadLocationCatalog(): Location[] {
  if (LOCATION_CATALOG.length === 0) {
    throw new Error("Destination data is unavailable");
  }
  return LOCATION_CATALOG;
}
