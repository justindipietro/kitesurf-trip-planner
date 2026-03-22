import { useState, useEffect, useCallback } from "react";
import "./App.css";
import { SettingsPanel } from "./components/SettingsPanel";
import { ResultsList } from "./components/ResultsList";
import { loadLocationCatalog } from "./data/locations";
import { fetchWindData } from "./services/windService";
import { fetchDriveData, fetchFlightData } from "./services/travelService";
import { filterByWind, filterByTravel, rankDestinations } from "./domain/ranking";
import type {
  SearchRequest,
  RankedDestination,
  TravelMode,
  DestinationWithData,
  DriveDetail,
  FlightDetail,
} from "./types";

function App() {
  const [results, setResults] = useState<RankedDestination[] | null>(null);
  const [travelMode, setTravelMode] = useState<TravelMode>("drive");
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [catalogAvailable, setCatalogAvailable] = useState(true);
  const [searchOrigin, setSearchOrigin] = useState("");

  useEffect(() => {
    try {
      loadLocationCatalog();
    } catch {
      setError("Destination data unavailable");
      setCatalogAvailable(false);
    }
  }, []);

  const handleSearch = useCallback(async (request: SearchRequest) => {
    setIsSearching(true);
    setResults(null);
    setError(null);
    setMessage(null);

    try {
      const locations = loadLocationCatalog();
      setTravelMode(request.travelMode);
      setSearchOrigin(request.origin);

      const [windData, travelData] = await Promise.all([
        fetchWindData(locations, request.startDate, request.endDate),
        request.travelMode === "drive"
          ? fetchDriveData(request.origin, locations)
          : fetchFlightData(
              request.origin,
              locations,
              request.startDate,
              request.endDate,
              request.directFlightsOnly ?? true,
              request.deltaPreferred ?? true
            ),
      ]);

      // Combine wind data and travel data into DestinationWithData array
      const destinations: DestinationWithData[] = [];

      for (const wind of windData) {
        const location = locations.find((l) => l.name === wind.locationName);
        if (!location) continue;

        let travelDetail: DriveDetail | FlightDetail | undefined;

        if (request.travelMode === "drive") {
          const drive = (travelData as Awaited<ReturnType<typeof fetchDriveData>>).find(
            (d) => d.locationName === wind.locationName
          );
          if (!drive) continue;
          travelDetail = {
            type: "drive",
            durationMinutes: drive.durationMinutes,
          };
        } else {
          const flight = (travelData as Awaited<ReturnType<typeof fetchFlightData>>).find(
            (f) => f.locationName === wind.locationName
          );
          if (!flight) continue;
          const shortest = Math.min(...flight.flights.map((f) => f.durationMinutes));
          const lowestPrice = Math.min(...flight.flights.map((f) => f.priceUsd));
          travelDetail = {
            type: "flight",
            availableFlights: flight.flights.length,
            shortestFlightMinutes: shortest,
            lowestPriceUsd: lowestPrice,
            flights: flight.flights,
          };
        }

        destinations.push({
          location,
          averageWindSpeedKnots: wind.averageWindSpeedKnots,
          travelDetail,
          dailyWindKnots: wind.dailyWindKnots,
        });
      }

      // Filter and rank
      const afterWind = filterByWind(destinations, request.windThresholdKnots);
      const afterTravel = filterByTravel(
        afterWind,
        request.travelMode,
        request.maxDriveHours,
        request.maxFlightHours
      );
      const ranked = rankDestinations(afterTravel);

      setResults(ranked);
      setHasSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSettingsChange = useCallback(() => {
    if (hasSearched) {
      setResults(null);
      setMessage("Settings changed. Please search again.");
    }
  }, [hasSearched]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>🪁 Kitesurf Trip Planner</h1>
        <p>Find the windiest spots for Justin, Dan and Rich's next session</p>
      </header>
      <div className="app-layout">
        <div className="app-left">
          <SettingsPanel
            onSearch={handleSearch}
            isSearching={isSearching || !catalogAvailable}
            onSettingsChange={handleSettingsChange}
          />
        </div>
        <div className="app-right">
          {isSearching && <div className="loading" data-testid="loading-indicator">Searching</div>}
          <ResultsList
            results={results}
            travelMode={travelMode}
            message={message}
            error={error}
            origin={searchOrigin}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
