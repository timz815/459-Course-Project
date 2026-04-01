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
import Button from "../components/UI/Button";
import "../styles/Dashboard.css";

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
    <div className="dashboard-page">
      <Header />

      <main className="dashboard-main">
        {/* User Greeting */}
        {user && (
          <section className="dashboard-greeting">
            <h1 className="dashboard-greeting-title ds-type-title-l">
              Welcome back, {user.username}
            </h1>
          </section>
        )}

        {/* Tournaments Section */}
        <section className="dashboard-section">
          {/* Section Header with Controls */}
          <div>
            <div className="dashboard-divider"></div>

            <div className="dashboard-header">
              <h2 className="dashboard-section-title ds-type-title-m">
                My Tournaments
              </h2>

              <nav className="dashboard-actions">
                <Button
                  variant="secondary"
                  onClick={() => navigate("/tournaments")}
                >
                  Check All Tournaments
                </Button>

                <Button
                  variant="primary"
                  onClick={() => navigate("/add-tournament")}
                >
                  Create Tournament
                </Button>
              </nav>
            </div>
          </div>

          {/* Tournament Cards */}
          <div className="dashboard-grid">
            {tournaments.length > 0 ? (
              tournaments.map((t) => (
                <article
                  key={t._id}
                  className="dashboard-card"
                  onClick={() => navigate(`/tournaments/${t._id}`)}
                >
                  <div className="dashboard-card-content">
                    <h3 className="dashboard-card-title">{t.name}</h3>

                    <dl className="dashboard-card-meta">
                      <dt className="ds-visually-hidden">Date Range</dt>
                      <dd className="dashboard-meta-item">
                        {t.start_date?.slice(0, 10)} →{" "}
                        {t.end_date?.slice(0, 10)}
                      </dd>

                      <span
                        aria-hidden="true"
                        className="dashboard-meta-separator"
                      >
                        ·
                      </span>

                      <dt className="ds-visually-hidden">Starting Balance</dt>
                      <dd className="dashboard-meta-item">
                        ${t.starting_balance} starting balance
                      </dd>
                    </dl>

                    {t.description && (
                      <p className="dashboard-card-description">
                        {t.description}
                      </p>
                    )}
                  </div>

                  <div className="dashboard-card-actions">
                    <Button
                      variant="cancel"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(t._id);
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </article>
              ))
            ) : (
              <div className="dashboard-empty ds-type-body-2">
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

export default Dashboard;
