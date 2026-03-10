/**
 * AddTournament Component
 *
 * Form for creating a new trading tournament with date/time scheduling.
 *
 * Key behaviours:
 * - Uses React state to manage tournament form fields
 * - Provides rounded-to-15min default start time with 24h default duration
 * - Validates start time is not in the past and end time is at least 1 min after start
 * - Displays live duration calculation as user adjusts dates
 * - Handles currency input with dollar prefix formatting
 * - Submits to backend API with auth token, navigates to dashboard on success
 */

import { useContext, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import Header from "../components/Header";
import DatePicker from "../components/DatePicker";
import TimePicker from "../components/TimePicker";

// Returns current time rounded up to nearest 15 minutes in ISO format
function getRoundedNow() {
  const now = new Date();
  const ms = 15 * 60 * 1000;
  return new Date(Math.ceil(now.getTime() / ms) * ms).toISOString().slice(0, 16);
}

// Adds specified hours to an ISO date string
function addHours(dateStr, hours) {
  const d = new Date(dateStr);
  d.setHours(d.getHours() + hours);
  return d.toISOString().slice(0, 16);
}

function AddTournament() {
  const { token } = useContext(AuthContext);
  const navigate = useNavigate();
  const now = getRoundedNow();

  // Form state with sensible defaults
  const [formData, setFormData] = useState({
    name: "",
    start_date: now,
    end_date: addHours(now, 24),
    starting_balance: "10000",
    description: "",
  });

  // Memoized validation errors for start/end dates
  const validationErrors = useMemo(() => {
    const errors = {};
    const now = new Date();
    const start = new Date(formData.start_date);
    const end = new Date(formData.end_date);
    
    // Start must not be in the past (1 minute buffer)
    if (start < new Date(now.getTime() - 60000)) {
      errors.start_date = "Start time cannot be in the past";
    }
    
    // End must be at least 1 minute after start
    const diffMs = end - start;
    if (diffMs < 60000) {
      errors.end_date = "End time must be at least 1 minute after start time";
    }
    
    return errors;
  }, [formData.start_date, formData.end_date]);

  const hasErrors = Object.keys(validationErrors).length > 0;

  // Generic handler for text/number input changes
  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  // Calculates human-readable duration between start and end dates
  function getDuration() {
    const diff = new Date(formData.end_date) - new Date(formData.start_date);
    const mins = Math.floor(diff / 60000);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  }

  // Submits tournament data to API after validation check
  async function handleSubmit(e) {
    e.preventDefault();
    
    if (hasErrors) {
      alert("Please fix validation errors before submitting");
      return;
    }
    
    try {
      const res = await fetch("http://localhost:5000/api/tournaments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
        body: JSON.stringify({
          ...formData,
          starting_balance: parseFloat(formData.starting_balance),
        }),
      });

      if (res.ok) {
        navigate("/dashboard");
      } else {
        const err = await res.json();
        alert(err.message || "Failed to create tournament");
      }
    } catch (err) {
      console.error("Submission error:", err);
    }
  }

  return (
    <div style={styles.page}>
      <Header />
      <main style={styles.main}>
        <article style={styles.card}>

          <h1 style={styles.title}>Create Tournament</h1>

          <form onSubmit={handleSubmit} style={styles.form}>
            
            {/* Tournament Name Field */}
            <label htmlFor="name" style={styles.label}>Tournament Name</label>
            <input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. S&P 500 Challenge"
              required
              style={styles.input}
              autoFocus
            />

            {/* Start Date & Time Group */}
            <fieldset style={styles.fieldset}>
              <legend style={styles.legend}>Start Date & Time</legend>
              <div style={styles.dateTimeGroup}>
                <DatePicker 
                  name="start_date" 
                  value={formData.start_date} 
                  onChange={handleChange}
                />
                <TimePicker 
                  name="start_date" 
                  value={formData.start_date} 
                  onChange={handleChange}
                />
              </div>
            </fieldset>
            {validationErrors.start_date && (
              <p role="alert" style={styles.error}>{validationErrors.start_date}</p>
            )}

            {/* End Date & Time Group */}
            <fieldset style={styles.fieldset}>
              <legend style={styles.legend}>End Date & Time</legend>
              <div style={styles.dateTimeGroup}>
                <DatePicker 
                  name="end_date" 
                  value={formData.end_date} 
                  onChange={handleChange}
                />
                <TimePicker 
                  name="end_date" 
                  value={formData.end_date} 
                  onChange={handleChange}
                />
              </div>
            </fieldset>
            {validationErrors.end_date && (
              <p role="alert" style={styles.error}>{validationErrors.end_date}</p>
            )}

            {/* Live Duration Display */}
            <div style={styles.duration}>
              <span style={styles.durationLabel}>Duration:</span>
              <output style={styles.durationValue}>{getDuration()}</output>
            </div>

            {/* Starting Balance Field with Dollar Prefix */}
            <label htmlFor="starting_balance" style={styles.label}>Player Starting Balance</label>
            <div style={styles.currencyInput}>
              <span style={styles.currencySymbol}>$</span>
              <input
                id="starting_balance"
                name="starting_balance"
                type="number"
                value={formData.starting_balance}
                onChange={handleChange}
                placeholder="10000"
                required
                min="0"
                step="1000"
                style={styles.currencyField}
              />
            </div>

            {/* Description Field */}
            <label htmlFor="description" style={styles.label}>Game Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe the rules and goals of this tournament…"
              rows={4}
              style={styles.textarea}
            />

            {/* Action Buttons */}
            <div style={styles.actions}>
              <button type="button" style={styles.cancelButton} onClick={() => navigate("/dashboard")}>
                Cancel
              </button>
              <button 
                type="submit" 
                style={{
                  ...styles.submitButton,
                  ...(hasErrors ? styles.submitButtonDisabled : {}),
                }}
                disabled={hasErrors}
              >
                Create Tournament
              </button>
            </div>
            
          </form>
        </article>
      </main>
    </div>
  );
}

