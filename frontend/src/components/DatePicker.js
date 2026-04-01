/**
 * DatePicker Component
 *
 * Custom date picker input with calendar popup for selecting dates.
 *
 * Key behaviours:
 * - Displays selected date or placeholder in input field
 * - Opens calendar popup on click with month/year navigation
 * - Handles local time date creation to avoid UTC shift issues
 * - Preserves time portion when changing dates
 * - Highlights selected date and today's date
 * - Closes when clicking outside the component
 */

import { useState, useEffect, useRef } from "react";
import "../styles/DatePicker.css";

// Returns number of days in given month (0-indexed)
function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

// Returns full month name for display
function getMonthName(month) {
  return new Date(2000, month, 1).toLocaleString("default", { month: "long" });
}

function DatePicker({ name, value, onChange, placeholder = "Select date" }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const dateValue = value ? value.split("T")[0] : "";

  const initialDate = dateValue 
  ? new Date(...dateValue.split("-").map((v, i) => i === 1 ? Number(v) - 1 : Number(v)))
  : new Date();
  const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth());
  const [currentYear, setCurrentYear] = useState(initialDate.getFullYear());

  const today = new Date();

  // Close popup when clicking outside
  useEffect(() => {
    function handleOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  // Sync calendar view when value changes externally
  useEffect(() => {
    if (dateValue) {
      const d = new Date(dateValue);
      setCurrentMonth(d.getMonth());
      setCurrentYear(d.getFullYear());
    }
  }, [dateValue]);

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

  const days = [
    ...Array(firstDayOfMonth).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  // Navigate months with year rollover
  function changeMonth(delta) {
    let newMonth = currentMonth + delta;
    let newYear = currentYear;
    if (newMonth > 11) {
      newMonth = 0;
      newYear++;
    } else if (newMonth < 0) {
      newMonth = 11;
      newYear--;
    }
    setCurrentMonth(newMonth);
    setCurrentYear(newYear);
  }

  // Select day and preserve existing time
  function selectDay(day) {
    if (!day) return;
    const newDateObj = new Date(currentYear, currentMonth, day);
    const year = newDateObj.getFullYear();
    const month = String(newDateObj.getMonth() + 1).padStart(2, "0");
    const date = String(newDateObj.getDate()).padStart(2, "0");
    const newDate = `${year}-${month}-${date}`;
    
    const timePart = value && value.includes("T") ? value.split("T")[1] : "00:00";
    onChange({ target: { name, value: `${newDate}T${timePart}` } });
    setIsOpen(false);
  }

  // Check if day matches selected date
  function isSelected(day) {
    if (!day || !dateValue) return false;
    const check = new Date(currentYear, currentMonth, day);
    const [y, m, d] = dateValue.split("-").map(Number);
    const selected = new Date(y, m - 1, d);
    return check.toDateString() === selected.toDateString();
  }

  // Check if day is today
  function isToday(day) {
    if (!day) return false;
    const check = new Date(currentYear, currentMonth, day);
    return check.toDateString() === today.toDateString();
  }

  function dayClass(day) {
    const base = "datepicker-day";
    if (!day) return `${base} datepicker-day--empty`;
    if (isSelected(day)) return `${base} datepicker-day--selected`;
    if (isToday(day)) return `${base} datepicker-day--today`;
    return base;
  }

  return (
    <div ref={containerRef} className="datepicker">
      <button 
        type="button"
        className="datepicker-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <span className={dateValue ? undefined : "datepicker-placeholder"}>
          {dateValue || placeholder}
        </span>
        <span className="datepicker-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </span>
      </button>

      {isOpen && (
        <div role="dialog" aria-label="Calendar" className="datepicker-calendar">
          <div className="datepicker-header">
            <button type="button" onClick={() => changeMonth(-1)} className="datepicker-nav-btn" aria-label="Previous month">‹</button>
            <span className="datepicker-month-year">{getMonthName(currentMonth)} {currentYear}</span>
            <button type="button" onClick={() => changeMonth(1)} className="datepicker-nav-btn" aria-label="Next month">›</button>
          </div>
          <div className="datepicker-weekdays">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
              <div key={d} className="datepicker-weekday">{d}</div>
            ))}
          </div>
          <div className="datepicker-days">
            {days.map((day, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => selectDay(day)}
                disabled={!day}
                aria-label={day ? `${day} ${getMonthName(currentMonth)} ${currentYear}` : undefined}
                aria-current={isToday(day) ? "date" : undefined}
                className={dayClass(day)}
              >
                {day || ""}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default DatePicker;
