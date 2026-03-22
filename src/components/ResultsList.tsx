import { useState } from "react";
import type { RankedDestination, TravelMode } from "../types";
import { DestinationDetail } from "./DestinationDetail";

interface ResultsListProps {
  results: RankedDestination[] | null;
  travelMode: TravelMode;
  message: string | null;
  error: string | null;
  origin?: string;
}

function formatDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);
  return `${hours}h ${minutes}m`;
}

export function ResultsList({
  results,
  travelMode: _travelMode,
  message,
  error,
  origin,
}: ResultsListProps) {
  const [selectedRank, setSelectedRank] = useState<number | null>(null);

  if (error) {
    return (
      <div data-testid="error-banner" className="error-banner">
        {error}
      </div>
    );
  }

  if (message) {
    return (
      <div data-testid="results-message" className="results-message">
        {message}
      </div>
    );
  }

  if (!results || results.length === 0) {
    return (
      <div data-testid="no-results" className="no-results">
        No matching locations found
      </div>
    );
  }

  const selected = selectedRank !== null
    ? results.find((d) => d.rank === selectedRank)
    : null;

  if (selected) {
    return (
      <DestinationDetail
        destination={selected}
        origin={origin ?? ""}
        onBack={() => setSelectedRank(null)}
      />
    );
  }

  return (
    <ul className="results-list">
      {results.map((dest) => (
        <li
          key={dest.rank}
          className="result-card clickable"
          data-testid="result-item"
          onClick={() => setSelectedRank(dest.rank)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setSelectedRank(dest.rank); }}
        >
          <span className="result-rank">{dest.rank}</span>
          <div className="result-info">
            <div className="result-location" data-testid="location-name">
              {dest.locationName}
            </div>
            <div className="result-details">
              <span className="result-wind" data-testid="wind-speed">
                💨 <span className="wind-value">{dest.averageWindSpeedKnots.toFixed(1)}</span> knots
              </span>
              {dest.travelDetail.type === "drive" && (
                <span className="result-travel" data-testid="drive-duration">
                  🚗 {formatDuration(dest.travelDetail.durationMinutes)}
                </span>
              )}
              {dest.travelDetail.type === "flight" && (
                <>
                  <span className="result-travel" data-testid="flight-count">
                    ✈️ {dest.travelDetail.availableFlights} flight{dest.travelDetail.availableFlights !== 1 ? "s" : ""}
                  </span>
                  <span className="result-travel" data-testid="flight-duration">
                    ⏱ {formatDuration(dest.travelDetail.shortestFlightMinutes)}
                  </span>
                </>
              )}
            </div>
          </div>
          <span className="result-chevron">›</span>
        </li>
      ))}
    </ul>
  );
}
