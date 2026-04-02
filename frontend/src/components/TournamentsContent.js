import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ReactComponent as MagnifyIcon } from "../assets/Icon_16x16/Magnify_16x16.svg";
import { ReactComponent as SettingIcon } from "../assets/Icon_16x16/Setting-Horizontal_16x16.svg";
import { ReactComponent as AddIcon } from "../assets/Icon_16x16/Add_16x16.svg";
import FilterDropdown from "./UI/FilterDropdown";
import Button from "./UI/Button";
import "../styles/TournamentsContent.css";

const STATUS_OPTIONS = [
  { value: "all", label: "All Status", color: null },
  { value: "active", label: "Active", color: "var(--color-success-400)" },
  { value: "open", label: "Open", color: "var(--color-primary-300)" },
  { value: "closed", label: "Cancel", color: "var(--color-danger-500)" },
  { value: "ended", label: "Ended", color: "var(--color-body)" },
];

function TournamentsContent({ isLoggedIn = false }) {
  const [tournaments, setTournaments] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const navigate = useNavigate();

  useEffect(() => {
    fetch("http://localhost:5000/api/tournaments")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setTournaments(data);
      })
      .catch((err) => console.error("Error fetching tournaments:", err));
  }, []);

  const filtered = tournaments.filter((t) => {
    const matchesSearch = t.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  /* Ticker stats */
  const activeTournaments = tournaments.filter(
    (t) => t.status === "active" || t.status === "open",
  );
  const totalCapital = activeTournaments.reduce(
    (sum, t) => sum + (t.starting_balance || 0),
    0,
  );

  function formatDate(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  }

  function formatCurrency(val) {
    return val.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function chipClass(status) {
    switch (status) {
      case "active":
        return "vtc-chip--active";
      case "open":
        return "vtc-chip--open";
      case "closed":
        return "vtc-chip--closed";
      case "ended":
        return "vtc-chip--ended";
      default:
        return "vtc-chip--ended";
    }
  }

  function chipLabel(status) {
    if (status === "closed") return "Cancel";
    return status;
  }

  return (
    <main className="vtc">
      {/* ── Page Header ── */}
      <div className="vtc-header">
        <div className="vtc-header-left">
          <span className="vtc-subtitle">Competitive Trading</span>
          <h1 className="vtc-title">Tournaments</h1>
        </div>

        <div className="vtc-ticker">
          <div className="vtc-ticker-stat">
            <span className="vtc-ticker-label">Live Tournaments</span>
            <span className="vtc-ticker-value vtc-ticker-value--green">
              {activeTournaments.length.toLocaleString()}
            </span>
          </div>
          <div className="vtc-ticker-divider" />
          <div className="vtc-ticker-stat">
            <span className="vtc-ticker-label">Total Capital</span>
            <span className="vtc-ticker-value vtc-ticker-value--blue">
              ${formatCurrency(totalCapital)}
            </span>
          </div>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="vtc-filters">
        <div className="vtc-search">
          <MagnifyIcon className="vtc-search-icon" />
          <input
            className="vtc-search-input"
            type="text"
            placeholder="Search tournaments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="vtc-filter-actions">
          {/* Status dropdown */}
          <FilterDropdown
            value={statusFilter}
            options={STATUS_OPTIONS}
            onChange={setStatusFilter}
            className="vtc-dropdown-wrap"
          />

          {/* Settings / advanced filter button */}
          <button className="vtc-settings-btn" aria-label="Filter settings">
            <SettingIcon />
          </button>
        </div>
      </div>

      {/* ── Tournament List ── */}
      <div className="vtc-list">
        {filtered.length > 0 ? (
          filtered.map((t) => {
            const isEnded = t.status === "ended";
            return (
              <div
                key={t._id}
                className={`vtc-card ${isEnded ? "vtc-card--ended" : ""}`}
                onClick={() => navigate(`/tournaments/${t._id}`)}
              >
                {/* Left */}
                <div className="vtc-card-left">
                  <div className="vtc-card-heading">
                    <span className="vtc-card-name">{t.name}</span>
                    <span className={`vtc-chip ${chipClass(t.status)}`}>
                      {chipLabel(t.status)}
                    </span>
                  </div>

                  <span className="vtc-card-date">
                    {formatDate(t.start_date)} — {formatDate(t.end_date)}
                  </span>

                  <div className="vtc-card-meta">
                    <div className="vtc-card-stat">
                      <span className="vtc-card-stat-label">
                        Initial Capital
                      </span>
                      <span className="vtc-card-stat-value">
                        ${formatCurrency(t.starting_balance || 0)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right */}
                <div className="vtc-card-right">
                  {!isEnded && (
                    <div className="vtc-card-fee">
                      <span className="vtc-card-stat-label">Entry Fee</span>
                      <span className="vtc-card-fee-value">Free</span>
                    </div>
                  )}
                  <button
                    className={`vtc-view-btn ${isEnded ? "vtc-view-btn--muted" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/tournaments/${t._id}`);
                    }}
                  >
                    {isEnded ? "Result" : "View"}
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="vtc-empty">No tournaments found.</div>
        )}
      </div>

      {/* ── Load More Section (logged-in only) ── */}
      {isLoggedIn && (
        <div className="vtc-loadmore">
          <p className="vtc-loadmore-text">
            Near real-time quote updates using Finnhub at up to 1
            request/second, plus cached market data stored in MongoDB for fast
            UI rendering.
          </p>
          <Button
            variant="primary"
            headIcon={<AddIcon />}
            onClick={() => navigate("/add-tournament")}
          >
            Create Tournament
          </Button>
        </div>
      )}
    </main>
  );
}

export default TournamentsContent;
