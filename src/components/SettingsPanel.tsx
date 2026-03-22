import { useState, type ChangeEvent, type FormEvent } from "react";
import type { SearchRequest, TravelMode } from "../types";
import { validateSearchSettings } from "../domain/validation";
import { DatePicker } from "./DatePicker";

interface SettingsPanelProps {
  onSearch: (request: SearchRequest) => void;
  isSearching: boolean;
  onSettingsChange: () => void;
}

export function SettingsPanel({
  onSearch,
  isSearching,
  onSettingsChange,
}: SettingsPanelProps) {
  const [origin, setOrigin] = useState("NYC");
  const [travelMode, setTravelMode] = useState<TravelMode>("flight");
  const [maxDriveHours, setMaxDriveHours] = useState(5);
  const [maxFlightHours, setMaxFlightHours] = useState(5);
  const [directFlightsOnly, setDirectFlightsOnly] = useState(true);
  const [deltaPreferred, setDeltaPreferred] = useState(true);
  const [windThresholdKnots, setWindThresholdKnots] = useState(15);
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    const day = today.getDay(); // 0=Sun, 4=Thu
    const daysUntilThursday = (4 - day + 7) % 7 || 7; // always next Thursday, not today
    const nextThursday = new Date(today);
    nextThursday.setDate(today.getDate() + daysUntilThursday);
    return `${nextThursday.getFullYear()}-${String(nextThursday.getMonth() + 1).padStart(2, "0")}-${String(nextThursday.getDate()).padStart(2, "0")}`;
  });
  const [endDate, setEndDate] = useState(() => {
    const today = new Date();
    const daysUntilThursday = (4 - today.getDay() + 7) % 7 || 7;
    const endD = new Date(today);
    endD.setDate(today.getDate() + daysUntilThursday + 3);
    return `${endD.getFullYear()}-${String(endD.getMonth() + 1).padStart(2, "0")}-${String(endD.getDate()).padStart(2, "0")}`;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function handleSettingChange() {
    onSettingsChange();
  }

  function handleOriginChange(e: ChangeEvent<HTMLInputElement>) {
    setOrigin(e.target.value);
    handleSettingChange();
  }

  function handleTravelModeChange(mode: TravelMode) {
    setTravelMode(mode);
    handleSettingChange();
  }

  function handleMaxDriveHoursChange(e: ChangeEvent<HTMLInputElement>) {
    setMaxDriveHours(Number(e.target.value));
    handleSettingChange();
  }

  function handleMaxFlightHoursChange(e: ChangeEvent<HTMLInputElement>) {
    setMaxFlightHours(Number(e.target.value));
    handleSettingChange();
  }

  function handleDirectFlightsOnlyChange(e: ChangeEvent<HTMLInputElement>) {
    setDirectFlightsOnly(e.target.checked);
    handleSettingChange();
  }

  function handleDeltaPreferredChange(e: ChangeEvent<HTMLInputElement>) {
    setDeltaPreferred(e.target.checked);
    handleSettingChange();
  }

  function handleWindThresholdChange(e: ChangeEvent<HTMLInputElement>) {
    setWindThresholdKnots(Number(e.target.value));
    handleSettingChange();
  }

  // Date changes are handled inline via DatePicker onChange callbacks

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const settings = {
      origin: origin.trim(),
      travelMode,
      windThresholdKnots,
      startDate: startDate ? new Date(startDate + "T00:00:00") : (undefined as unknown as Date),
      endDate: endDate ? new Date(endDate + "T00:00:00") : (undefined as unknown as Date),
      ...(travelMode === "drive" ? { maxDriveHours } : {}),
      ...(travelMode === "flight"
        ? { maxFlightHours, directFlightsOnly, deltaPreferred }
        : {}),
    };

    const result = validateSearchSettings(settings);

    if (!result.valid) {
      setErrors(result.errors);
      return;
    }

    setErrors({});
    onSearch(settings as SearchRequest);
  }

  return (
    <form className="settings-panel" onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="origin">Origin</label>
        <input
          id="origin"
          type="text"
          data-testid="origin-input"
          placeholder="Enter city or airport (e.g. NYC, Atlanta)"
          value={origin}
          onChange={handleOriginChange}
        />
        {errors.origin && <span className="error">{errors.origin}</span>}
      </div>

      <div className="form-group">
        <label>Travel Mode</label>
        <div className="mode-toggle">
          <label className={travelMode === "drive" ? "active" : ""}>
            <input
              type="radio"
              name="travelMode"
              data-testid="travel-mode-drive"
              checked={travelMode === "drive"}
              onChange={() => handleTravelModeChange("drive")}
            />
            🚗 Drive
          </label>
          <label className={travelMode === "flight" ? "active" : ""}>
            <input
              type="radio"
              name="travelMode"
              data-testid="travel-mode-flight"
              checked={travelMode === "flight"}
              onChange={() => handleTravelModeChange("flight")}
            />
            ✈️ Flight
          </label>
        </div>
      </div>

      {travelMode === "drive" && (
        <div className="form-group">
          <label htmlFor="maxDriveHours">Max Drive Duration (hours)</label>
          <input
            id="maxDriveHours"
            type="number"
            data-testid="max-drive-hours"
            value={maxDriveHours}
            onChange={handleMaxDriveHoursChange}
          />
          {errors.maxDriveHours && (
            <span className="error">{errors.maxDriveHours}</span>
          )}
        </div>
      )}

      {travelMode === "flight" && (
        <>
          <div className="form-group">
            <label htmlFor="maxFlightHours">Max Flight Duration (hours)</label>
            <input
              id="maxFlightHours"
              type="number"
              data-testid="max-flight-hours"
              value={maxFlightHours}
              onChange={handleMaxFlightHoursChange}
            />
            {errors.maxFlightHours && (
              <span className="error">{errors.maxFlightHours}</span>
            )}
          </div>
          <div className="form-group">
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  data-testid="direct-flights-only"
                  checked={directFlightsOnly}
                  onChange={handleDirectFlightsOnlyChange}
                />
                Direct flights only
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  data-testid="delta-preferred"
                  checked={deltaPreferred}
                  onChange={handleDeltaPreferredChange}
                />
                Delta preferred
              </label>
            </div>
          </div>
        </>
      )}

      <div className="form-group">
        <label htmlFor="windThreshold">Wind Threshold (knots)</label>
        <input
          id="windThreshold"
          type="number"
          data-testid="wind-threshold"
          value={windThresholdKnots}
          onChange={handleWindThresholdChange}
        />
        {errors.windThresholdKnots && (
          <span className="error">{errors.windThresholdKnots}</span>
        )}
      </div>

      <div className="form-row">
        <DatePicker
          id="startDate"
          label="Start Date"
          data-testid="start-date"
          value={startDate}
          onChange={(val) => {
            setStartDate(val);
            // Auto-set end date to 3 days after start (Thu→Sun)
            const d = new Date(val + "T00:00:00");
            d.setDate(d.getDate() + 3);
            const auto = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
            setEndDate(auto);
            handleSettingChange();
          }}
          error={errors.startDate}
        />
        <DatePicker
          id="endDate"
          label="End Date"
          data-testid="end-date"
          value={endDate}
          onChange={(val) => { setEndDate(val); handleSettingChange(); }}
          error={errors.endDate || errors.dateRange}
          minDate={startDate || undefined}
        />
      </div>

      <button
        className="search-btn"
        type="submit"
        data-testid="search-button"
        disabled={isSearching}
      >
        {isSearching ? "Searching..." : "🔍 Search Spots"}
      </button>
    </form>
  );
}
