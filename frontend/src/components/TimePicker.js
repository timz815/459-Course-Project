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

const BLUE = "#0F9FEA";

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
  const displayTime = `${hours12
    .toString()
    .padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")} ${ampm}`;

  // Individual scrollable column component
  function Column({ options, selected, onSelect, format = (x) => x }) {
    return (
      <div style={columnStyles.container}>
        <div style={columnStyles.scroll}>
          {options.map((opt) => {
            const isSelected = opt === selected;

            return (
              <button
                type="button"
                key={opt}
                onClick={() => onSelect(opt)}
                style={{
                  ...columnStyles.item,
                  ...(isSelected ? columnStyles.selected : {}),
                }}
              >
                {format(opt)}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={styles.container}>
      <style>{css}</style>

      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        style={{
          ...styles.trigger,
          ...(isOpen ? styles.triggerActive : {}),
        }}
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

        <span style={styles.timeDisplay}>{displayTime}</span>

        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          aria-hidden="true"
          style={{
            opacity: 0.35,
            transform: isOpen ? "rotate(180deg)" : "none",
            transition: "transform 0.2s",
          }}
        >
          <polyline points="6,9 12,15 18,9" />
        </svg>
      </button>

      {isOpen && (
        <div role="dialog" aria-label="Time picker" style={styles.panel}>
          <div style={styles.header}>
            <span style={styles.headerLabel}>Hour</span>
            <span style={styles.headerSpacer} />
            <span style={styles.headerLabel}>Min</span>
            <span style={styles.headerSpacer} />
            <span style={styles.headerLabel}></span>
          </div>

          <div style={styles.columns}>
            <Column
              options={hoursOptions}
              selected={hours12}
              onSelect={(h) => updateTime(h, minutes, ampm)}
              format={(h) => h.toString().padStart(2, "0")}
            />

            <div role="separator" style={styles.divider} />

            <Column
              options={minutesOptions}
              selected={minutes}
              onSelect={(m) => updateTime(hours12, m, ampm)}
              format={(m) => m.toString().padStart(2, "0")}
            />

            <div role="separator" style={styles.divider} />

            <Column
              options={ampmOptions}
              selected={ampm}
              onSelect={(a) => updateTime(hours12, minutes, a)}
            />
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(false)}
            style={styles.doneButton}
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}

const css = `
@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&display=swap');
`;

const styles = {
  container: {
    position: "relative",
    display: "inline-block",
    fontFamily: "'DM Mono', monospace",
  },

  trigger: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.5625rem 0.875rem",
    backgroundColor: "#1e1e1e",
    border: "1px solid #333",
    borderRadius: "0.625rem",
    color: "#e8e8e8",
    cursor: "pointer",
    fontSize: "0.95rem",
    transition: "all 0.15s",
    fontFamily: "inherit",
  },

  triggerActive: {
    borderColor: BLUE,
    backgroundColor: "#1a2a33",
    boxShadow: "0 0 0 0.1875rem rgba(15,159,234,0.12)",
  },

  timeDisplay: {
    letterSpacing: "0.05em",
  },

  panel: {
    position: "absolute",
    top: "calc(100% + 0.5rem)",
    left: 0,
    backgroundColor: "#1a1a1a",
    border: "1px solid #2e2e2e",
    borderRadius: "0.875rem",
    boxShadow: "0 1rem 3rem rgba(0,0,0,0.6)",
    zIndex: 1000,
    minWidth: "14.375rem",
    overflow: "hidden",
  },

  header: {
    display: "flex",
    padding: "0.625rem 1rem 0.25rem",
  },

  headerLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: "0.65rem",
    color: "#555",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
  },

  headerSpacer: {
    width: "1px",
  },

  columns: {
    display: "flex",
  },

  divider: {
    width: "1px",
    backgroundColor: "#252525",
  },

  doneButton: {
    width: "100%",
    padding: "0.6875rem",
    backgroundColor: "transparent",
    border: "none",
    borderTop: "1px solid #252525",
    color: BLUE,
    cursor: "pointer",
    fontSize: "0.85rem",
    letterSpacing: "0.08em",
    fontFamily: "inherit",
  },
};

const columnStyles = {
  container: {
    flex: 1,
    height: "11.25rem",
  },

  scroll: {
    height: "100%",
    overflowY: "auto",
  },

  item: {
    padding: "0.625rem",
    textAlign: "center",
    cursor: "pointer",
    color: "#888",
    fontSize: "0.95rem",
    transition: "all 0.12s",
    background: "none",
    border: "none",
    width: "100%",
    fontFamily: "inherit",
  },

  selected: {
    color: "#fff",
    background: "rgba(15,159,234,0.15)",
    fontWeight: "500",
  },
};

export default TimePicker;