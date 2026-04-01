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
import Button from "../components/UI/Button";
import Input from "../components/UI/Input";
import DatePicker from "../components/DatePicker";
import TimePicker from "../components/TimePicker";
import "../styles/AddTournament.css";

// Returns current time rounded up to nearest 15 minutes in ISO format
function getRoundedNow() {
  const now = new Date();
  const ms = 15 * 60 * 1000;
  return new Date(Math.ceil(now.getTime() / ms) * ms)
    .toISOString()
    .slice(0, 16);
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
    <div className="add-tournament-page">
      <Header />
      <main className="add-tournament-main">
        <article className="add-tournament-card">
          <h1 className="add-tournament-title ds-type-title-l">
            Create Tournament
          </h1>

          <form onSubmit={handleSubmit} className="add-tournament-form">
            {/* Tournament Name Field */}
            <Input
              label="Tournament Name"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. S&P 500 Challenge"
              required
              inputClassName="add-tournament-input"
              autoFocus
            />

            {/* Start Date & Time Group */}
            <fieldset className="add-tournament-fieldset">
              <legend className="add-tournament-legend ds-type-label">
                Start Date & Time
              </legend>
              <div className="add-tournament-date-time">
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
              <p role="alert" className="add-tournament-error">
                {validationErrors.start_date}
              </p>
            )}

            {/* End Date & Time Group */}
            <fieldset className="add-tournament-fieldset">
              <legend className="add-tournament-legend ds-type-label">
                End Date & Time
              </legend>
              <div className="add-tournament-date-time">
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
              <p role="alert" className="add-tournament-error">
                {validationErrors.end_date}
              </p>
            )}

            {/* Live Duration Display */}
            <div className="add-tournament-duration">
              <span className="add-tournament-duration-label ds-type-body-2">
                Duration:
              </span>
              <output className="add-tournament-duration-value">
                {getDuration()}
              </output>
            </div>

            {/* Starting Balance Field with Dollar Prefix */}
            <Input
              label="Player Starting Balance"
              id="starting_balance"
              name="starting_balance"
              type="number"
              value={formData.starting_balance}
              onChange={handleChange}
              placeholder="10000"
              required
              min="0"
              step="1000"
              inputClassName="add-tournament-currency-field"
            />

            {/* Description Field */}
            <label
              htmlFor="description"
              className="add-tournament-label ds-type-label"
            >
              Game Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe the rules and goals of this tournament…"
              rows={4}
              className="add-tournament-textarea"
            />

            {/* Action Buttons */}
            <div className="add-tournament-actions">
              <Button
                className="add-tournament-action-cancel"
                variant="cancel"
                type="button"
                onClick={() => navigate("/dashboard")}
              >
                Cancel
              </Button>
              <Button
                className="add-tournament-action-submit"
                variant="primary"
                type="submit"
                disabled={hasErrors}
              >
                Create Tournament
              </Button>
            </div>
          </form>
        </article>
      </main>
    </div>
  );
}

export default AddTournament;
