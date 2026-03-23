import { useState } from "react";
import type { RankedDestination } from "../types";
import { getWetsuitRecommendation } from "../domain/wetsuit";

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
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
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
          {destination.averageAirTempF != null && (
            <div className="detail-stat">
              <span className="detail-stat-value">{Math.round(destination.averageAirTempF)}°F</span>
              <span className="detail-stat-unit">air temp</span>
            </div>
          )}
          {destination.averageWaterTempF != null && (
            <div className="detail-stat">
              <span className="detail-stat-value">{Math.round(destination.averageWaterTempF)}°F</span>
              <span className="detail-stat-unit">water temp</span>
            </div>
          )}
          {destination.averageWaterTempF != null && (() => {
            const rec = getWetsuitRecommendation(destination.averageWaterTempF);
            return (
              <div className="detail-stat wetsuit-stat">
                <span className="detail-stat-value wetsuit-value">🩱</span>
                <span className="detail-stat-unit">{rec.label}</span>
                <span className="wetsuit-tooltip">
                  <span className="wetsuit-tooltip-title">{rec.label} ({rec.thickness})</span>
                  <span className="wetsuit-tooltip-note">{rec.notes}</span>
                  {rec.details.map((d, i) => (
                    <span key={i} className="wetsuit-tooltip-detail">• {d}</span>
                  ))}
                </span>
              </div>
            );
          })()}
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
              const isExpanded = expandedDay === day.date;
              const hasHourly = day.hourly && day.hourly.length > 0;
              const maxHourlyWind = hasHourly
                ? Math.max(...day.hourly!.map((h) => h.windSpeedKnots), 1)
                : 1;
              return (
                <div key={day.date} className="wind-day-group">
                  <div
                    className={`wind-bar-row ${hasHourly ? "clickable" : ""}`}
                    onClick={() => hasHourly && setExpandedDay(isExpanded ? null : day.date)}
                    role={hasHourly ? "button" : undefined}
                    tabIndex={hasHourly ? 0 : undefined}
                    onKeyDown={hasHourly ? (e) => { if (e.key === "Enter" || e.key === " ") setExpandedDay(isExpanded ? null : day.date); } : undefined}
                  >
                    <div className="wind-bar-day">
                      <span className="wind-bar-weekday">
                        {hasHourly && <span className={`wind-expand-icon ${isExpanded ? "open" : ""}`}>▸</span>}
                        {dayInfo.weekday}
                      </span>
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
                  {isExpanded && day.hourly && (
                    <div className="hourly-wind-panel">
                      {day.hourly.map((h) => {
                        const hLabel = windLabel(h.windSpeedKnots);
                        const ampm = h.hour < 12 ? "AM" : "PM";
                        const displayHour = h.hour === 0 ? 12 : h.hour > 12 ? h.hour - 12 : h.hour;
                        return (
                          <div key={h.hour} className="hourly-wind-row">
                            <span className="hourly-time">{displayHour}{ampm}</span>
                            <div className="hourly-bar-track">
                              <div
                                className="hourly-bar-fill"
                                style={{
                                  width: `${Math.max((h.windSpeedKnots / maxHourlyWind) * 100, 3)}%`,
                                  background: windBarColor(h.windSpeedKnots),
                                }}
                              />
                            </div>
                            <span className="hourly-value">{h.windSpeedKnots.toFixed(1)}</span>
                            <span className={`hourly-badge ${hLabel.className}`}>{hLabel.text}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="detail-empty">Daily forecast not available</p>
        )}
      </div>

      {/* Travel section */}
      {destination.averageWaterTempF != null && (() => {
        const rec = getWetsuitRecommendation(destination.averageWaterTempF);
        return (
          <div className="detail-section">
            <div className="detail-section-header">
              <h3>🩱 Wetsuit Recommendation</h3>
            </div>
            <div className="wetsuit-card">
              <div className="wetsuit-card-top">
                <span className="wetsuit-card-label">{rec.label}</span>
                <span className="wetsuit-card-thickness">{rec.thickness}</span>
              </div>
              <p className="wetsuit-card-note">{rec.notes}</p>
              <ul className="wetsuit-card-details">
                {rec.details.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
              <div className="wetsuit-card-tips">
                <span className="wetsuit-tips-label">Tips</span>
                <ul>
                  <li>Thickness notation (e.g. 3/2mm) = torso/limbs</li>
                  <li>Fit matters more than thickness — avoid water flushing</li>
                  <li>Factor both air and water temp for comfort</li>
                </ul>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Travel section (original) */}
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
