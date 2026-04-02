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

import { useContext, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import Header from "../components/Header";
import Button from "../components/UI/Button";
import DatePicker from "../components/DatePicker";
import TimePicker from "../components/TimePicker";
import { ReactComponent as TimedIcon } from "../assets/Icon_16x16/Timed_16x16.svg";
import { ReactComponent as CautionIcon } from "../assets/Icon_16x16/Caution_16x16.svg";
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
    const current = new Date();
    const start = new Date(formData.start_date);
    const end = new Date(formData.end_date);

    // Start must not be in the past (1 minute buffer)
    if (start < new Date(current.getTime() - 60000)) {
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

  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  function getDurationDaysHours() {
    const diff = new Date(formData.end_date) - new Date(formData.start_date);
    if (diff <= 0) return "-- Days -- Hours";

    const totalHours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;
    return `${days} Days ${hours} Hours`;
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
        <section className="add-tournament-shell">
          <header className="add-tournament-head">
            <p className="add-tournament-eyebrow">Competition Management</p>
            <h1 className="add-tournament-title">Create New Tournament</h1>
          </header>

          <article className="add-tournament-card">
            <div className="add-tournament-accent" aria-hidden="true" />

            <form onSubmit={handleSubmit} className="add-tournament-form">
              <div className="add-tournament-row add-tournament-row--full">
                <label htmlFor="name" className="add-tournament-label">
                  Tournament Name
                </label>
                <input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Q4 Institutional Challenge"
                  required
                  autoFocus
                  className="add-tournament-input"
                />
              </div>

              <div className="add-tournament-grid add-tournament-grid--schedule">
                <fieldset className="add-tournament-fieldset">
                  <legend className="add-tournament-label">
                    Start Schedule
                  </legend>
                  <div className="add-tournament-date-time">
                    <DatePicker
                      name="start_date"
                      value={formData.start_date}
                      onChange={handleChange}
                      placeholder="mm/dd/yyyy"
                    />
                    <TimePicker
                      name="start_date"
                      value={formData.start_date}
                      onChange={handleChange}
                    />
                  </div>
                  {validationErrors.start_date && (
                    <p role="alert" className="add-tournament-error">
                      {validationErrors.start_date}
                    </p>
                  )}
                </fieldset>

                <fieldset className="add-tournament-fieldset">
                  <legend className="add-tournament-label">End Schedule</legend>
                  <div className="add-tournament-date-time">
                    <DatePicker
                      name="end_date"
                      value={formData.end_date}
                      onChange={handleChange}
                      placeholder="mm/dd/yyyy"
                    />
                    <TimePicker
                      name="end_date"
                      value={formData.end_date}
                      onChange={handleChange}
                    />
                  </div>
                  {validationErrors.end_date && (
                    <p role="alert" className="add-tournament-error">
                      {validationErrors.end_date}
                    </p>
                  )}
                </fieldset>
              </div>

              <div className="add-tournament-grid add-tournament-grid--finance">
                <div className="add-tournament-row">
                  <label
                    htmlFor="starting_balance"
                    className="add-tournament-label"
                  >
                    Starting Balance
                  </label>
                  <div className="add-tournament-money-wrap">
                    <span className="add-tournament-dollar">$</span>
                    <input
                      id="starting_balance"
                      name="starting_balance"
                      type="number"
                      value={formData.starting_balance}
                      onChange={handleChange}
                      placeholder="100000"
                      min="0"
                      step="1000"
                      required
                      className="add-tournament-input add-tournament-input--money"
                    />
                  </div>
                  <p className="add-tournament-helper">
                    Standard competitive base: $100k
                  </p>
                </div>

                <aside className="add-tournament-duration">
                  <TimedIcon className="add-tournament-duration-icon" />
                  <div className="add-tournament-duration-copy">
                    <p className="add-tournament-duration-label">
                      Calculated Duration
                    </p>
                    <output className="add-tournament-duration-value">
                      {getDurationDaysHours()}
                    </output>
                  </div>
                </aside>
              </div>

              <div className="add-tournament-row add-tournament-row--full">
                <label htmlFor="description" className="add-tournament-label">
                  Tournament Rules & Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Define entry requirements, trading limits, or asset classes permitted..."
                  rows={5}
                  className="add-tournament-textarea"
                />
              </div>

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

          <div className="add-tournament-note" role="status" aria-live="polite">
            <CautionIcon className="add-tournament-note-icon" />
            <p>
              Once created, the tournament will be listed in the public arena.
              Members can join until the start date. Market data is synced in
              real-time using institutional feeds.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

export default AddTournament;