const BLUE = "#0F9FEA";
const BG = "#1A1A1A";
const TEXT = "#F9F9F9";

const styles = {
  page: { 
    minHeight: "100vh", 
    backgroundColor: BG, 
    fontFamily: "'Segoe UI', sans-serif" 
  },
  main: { 
    display: "flex", 
    justifyContent: "center", 
    padding: "2.5rem 1.25rem" 
  },
  card: { 
    width: "100%", 
    maxWidth: "37.5rem", 
    backgroundColor: "#2a2a2a", 
    borderRadius: "1rem", 
    padding: "2.5rem", 
    boxShadow: "0 0.5rem 2rem rgba(0,0,0,0.4)", 
    border: "1px solid #333" 
  },
  title: { 
    margin: "0 0 0.25rem", 
    color: TEXT, 
    fontSize: "1.8rem", 
    fontWeight: "700" 
  },
  form: { 
    display: "flex", 
    flexDirection: "column", 
    gap: "0.25rem" 
  },
  fieldset: { 
    border: "none", 
    padding: 0, 
    margin: "1rem 0 0 0" 
  },
  legend: { 
    fontSize: "0.85rem", 
    fontWeight: "600", 
    color: "#aaa", 
    marginBottom: "0.5rem",
    padding: 0
  },
  label: { 
    fontSize: "0.85rem", 
    fontWeight: "600", 
    color: "#aaa", 
    marginTop: "1rem", 
    marginBottom: "0.5rem", 
    display: "block" 
  },
  input: { 
    padding: "0.75rem 1rem", 
    borderRadius: "0.5rem", 
    border: "1px solid #444", 
    backgroundColor: "#1f1f1f", 
    color: TEXT, 
    fontSize: "1rem", 
    outline: "none", 
    width: "100%", 
    boxSizing: "border-box" 
  },
  currencyInput: { 
    position: "relative" 
  },
  currencySymbol: { 
    position: "absolute", 
    left: "0.875rem", 
    top: "50%", 
    transform: "translateY(-50%)", 
    color: "#666", 
    fontWeight: "600", 
    pointerEvents: "none" 
  },
  currencyField: { 
    padding: "0.75rem 1rem", 
    paddingLeft: "1.75rem", 
    borderRadius: "0.5rem", 
    border: "1px solid #444", 
    backgroundColor: "#1f1f1f", 
    color: TEXT, 
    fontSize: "1rem", 
    outline: "none", 
    width: "100%", 
    boxSizing: "border-box" 
  },
  dateTimeGroup: { 
    display: "flex", 
    gap: "0.75rem", 
    alignItems: "flex-start" 
  },
  duration: { 
    display: "flex", 
    alignItems: "center", 
    gap: "0.5rem", 
    backgroundColor: "#252525", 
    padding: "0.625rem 1rem", 
    borderRadius: "0.5rem", 
    marginTop: "0.5rem", 
    border: "1px solid #333" 
  },
  durationLabel: { 
    color: "#888", 
    fontSize: "0.85rem" 
  },
  durationValue: { 
    color: "#00D084", 
    fontWeight: "700", 
    fontSize: "1rem" 
  },
  textarea: { 
    padding: "0.75rem 1rem", 
    borderRadius: "0.5rem", 
    border: "1px solid #444", 
    backgroundColor: "#1f1f1f", 
    color: TEXT, 
    fontSize: "1rem", 
    outline: "none", 
    resize: "vertical", 
    fontFamily: "'Segoe UI', sans-serif", 
    minHeight: "6.25rem" 
  },
  actions: { 
    display: "flex", 
    gap: "0.75rem", 
    marginTop: "1.5rem" 
  },
  cancelButton: { 
    flex: 1, 
    padding: "0.875rem", 
    backgroundColor: "transparent", 
    color: "#888", 
    border: "1px solid #444", 
    borderRadius: "0.5rem", 
    fontSize: "1rem", 
    fontWeight: "600", 
    cursor: "pointer" 
  },
  submitButton: { 
    flex: 2, 
    padding: "0.875rem", 
    backgroundColor: BLUE, 
    color: "#fff", 
    border: "none", 
    borderRadius: "0.5rem", 
    fontSize: "1rem", 
    fontWeight: "700", 
    cursor: "pointer" 
  },
  submitButtonDisabled: { 
    backgroundColor: "#555", 
    cursor: "not-allowed", 
    opacity: 0.6 
  },
  error: { 
    color: "#ff6b6b", 
    fontSize: "0.8rem", 
    marginTop: "0.25rem", 
    marginBottom: "0.5rem" 
  },
};

export default AddTournament;