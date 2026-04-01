/**
 * Tournaments Component
 *
 * Public listing page for all tournaments with search and filtering capabilities.
 *
 * Key behaviours:
 * - Fetches all tournaments from public API endpoint on mount
 * - Provides real-time search filtering by tournament name
 * - Displays status badges with color-coded styling (open/active/closed/ended)
 * - Shows conditional action labels based on auth state and tournament status
 * - Create button visible only to authenticated users
 * - Clickable cards navigate to tournament detail pages
 */

import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import Header from "../components/Header";
import Button from "../components/UI/Button";
import Input from "../components/UI/Input";
import "../styles/Tournaments.css";

function Tournaments() {
  const [tournaments, setTournaments] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const { token } = useContext(AuthContext);
  const navigate = useNavigate();

  // Fetch all tournaments on component mount
  useEffect(() => {
    fetch("http://localhost:5000/api/tournaments")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setTournaments(data);
      })
      .catch((err) => console.error("Error fetching tournaments:", err));
  }, []);

  // Filter tournaments by search term (case-insensitive)
  const filtered = tournaments.filter((t) =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Returns color scheme based on tournament status
  function getStatusStyle(status) {
    switch (status) {
      case "open":
        return "open";
      case "active":
        return "active";
      case "closed":
        return "closed";
      case "ended":
        return "ended";
      default:
        return "default";
    }
  }

  // Determines button label based on auth state and tournament status
  function getActionLabel(t) {
    if (!token) return "View as Guest";
    if (t.status === "open" || t.status === "active") return "View";
    return "View";
  }

  return (
    <div className="tournaments-page">
      <Header />

      <main className="tournaments-main">
        {/* Page Header */}
        <header className="tournaments-header">
          <h1 className="tournaments-title ds-type-title-l">Tournaments</h1>
          {token && (
            <Button
              variant="primary"
              onClick={() => navigate("/add-tournament")}
            >
              Create Tournament
            </Button>
          )}
        </header>

        {/* Search Filter */}
        <Input
          type="text"
          placeholder="Search tournaments..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          inputClassName="tournaments-search-field"
        />

        {/* Tournament Grid */}
        <div className="tournaments-grid">
          {filtered.length > 0 ? (
            filtered.map((t) => {
              const statusClass = getStatusStyle(t.status);
              return (
                <article
                  key={t._id}
                  className="tournaments-card"
                  onClick={() => navigate(`/tournaments/${t._id}`)}
                >
                  <div className="tournaments-card-content">
                    <h2 className="tournaments-card-title">{t.name}</h2>
                    <dl className="tournaments-card-meta">
                      <dt className="ds-visually-hidden">Date Range</dt>
                      <dd className="tournaments-meta-item">
                        {t.start_date?.slice(0, 10)} →{" "}
                        {t.end_date?.slice(0, 10)}
                      </dd>

                      <span
                        aria-hidden="true"
                        className="tournaments-meta-separator"
                      >
                        ·
                      </span>

                      <dt className="ds-visually-hidden">Starting Balance</dt>
                      <dd className="tournaments-meta-item">
                        ${t.starting_balance} starting balance
                      </dd>
                    </dl>
                    {t.description && (
                      <p className="tournaments-card-description">
                        {t.description}
                      </p>
                    )}
                  </div>
                  <div className="tournaments-card-actions">
                    <span
                      className={`tournaments-badge tournaments-badge-${statusClass}`}
                    >
                      {t.status}
                    </span>
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/tournaments/${t._id}`);
                      }}
                    >
                      {getActionLabel(t)}
                    </Button>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="tournaments-empty ds-type-body-2">
              <p>No tournaments found.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default Tournaments;
