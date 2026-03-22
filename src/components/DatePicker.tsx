import { useState, useRef, useEffect } from "react";

interface DatePickerProps {
  id: string;
  label: string;
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  "data-testid"?: string;
  error?: string;
  minDate?: string; // YYYY-MM-DD
}

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function toDateStr(y: number, m: number, d: number) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

function parseDate(s: string): { year: number; month: number; day: number } | null {
  const parts = s.split("-");
  if (parts.length !== 3) return null;
  return { year: +parts[0], month: +parts[1] - 1, day: +parts[2] };
}

export function DatePicker({
  id,
  label,
  value,
  onChange,
  "data-testid": testId,
  error,
  minDate,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const today = new Date();
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());

  const parsed = parseDate(value);
  const [viewYear, setViewYear] = useState(parsed?.year ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed?.month ?? today.getMonth());

  // Sync view when value changes externally
  useEffect(() => {
    const p = parseDate(value);
    if (p) {
      setViewYear(p.year);
      setViewMonth(p.month);
    }
  }, [value]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  }

  function selectDay(day: number) {
    const dateStr = toDateStr(viewYear, viewMonth, day);
    onChange(dateStr);
    setOpen(false);
  }

  // Build calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const displayValue = parsed
    ? `${MONTHS[parsed.month].slice(0, 3)} ${parsed.day}, ${parsed.year}`
    : "";

  function isDayDisabled(day: number): boolean {
    if (!minDate) return false;
    const dateStr = toDateStr(viewYear, viewMonth, day);
    return dateStr < minDate;
  }

  function isDaySelected(day: number): boolean {
    if (!parsed) return false;
    return parsed.year === viewYear && parsed.month === viewMonth && parsed.day === day;
  }

  function isDayToday(day: number): boolean {
    return toDateStr(viewYear, viewMonth, day) === todayStr;
  }

  return (
    <div className="form-group datepicker-wrapper" ref={ref}>
      <label htmlFor={id}>{label}</label>
      {/* Hidden native input for tests */}
      <input
        id={id}
        type="date"
        data-testid={testId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="datepicker-hidden-input"
        tabIndex={-1}
        aria-hidden="true"
      />
      <button
        type="button"
        className={`datepicker-trigger${value ? " has-value" : ""}`}
        onClick={() => setOpen(!open)}
        aria-label={`Pick ${label.toLowerCase()}`}
      >
        <span className="datepicker-icon">📅</span>
        <span className="datepicker-display">
          {displayValue || "Select date"}
        </span>
        <span className={`datepicker-chevron${open ? " open" : ""}`}>▾</span>
      </button>
      {error && <span className="error">{error}</span>}
      {open && (
        <div className="datepicker-dropdown">
          <div className="datepicker-nav">
            <button type="button" onClick={prevMonth} aria-label="Previous month">‹</button>
            <span className="datepicker-month-year">
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button type="button" onClick={nextMonth} aria-label="Next month">›</button>
          </div>
          <div className="datepicker-grid">
            {DAYS.map((d) => (
              <span key={d} className="datepicker-day-header">{d}</span>
            ))}
            {cells.map((day, i) =>
              day === null ? (
                <span key={`empty-${i}`} className="datepicker-cell empty" />
              ) : (
                <button
                  key={day}
                  type="button"
                  className={[
                    "datepicker-cell",
                    isDaySelected(day) ? "selected" : "",
                    isDayToday(day) ? "today" : "",
                    isDayDisabled(day) ? "disabled" : "",
                  ].filter(Boolean).join(" ")}
                  disabled={isDayDisabled(day)}
                  onClick={() => selectDay(day)}
                >
                  {day}
                </button>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
