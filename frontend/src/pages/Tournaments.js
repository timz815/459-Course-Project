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
    t.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Returns color scheme based on tournament status
  function getStatusStyle(status) {
    switch (status) {
      case "open":   return { bg: "#0a3a4a", color: "#0F9FEA" };
      case "active": return { bg: "#0a3a1a", color: "#4caf50" };
      case "closed": return { bg: "#3a1a1a", color: "#ff6b6b" };
      case "ended":  return { bg: "#2a2a2a", color: "#888" };
      default:       return { bg: "#2a2a2a", color: "#888" };
    }
  }

  // Determines button label based on auth state and tournament status
  function getActionLabel(t) {
    if (!token) return "Login to Join";
    if (t.status === "open" || t.status === "active") return "Join";
    return "View";
  }

  return (
    <div style={styles.page}>
      <Header />

      <main style={styles.main}>
        {/* Page Header */}
        <header style={styles.header}>
          <h1 style={styles.title}>Tournaments</h1>
          {token && (
            <button
              style={styles.createButton}
              onClick={() => navigate("/add-tournament")}
            >
              Create Tournament
            </button>
          )}
        </header>

        {/* Search Filter */}
        <div style={styles.search}>
          <input
            type="text"
            placeholder="Search tournaments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchField}
          />
          <span style={styles.searchIcon}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
        </div>

        {/* Tournament Grid */}
        <div style={styles.grid}>
          {filtered.length > 0 ? (
            filtered.map((t) => {
              const { bg, color } = getStatusStyle(t.status);
              return (
                <article
                  key={t._id}
                  style={styles.card}
                  onClick={() => navigate(`/tournaments/${t._id}`)}
                >
                  <div style={styles.cardContent}>
                    <h2 style={styles.cardTitle}>{t.name}</h2>
                    <dl style={styles.cardMeta}>
                      <dt style={styles.visuallyHidden}>Date Range</dt>
                      <dd style={styles.metaItem}>{t.start_date?.slice(0, 10)} → {t.end_date?.slice(0, 10)}</dd>
                      
                      <span aria-hidden="true" style={styles.metaSeparator}>·</span>
                      
                      <dt style={styles.visuallyHidden}>Starting Balance</dt>
                      <dd style={styles.metaItem}>${t.starting_balance} starting balance</dd>
                    </dl>
                    {t.description && <p style={styles.cardDescription}>{t.description}</p>}
                  </div>
                  <div style={styles.cardActions}>
                    <span style={{ ...styles.badge, backgroundColor: bg, color }}>
                      {t.status}
                    </span>
                    <button
                      style={styles.actionButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/tournaments/${t._id}`);
                      }}
                    >
                      {getActionLabel(t)}
                    </button>
                  </div>
                </article>
              );
            })
          ) : (
            <div style={styles.emptyState}>
              <p>No tournaments found.</p>
            </div>
          )}
        </div>
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
    color: TEXT,
    fontFamily: "'Segoe UI', sans-serif",
  },
  main: {
    maxWidth: "78.125rem",
    margin: "0 auto",
    padding: "3.125rem 1.25rem 5rem",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1.75rem",
    paddingBottom: "1.25rem",
    borderBottom: "1px solid #3a3a3a",
  },
  title: {
    margin: 0,
    fontSize: "2rem",
    color: TEXT,
    fontWeight: "700",
  },
  createButton: {
    padding: "0.625rem 1.375rem",
    backgroundColor: BLUE,
    color: "#fff",
    border: "none",
    borderRadius: "0.375rem",
    fontWeight: "600",
    fontSize: "0.95rem",
    cursor: "pointer",
  },
  search: {
    position: "relative",
    maxWidth: "31.25rem",
    marginBottom: "1.75rem",
  },
  searchField: {
    width: "100%",
    padding: "0.75rem 2.75rem 0.75rem 1.125rem",
    borderRadius: "0.5rem",
    border: "none",
    backgroundColor: "#333333",
    color: TEXT,
    fontSize: "1rem",
    outline: "none",
    boxSizing: "border-box",
  },
  searchIcon: {
    position: "absolute",
    right: "0.875rem",
    top: "50%",
    transform: "translateY(-50%)",
    display: "flex",
    alignItems: "center",
    pointerEvents: "none",
  },
  grid: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
  card: {
    backgroundColor: "#333333",
    borderRadius: "0.625rem",
    padding: "1.25rem 1.5rem",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "1.25rem",
    cursor: "pointer",
  },
  cardContent: {
    display: "flex",
    flexDirection: "column",
    gap: "0.375rem",
  },
  cardTitle: {
    margin: 0,
    fontSize: "1rem",
    color: TEXT,
    fontWeight: "600",
  },
  cardMeta: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    flexWrap: "wrap",
    margin: 0,
  },
  metaItem: {
    fontSize: "0.85rem",
    color: "#aaa",
    margin: 0,
  },
  metaSeparator: {
    color: "#555",
  },
  cardDescription: {
    margin: "0.25rem 0 0",
    fontSize: "0.85rem",
    color: "#777",
  },
  cardActions: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    flexShrink: 0,
  },
  badge: {
    padding: "0.25rem 0.75rem",
    borderRadius: "1.25rem",
    fontSize: "0.75rem",
    fontWeight: "600",
    whiteSpace: "nowrap",
  },
  actionButton: {
    padding: "0.5rem 1.25rem",
    backgroundColor: BLUE,
    color: "#fff",
    border: "none",
    borderRadius: "0.375rem",
    fontWeight: "600",
    fontSize: "0.9rem",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  emptyState: {
    textAlign: "center",
    padding: "3.75rem 2.5rem",
    color: "#666",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "1.25rem",
  },
  visuallyHidden: {
    position: "absolute",
    width: "1px",
    height: "1px",
    padding: 0,
    margin: "-1px",
    overflow: "hidden",
    clip: "rect(0, 0, 0, 0)",
    whiteSpace: "nowrap",
    border: 0,
  },
};

export default Tournaments;