import type { RankedDestination } from "../types";

interface DestinationDetailProps {
  destination: RankedDestination;
  origin: string;
  onBack: () => void;
}

function formatDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);
  return `${hours}h ${minutes}m`;
}

function formatDay(dateStr: string): { weekday: string; date: string } {
  const d = new Date(dateStr + "T12:00:00");
  return {
    weekday: d.toLocaleDateString("en-US", { weekday: "short" }),
    date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  };
}

function windLabel(knots: number): { text: string; className: string } {
  if (knots >= 25) return { text: "Epic", className: "wind-epic" };
  if (knots >= 18) return { text: "Good", className: "wind-good" };
  if (knots >= 12) return { text: "Light", className: "wind-light" };
  return { text: "Weak", className: "wind-weak" };
}

function windBarColor(knots: number): string {
  if (knots >= 25) return "var(--accent)";
  if (knots >= 18) return "var(--success)";
  if (knots >= 12) return "var(--primary)";
  return "var(--surface-light)";
}

function googleMapsUrl(origin: string, destName: string): string {
  return `https://www.google.com/maps/dir/${encodeURIComponent(origin)}/${encodeURIComponent(destName)}`;
}

function googleFlightsUrl(origin: string, airportCode: string): string {
  return `https://www.google.com/travel/flights?q=flights+from+${encodeURIComponent(origin)}+to+${encodeURIComponent(airportCode)}`;
}

function windyUrl(lat: number, lon: number): string {
  return `https://www.windy.com/${lat}/${lon}?wind`;
}

function airlineBookUrl(airline: string, origin: string, dest: string): string {
  const sites: Record<string, string> = {
    Delta: "https://www.delta.com",
    United: "https://www.united.com",
    American: "https://www.aa.com",
    JetBlue: "https://www.jetblue.com",
    Southwest: "https://www.southwest.com",
  };
  return sites[airline] ?? `https://www.google.com/travel/flights?q=flights+from+${encodeURIComponent(origin)}+to+${encodeURIComponent(dest)}`;
}

