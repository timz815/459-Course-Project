/**
 * Dashboard Component
 *
 * Main user dashboard displaying personal tournaments with management capabilities.
 *
 * Key behaviours:
 * - Fetches user's tournaments from API on mount (requires auth token)
 * - Displays greeting with authenticated user's username
 * - Lists tournaments as clickable cards with date range, balance, and description
 * - Provides delete functionality with permission handling
 * - Empty state prompts user to create or join tournaments
 * - Navigation to tournament creation and global tournament list
 */

import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import Header from "../components/Header";

function Dashboard() {
  const [tournaments, setTournaments] = useState([]);
  const { token, user } = useContext(AuthContext);
  const navigate = useNavigate();

  // Fetch user's tournaments on mount when token available
  useEffect(() => {
    if (!token) return;

    fetch("http://localhost:5000/api/tournaments/my-tournaments", {
      headers: { Authorization: token },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Could not retrieve tournaments.");
        return res.json();
      })
      .then((data) => setTournaments(data))
      .catch((err) => console.error("Fetch error:", err));
  }, [token]);

  // Delete tournament by ID with optimistic UI update
  async function handleDelete(id) {
    try {
      const res = await fetch(`http://localhost:5000/api/tournaments/${id}`, {
        method: "DELETE",
        headers: { Authorization: token },
      });

      if (res.ok) {
        setTournaments(tournaments.filter((t) => t._id !== id));
      } else {
        alert("Delete failed. You might not have permission.");
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  }

  return (
    <div style={styles.page}>
      <Header />

      <main style={styles.main}>

        {/* User Greeting */}
        {user && (
          <section style={styles.greeting}>
            <h1 style={styles.greetingTitle}>Welcome back, {user.username}</h1>
          </section>
        )}

        {/* Tournaments Section */}
        <section style={styles.section}>

          {/* Section Header with Controls */}
          <div style={styles.sectionHeader}>
            <div style={styles.divider}></div>

            <div style={styles.headerContent}>
              <h2 style={styles.sectionTitle}>My Tournaments</h2>

              <nav style={styles.headerActions}>
                <button
                  style={styles.secondaryBtn}
                  onClick={() => navigate("/tournaments")}
                >
                  Check All Tournaments
                </button>

                <button
                  style={styles.primaryBtn}
                  onClick={() => navigate("/add-tournament")}
                >
                  Create Tournament
                </button>
              </nav>
            </div>
          </div>

          {/* Tournament Cards */}
          <div style={styles.grid}>
            {tournaments.length > 0 ? (
              tournaments.map((t) => (
                <article 
                  key={t._id} 
                  style={styles.card}
                  onClick={() => navigate(`/tournaments/${t._id}`)}
                >
                  <div style={styles.cardContent}>
                    <h3 style={styles.cardTitle}>{t.name}</h3>

                    <dl style={styles.cardMeta}>
                      <dt style={styles.visuallyHidden}>Date Range</dt>
                      <dd style={styles.metaItem}>
                        {t.start_date?.slice(0, 10)} → {t.end_date?.slice(0, 10)}
                      </dd>

                      <span aria-hidden="true" style={styles.metaSeparator}>·</span>

                      <dt style={styles.visuallyHidden}>Starting Balance</dt>
                      <dd style={styles.metaItem}>
                        ${t.starting_balance} starting balance
                      </dd>
                    </dl>

                    {t.description && (
                      <p style={styles.cardDescription}>{t.description}</p>
                    )}
                  </div>

                  <div style={styles.cardActions}>
                    <button
                      style={styles.deleteBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(t._id);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <div style={styles.emptyState}>
                <p>You have no tournaments yet.</p>
                <p>Create your own or join other tournaments</p>
              </div>
            )}
          </div>

        </section>

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
    fontFamily: "'Segoe UI', sans-serif",
    color: TEXT,
  },

  main: {
    maxWidth: "78.125rem",
    margin: "0 auto",
    padding: "2.5rem 1.25rem",
  },

  greeting: {
    marginBottom: "3.125rem",
  },

  greetingTitle: {
    margin: 0,
    fontSize: "2rem",
    fontWeight: "700",
  },

  section: {
    marginBottom: "1.5rem",
  },

  sectionHeader: {
    marginBottom: "1.5rem",
  },

  divider: {
    height: "1px",
    backgroundColor: "#3a3a3a",
    marginBottom: "1.5rem",
  },

  headerContent: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  sectionTitle: {
    margin: 0,
    fontSize: "1.4rem",
    fontWeight: "600",
  },

  headerActions: {
    display: "flex",
    gap: "0.75rem",
  },

  primaryBtn: {
    padding: "0.75rem 1.5rem",
    backgroundColor: BLUE,
    color: "#fff",
    border: "none",
    borderRadius: "0.5rem",
    fontSize: "1rem",
    fontWeight: "600",
    cursor: "pointer",
  },

  secondaryBtn: {
    padding: "0.75rem 1.5rem",
    backgroundColor: "transparent",
    border: "1px solid #444",
    color: "#ccc",
    borderRadius: "0.5rem",
    fontSize: "1rem",
    fontWeight: "600",
    cursor: "pointer",
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
    flexShrink: 0,
  },

  deleteBtn: {
    padding: "0.5rem 1.25rem",
    backgroundColor: "transparent",
    color: "#ff6b6b",
    border: "1px solid #ff6b6b",
    borderRadius: "0.375rem",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "0.85rem",
  },

  emptyState: {
    textAlign: "center",
    padding: "3.75rem 2.5rem",
    color: "#666",
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

export default Dashboard;