/**
 * TimePicker Component
 *
 * Custom time picker with 12-hour format (AM/PM) and scrollable columns.
 *
 * Key behaviours:
 * - Parses ISO datetime string and displays as 12-hour format with AM/PM
 * - Provides three scrollable columns for hours, minutes, and AM/PM selection
 * - Preserves date portion when updating time
 * - Closes when clicking outside or pressing Done button
 * - Visual feedback for selected items and open state
 * - Uses DM Mono font for consistent time display
 */

import { useState, useEffect, useRef } from "react";
import "../styles/TimePicker.css";

function TimePicker({ name, value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Extract time portion from ISO string or default to 12:00
  const timePart = value && value.includes("T") ? value.split("T")[1] : "12:00";
  const [hours24, minutes] = timePart.split(":").map(Number);

  // Convert to 12-hour format
  const isPM = hours24 >= 12;
  const hours12 = hours24 % 12 || 12;
  const ampm = isPM ? "PM" : "AM";

  // Options for each column
  const hoursOptions = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutesOptions = Array.from({ length: 60 }, (_, i) => i);
  const ampmOptions = ["AM", "PM"];

  // Update time while preserving date portion
  function updateTime(newHours12, newMinutes, newAmpm) {
    let h24 = newHours12;

    if (newAmpm === "PM" && newHours12 !== 12) h24 = newHours12 + 12;
    if (newAmpm === "AM" && newHours12 === 12) h24 = 0;

    const datePart =
      value && value.includes("T")
        ? value.split("T")[0]
        : new Date().toISOString().split("T")[0];

    const timeStr = `${h24.toString().padStart(2, "0")}:${newMinutes
      .toString()
      .padStart(2, "0")}`;

    onChange({
      target: { name, value: `${datePart}T${timeStr}` },
    });
  }

  // Close picker when clicking outside
  useEffect(() => {
    function handleOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  // Formatted display string
  const displayTime = `${hours12.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")} ${ampm}`;

  // Individual scrollable column component
  function Column({ options, selected, onSelect, format = (x) => x }) {
    const scrollRef = useRef(null);

    useEffect(() => {
      const el = scrollRef.current;
      if (!el) return;

      const selectedIdx = options.findIndex((opt) => opt === selected);
      if (selectedIdx >= 0) {
        const approxItemHeight = el.scrollHeight / options.length;
        const targetScroll =
          selectedIdx * approxItemHeight -
          (el.clientHeight - approxItemHeight) / 2;
        el.scrollTop = Math.max(0, targetScroll);
      }
    }, [selected, options]);

    return (
      <div className="timepicker-col">
        <div ref={scrollRef} className="timepicker-col-scroll">
          {options.map((opt) => (
            <button
              type="button"
              key={opt}
              onClick={() => onSelect(opt)}
              className={`timepicker-col-item${opt === selected ? " timepicker-col-item--selected" : ""}`}
            >
              {format(opt)}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="timepicker">
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className={`timepicker-trigger${isOpen ? " timepicker-trigger--active" : ""}`}
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>

        <span className="timepicker-time-display">{displayTime}</span>

        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          aria-hidden="true"
          className={`timepicker-caret${isOpen ? " timepicker-caret--open" : ""}`}
        >
          <polyline points="6,9 12,15 18,9" />
        </svg>
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Time picker"
          className="timepicker-panel"
        >
          <div className="timepicker-panel-header">
            <span className="timepicker-panel-label">Hour</span>
            <span className="timepicker-panel-spacer" />
            <span className="timepicker-panel-label">Min</span>
            <span className="timepicker-panel-spacer" />
            <span className="timepicker-panel-label"></span>
          </div>

          <div className="timepicker-columns">
            <Column
              options={hoursOptions}
              selected={hours12}
              onSelect={(h) => updateTime(h, minutes, ampm)}
              format={(h) => h.toString().padStart(2, "0")}
            />

            <div role="separator" className="timepicker-divider" />

            <Column
              options={minutesOptions}
              selected={minutes}
              onSelect={(m) => updateTime(hours12, m, ampm)}
              format={(m) => m.toString().padStart(2, "0")}
            />

            <div role="separator" className="timepicker-divider" />

            <Column
              options={ampmOptions}
              selected={ampm}
              onSelect={(a) => updateTime(hours12, minutes, a)}
            />
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="timepicker-done"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}

export default TimePicker;