export function DestinationDetail({ destination, origin, onBack }: DestinationDetailProps) {
  const { dailyWindKnots, travelDetail, location } = destination;
  const maxWind = dailyWindKnots
    ? Math.max(...dailyWindKnots.map((d) => d.windSpeedKnots), 1)
    : 1;

  const goodDays = dailyWindKnots?.filter((d) => d.windSpeedKnots >= 18).length ?? 0;
  const totalDays = dailyWindKnots?.length ?? 0;

  return (
    <div className="detail-panel">
      <button type="button" className="detail-back" onClick={onBack}>
        ← Back to results
      </button>

      {/* Hero header */}
      <div className="detail-hero">
        <div className="detail-hero-left">
          <h2 className="detail-title">{destination.locationName}</h2>
          {location && (
            <span className="detail-airport">{location.airportCode}</span>
          )}
        </div>
        <div className="detail-hero-right">
          <div className="detail-stat">
            <span className="detail-stat-value">{destination.averageWindSpeedKnots.toFixed(1)}</span>
            <span className="detail-stat-unit">avg knots</span>
          </div>
          {totalDays > 0 && (
            <div className="detail-stat">
              <span className="detail-stat-value">{goodDays}/{totalDays}</span>
              <span className="detail-stat-unit">good days</span>
            </div>
          )}
        </div>
      </div>

      {/* External links bar */}
      <div className="detail-links-bar">
        {location && (
          <a
            className="detail-chip-link"
            href={windyUrl(location.latitude, location.longitude)}
            target="_blank"
            rel="noopener noreferrer"
          >
            🌊 Windy.com
          </a>
        )}
        {travelDetail.type === "drive" && (
          <a
            className="detail-chip-link"
            href={googleMapsUrl(origin, destination.locationName)}
            target="_blank"
            rel="noopener noreferrer"
          >
            🗺️ Google Maps
          </a>
        )}
        {travelDetail.type === "flight" && location && (
          <a
            className="detail-chip-link"
            href={googleFlightsUrl(origin, location.airportCode)}
            target="_blank"
            rel="noopener noreferrer"
          >
            ✈️ Google Flights
          </a>
        )}
      </div>

      {/* Wind forecast section */}
      <div className="detail-section">
        <div className="detail-section-header">
          <h3>💨 Wind Forecast</h3>
        </div>
        {dailyWindKnots && dailyWindKnots.length > 0 ? (
          <div className="wind-chart">
            {dailyWindKnots.map((day) => {
              const label = windLabel(day.windSpeedKnots);
              const dayInfo = formatDay(day.date);
              return (
                <div key={day.date} className="wind-bar-row">
                  <div className="wind-bar-day">
                    <span className="wind-bar-weekday">{dayInfo.weekday}</span>
                    <span className="wind-bar-date">{dayInfo.date}</span>
                  </div>
                  <div className="wind-bar-track">
                    <div
                      className="wind-bar-fill"
                      style={{
                        width: `${Math.max((day.windSpeedKnots / maxWind) * 100, 3)}%`,
                        background: windBarColor(day.windSpeedKnots),
                      }}
                    />
                  </div>
                  <span className="wind-bar-value">
                    {day.windSpeedKnots.toFixed(1)}
                  </span>
                  <span className={`wind-bar-badge ${label.className}`}>
                    {label.text}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="detail-empty">Daily forecast not available</p>
        )}
      </div>

      {/* Travel section */}
      <div className="detail-section">
        {travelDetail.type === "drive" && (
          <>
            <div className="detail-section-header">
              <h3>🚗 Driving</h3>
            </div>
            <div className="detail-drive-card">
              <div className="drive-stat-row">
                <div className="drive-stat">
                  <span className="drive-stat-value">{formatDuration(travelDetail.durationMinutes)}</span>
                  <span className="drive-stat-label">estimated drive</span>
                </div>
                <div className="drive-stat">
                  <span className="drive-stat-value">{Math.round(travelDetail.durationMinutes * 80 / 60)} km</span>
                  <span className="drive-stat-label">distance</span>
                </div>
              </div>
              <a
                className="detail-action-btn"
                href={googleMapsUrl(origin, destination.locationName)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Get Directions on Google Maps ↗
              </a>
            </div>
          </>
        )}

        {travelDetail.type === "flight" && travelDetail.flights && (
          <>
            <div className="detail-section-header">
              <h3>✈️ Flight Options</h3>
              <span className="detail-section-count">
                {travelDetail.flights.length} option{travelDetail.flights.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flight-cards">
              {travelDetail.flights.map((f, i) => (
                <div key={i} className="flight-card">
                  <div className="flight-card-top">
                    <span className="flight-airline">{f.airline}</span>
                    <span className={`flight-badge ${f.isDirect ? "direct" : "connecting"}`}>
                      {f.isDirect ? "Direct" : "1+ stop"}
                    </span>
                  </div>
                  <div className="flight-card-body">
                    <div className="flight-detail">
                      <span className="flight-detail-label">Duration</span>
                      <span className="flight-detail-value">{formatDuration(f.durationMinutes)}</span>
                    </div>
                    <div className="flight-detail">
                      <span className="flight-detail-label">From</span>
                      <span className="flight-detail-value flight-price">${f.priceUsd}</span>
                    </div>
                  </div>
                  <a
                    className="flight-book-link"
                    href={airlineBookUrl(f.airline, origin, location?.airportCode ?? destination.locationName)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Book on {f.airline} ↗
                  </a>
                </div>
              ))}
            </div>
            {location && (
              <a
                className="detail-action-btn secondary"
                href={googleFlightsUrl(origin, location.airportCode)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Compare all flights on Google Flights ↗
              </a>
            )}
          </>
        )}
      </div>
    </div>
  );
}
