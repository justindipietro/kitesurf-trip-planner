import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { SettingsPanel } from "./SettingsPanel";

describe("SettingsPanel", () => {
  const defaultProps = {
    onSearch: vi.fn(),
    isSearching: false,
    onSettingsChange: vi.fn(),
  };

  it("renders all core inputs", () => {
    render(<SettingsPanel {...defaultProps} />);
    expect(screen.getByTestId("origin-input")).toBeInTheDocument();
    expect(screen.getByTestId("travel-mode-drive")).toBeInTheDocument();
    expect(screen.getByTestId("travel-mode-flight")).toBeInTheDocument();
    expect(screen.getByTestId("wind-threshold")).toBeInTheDocument();
    expect(screen.getByTestId("start-date")).toBeInTheDocument();
    expect(screen.getByTestId("end-date")).toBeInTheDocument();
    expect(screen.getByTestId("search-button")).toBeInTheDocument();
  });

  it("defaults to flight mode with flight-specific options visible", () => {
    render(<SettingsPanel {...defaultProps} />);
    expect(screen.getByTestId("travel-mode-flight")).toBeChecked();
    expect(screen.getByTestId("direct-flights-only")).toBeInTheDocument();
    expect(screen.getByTestId("delta-preferred")).toBeInTheDocument();
    expect(screen.queryByTestId("max-drive-hours")).not.toBeInTheDocument();
  });

  it("shows drive options and hides flight options when drive mode selected", () => {
    render(<SettingsPanel {...defaultProps} />);
    fireEvent.click(screen.getByTestId("travel-mode-drive"));
    expect(screen.getByTestId("max-drive-hours")).toBeInTheDocument();
    expect(screen.queryByTestId("direct-flights-only")).not.toBeInTheDocument();
    expect(screen.queryByTestId("delta-preferred")).not.toBeInTheDocument();
  });

  it("has correct default values", () => {
    render(<SettingsPanel {...defaultProps} />);
    expect(screen.getByTestId("origin-input")).toHaveValue("NYC");
    expect(screen.getByTestId("wind-threshold")).toHaveValue(15);
  });

  it("disables search button when isSearching is true", () => {
    render(<SettingsPanel {...defaultProps} isSearching={true} />);
    expect(screen.getByTestId("search-button")).toBeDisabled();
  });

  it("enables search button when isSearching is false", () => {
    render(<SettingsPanel {...defaultProps} isSearching={false} />);
    expect(screen.getByTestId("search-button")).not.toBeDisabled();
  });

  it("shows validation errors on search with invalid wind threshold", () => {
    render(<SettingsPanel {...defaultProps} />);
    fireEvent.change(screen.getByTestId("wind-threshold"), { target: { value: "0" } });
    fireEvent.click(screen.getByTestId("search-button"));
    expect(screen.getByText("Wind threshold must be a whole number between 5 and 50 knots")).toBeInTheDocument();
    expect(defaultProps.onSearch).not.toHaveBeenCalled();
  });

  it("calls onSearch with valid settings", () => {
    const onSearch = vi.fn();
    render(<SettingsPanel {...defaultProps} onSearch={onSearch} />);

    // Fill in valid origin
    fireEvent.change(screen.getByTestId("origin-input"), {
      target: { value: "Miami" },
    });

    // Set valid dates (today + 3 days)
    const today = new Date();
    const start = today.toISOString().split("T")[0];
    const end = new Date(today.getTime() + 3 * 86400000)
      .toISOString()
      .split("T")[0];

    fireEvent.change(screen.getByTestId("start-date"), {
      target: { value: start },
    });
    fireEvent.change(screen.getByTestId("end-date"), {
      target: { value: end },
    });

    fireEvent.click(screen.getByTestId("search-button"));
    expect(onSearch).toHaveBeenCalledTimes(1);
    const request = onSearch.mock.calls[0][0];
    expect(request.origin).toBe("Miami");
    expect(request.travelMode).toBe("flight");
    expect(request.windThresholdKnots).toBe(15);
    expect(request.directFlightsOnly).toBe(true);
    expect(request.deltaPreferred).toBe(true);
  });

  it("calls onSettingsChange when any setting changes", () => {
    const onSettingsChange = vi.fn();
    render(<SettingsPanel {...defaultProps} onSettingsChange={onSettingsChange} />);

    fireEvent.change(screen.getByTestId("origin-input"), {
      target: { value: "Miami" },
    });
    expect(onSettingsChange).toHaveBeenCalled();
  });

  it("flight mode defaults: direct flights only and delta preferred checked", () => {
    render(<SettingsPanel {...defaultProps} />);
    // Already in flight mode by default
    expect(screen.getByTestId("direct-flights-only")).toBeChecked();
    expect(screen.getByTestId("delta-preferred")).toBeChecked();
  });
});
