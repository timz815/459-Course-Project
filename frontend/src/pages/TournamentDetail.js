/**
 * TournamentDetail Component
 *
 * Displays full tournament information with participant management and owner controls.
 *
 * Key behaviours:
 * - Fetches tournament data and participant list on mount
 * - Determines user role (owner/participant/guest) for conditional UI rendering
 * - Handles join/leave actions with optimistic UI updates
 * - Provides owner controls for open/close status and tournament deletion
 * - Shows ranked participant list with cash balances
 * - Displays status badges with color-coded styling
 */

import { useContext, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import Header from "../components/Header";

function TournamentDetail() {
  const { id } = useParams();
  const { token, user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [tournament, setTournament] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [isParticipant, setIsParticipant] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch tournament details and participant data
  useEffect(() => {
    async function fetchData() {
      try {
        const tRes = await fetch("http://localhost:5000/api/tournaments/" + id);
        const tData = await tRes.json();
        setTournament(tData);

        if (user && tData.owner) {
          setIsOwner(tData.owner._id === user.id || tData.owner === user.id);
        }

        const pRes = await fetch("http://localhost:5000/api/tournaments/" + id + "/participants");
        const pData = await pRes.json();
        setParticipants(Array.isArray(pData) ? pData : []);

        if (user && Array.isArray(pData)) {
          const already = pData.some((p) => p.user?._id === user.id || p.user === user.id);
          setIsParticipant(already);
        }
      } catch (err) {
        console.error("Error fetching tournament:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [id, user]);

  // Join tournament as authenticated user
  async function handleJoin() {
    try {
      const res = await fetch("http://localhost:5000/api/tournaments/" + id + "/join", {
        method: "POST",
        headers: { Authorization: token },
      });
      const data = await res.json();
      if (res.ok) {
        setIsParticipant(true);
        const pRes = await fetch("http://localhost:5000/api/tournaments/" + id + "/participants");
        const pData = await pRes.json();
        setParticipants(pData);
      } else {
        alert(data.message || "Failed to join");
      }
    } catch (err) {
      console.error("Join error:", err);
    }
  }

  // Leave tournament and refresh participant list
  async function handleLeave() {
    try {
      const res = await fetch("http://localhost:5000/api/tournaments/" + id + "/leave", {
        method: "DELETE",
        headers: { Authorization: token },
      });
      const data = await res.json();
      if (res.ok) {
        setIsParticipant(false);
        const pRes = await fetch("http://localhost:5000/api/tournaments/" + id + "/participants");
        const pData = await pRes.json();
        setParticipants(pData);
      } else {
        alert(data.message || "Failed to leave");
      }
    } catch (err) {
      console.error("Leave error:", err);
    }
  }

  // Toggle tournament open/closed status (owner only)
  async function handleClose() {
    try {
      const res = await fetch("http://localhost:5000/api/tournaments/" + id + "/close", {
        method: "PATCH",
        headers: { Authorization: token },
      });
      const data = await res.json();
      if (res.ok) {
        setTournament(data);
      } else {
        alert(data.message || "Failed to update tournament status");
      }
    } catch (err) {
      console.error("Close/Open error:", err);
    }
  }

  // Delete tournament with confirmation (owner only)
  async function handleDeleteTournament() {
    if (!window.confirm("Are you sure you want to delete this tournament? This cannot be undone.")) return;
    try {
      const res = await fetch("http://localhost:5000/api/tournaments/" + id, {
        method: "DELETE",
        headers: { Authorization: token },
      });
      if (res.ok) {
        navigate("/tournaments");
      } else {
        const data = await res.json();
        alert(data.message || "Failed to delete tournament");
      }
    } catch (err) {
      console.error("Delete tournament error:", err);
    }
  }

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

  if (loading) {
    return (
      <div style={styles.page}>
        <Header />
        <main style={styles.main}>
          <p style={styles.statusMessage}>Loading...</p>
        </main>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div style={styles.page}>
        <Header />
        <main style={styles.main}>
          <p style={styles.statusMessage}>Tournament not found.</p>
        </main>
      </div>
    );
  }

  const { bg, color } = getStatusStyle(tournament.status);
  const canJoin = tournament.status === "open" || tournament.status === "active";

  return (
    <div style={styles.page}>
      <Header />

      <main style={styles.main}>
        <nav style={styles.backNavigation}>
          <button style={styles.backButton} onClick={() => navigate("/tournaments")}>
            ← Back to Tournaments
          </button>
        </nav>

        <header style={styles.tournamentHeader}>
          <div style={styles.titleRow}>
            <h1 style={styles.title}>{tournament.name}</h1>
            <span style={{ ...styles.badge, backgroundColor: bg, color }}>
              {tournament.status}
            </span>
          </div>

          <dl style={styles.metaList}>
            <dt style={styles.visuallyHidden}>Date Range</dt>
            <dd style={styles.metaItem}>{tournament.start_date?.slice(0, 10)} → {tournament.end_date?.slice(0, 10)}</dd>
            
            <span aria-hidden="true" style={styles.metaSeparator}>·</span>
            
            <dt style={styles.visuallyHidden}>Starting Balance</dt>
            <dd style={styles.metaItem}>${tournament.starting_balance} starting balance</dd>
            
            <span aria-hidden="true" style={styles.metaSeparator}>·</span>
            
            <dt style={styles.visuallyHidden}>Participant Count</dt>
            <dd style={styles.metaItem}>{participants.length} participants</dd>
            
            {tournament.owner?.username && (
              <>
                <span aria-hidden="true" style={styles.metaSeparator}>·</span>
                <dt style={styles.visuallyHidden}>Host</dt>
                <dd style={styles.metaItem}>Hosted by {tournament.owner.username}</dd>
              </>
            )}
          </dl>

          {tournament.description && (
            <p style={styles.description}>{tournament.description}</p>
          )}
        </header>

        <section style={styles.actionPanel}>
          {!token ? (
            <div style={styles.actionRow}>
              <p style={styles.actionText}>Login to join this tournament.</p>
              <button style={styles.primaryButton} onClick={() => navigate("/login")}>
                Login to Join
              </button>
            </div>
          ) : isOwner ? (
            <div style={styles.actionRow}>
              <p style={styles.ownerText}>You created this tournament.</p>
              <div style={styles.ownerActions}>
                <button style={styles.secondaryButton} onClick={handleClose}>
                  {tournament.status === "closed" ? "Open Joining" : "Close Joining"}
                </button>
                <button style={styles.dangerButton} onClick={handleDeleteTournament}>
                  Delete Tournament
                </button>
              </div>
            </div>
          ) : isParticipant ? (
            <div style={styles.actionRow}>
              <p style={styles.successText}>✓ You are participating in this tournament.</p>
              {canJoin && (
                <button style={styles.dangerButton} onClick={handleLeave}>
                  Leave Tournament
                </button>
              )}
            </div>
          ) : (
            <div style={styles.actionRow}>
              <p style={styles.actionText}>You are not part of this tournament.</p>
              {canJoin ? (
                <button style={styles.primaryButton} onClick={handleJoin}>
                  Join Tournament
                </button>
              ) : (
                <span style={styles.closedText}>Tournament is {tournament.status}</span>
              )}
            </div>
          )}
        </section>

        <section style={styles.participantsSection}>
          <h2 style={styles.sectionTitle}>
            Participants
            <span style={styles.countBadge}> ({participants.length})</span>
          </h2>

          {participants.length > 0 ? (
            <ol style={styles.leaderboard}>
              {participants.map((p, index) => (
                <li key={p._id} style={styles.leaderboardItem}>
                  <div style={styles.participantInfo}>
                    <span style={styles.rank}>#{index + 1}</span>
                    <span style={styles.participantName}>{p.user?.username || "Unknown"}</span>
                  </div>
                  <output style={styles.balance}>${p.cash_balance?.toLocaleString()}</output>
                </li>
              ))}
            </ol>
          ) : (
            <div style={styles.emptyState}>
              <p>No participants yet. Be the first to join!</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

const BLUE = "#0F9FEA";
const BG = "#1A1A1A";
const TEXT = "#F9F9F9";

const styles = {
  page: { minHeight: "100vh", backgroundColor: BG, color: TEXT, fontFamily: "'Segoe UI', sans-serif" },
  main: { maxWidth: "78.125rem", margin: "0 auto", padding: "2.5rem 1.25rem 5rem" },
  statusMessage: { textAlign: "center", padding: "5rem", color: "#888" },
  backNavigation: { marginBottom: "1.5rem" },
  backButton: { background: "none", border: "none", color: BLUE, fontWeight: "600", fontSize: "0.9rem", cursor: "pointer", padding: 0 },
  tournamentHeader: { marginBottom: "1.5rem" },
  titleRow: { display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.75rem", flexWrap: "wrap" },
  title: { margin: 0, fontSize: "2rem", fontWeight: "700", color: TEXT },
  badge: { padding: "0.25rem 0.875rem", borderRadius: "1.25rem", fontSize: "0.8rem", fontWeight: "600", whiteSpace: "nowrap" },
  metaList: { display: "flex", alignItems: "center", gap: "0.625rem", flexWrap: "wrap", margin: "0 0 0.75rem 0" },
  metaItem: { fontSize: "0.9rem", color: "#aaa", margin: 0 },
  metaSeparator: { color: "#444" },
  description: { color: "#888", fontSize: "0.95rem", marginTop: "0.75rem", lineHeight: 1.6 },
  actionPanel: { backgroundColor: "#2a2a2a", border: "1px solid #3a3a3a", borderRadius: "0.625rem", padding: "1.25rem 1.5rem", marginBottom: "2rem" },
  actionRow: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1.25rem" },
  actionText: { margin: 0, color: "#888", fontSize: "0.95rem" },
  successText: { margin: 0, color: "#4caf50", fontSize: "0.95rem", fontWeight: "600" },
  ownerText: { margin: 0, color: BLUE, fontSize: "0.95rem", fontWeight: "600" },
  ownerActions: { display: "flex", gap: "0.75rem" },
  primaryButton: { padding: "0.625rem 1.5rem", backgroundColor: BLUE, color: "#fff", border: "none", borderRadius: "0.375rem", fontWeight: "600", fontSize: "0.95rem", cursor: "pointer", whiteSpace: "nowrap" },
  secondaryButton: { padding: "0.625rem 1.5rem", backgroundColor: "transparent", color: "#ffaa55", border: "1px solid #ffaa55", borderRadius: "0.375rem", fontWeight: "600", fontSize: "0.95rem", cursor: "pointer", whiteSpace: "nowrap" },
  dangerButton: { padding: "0.625rem 1.5rem", backgroundColor: "transparent", color: "#ff6b6b", border: "1px solid #ff6b6b", borderRadius: "0.375rem", fontWeight: "600", fontSize: "0.95rem", cursor: "pointer", whiteSpace: "nowrap" },
  closedText: { color: "#666", fontSize: "0.9rem", fontStyle: "italic" },
  participantsSection: {},
  sectionTitle: { fontSize: "1.2rem", fontWeight: "600", color: TEXT, marginBottom: "1rem", paddingBottom: "0.75rem", borderBottom: "1px solid #3a3a3a" },
  countBadge: { color: "#888", fontWeight: "400", fontSize: "1rem" },
  leaderboard: { display: "flex", flexDirection: "column", gap: "0.5rem", listStyle: "none", padding: 0, margin: 0 },
  leaderboardItem: { display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#252525", padding: "0.875rem 1.25rem", borderRadius: "0.5rem" },
  participantInfo: { display: "flex", alignItems: "center", gap: "0.875rem" },
  rank: { color: "#555", fontSize: "0.85rem", fontWeight: "600", minWidth: "1.75rem" },
  participantName: { color: TEXT, fontWeight: "600", fontSize: "0.95rem" },
  balance: { color: "#4caf50", fontWeight: "700", fontSize: "0.95rem" },
  emptyState: { textAlign: "center", padding: "2.5rem", color: "#666" },
  visuallyHidden: { position: "absolute", width: "1px", height: "1px", padding: 0, margin: "-1px", overflow: "hidden", clip: "rect(0, 0, 0, 0)", whiteSpace: "nowrap", border: 0 },
};

export default TournamentDetail;