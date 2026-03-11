/**
 * TournamentDetail Component
 *
 * Displays full tournament information with participant management and owner controls.
 * Participants also see Buy panel and Your Stocks (holdings + sell) panel.
 *
 * Key behaviours:
 * - Fetches tournament, participants, and stock list on mount
 * - Determines user role (owner/participant/guest) for conditional UI rendering
 * - Handles join/leave actions
 * - Buy panel: stock search dropdown → navigates to /tournaments/:id/buy/:symbol
 * - Holdings panel: lists owned stocks with shares + amount invested, search filter, sell button
 * - Shows cash balance in holdings panel
 * - Displays ranked participant leaderboard
 */

import { useContext, useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import Header from "../components/Header";
import StockSearchDropdown from "../components/StockSearchDropdown";

function TournamentDetail() {
  const { id } = useParams();
  const { token, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const [tournament, setTournament] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [myParticipant, setMyParticipant] = useState(null);
  const [isParticipant, setIsParticipant] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [holdingSearch, setHoldingSearch] = useState("");
  const [selectedStock, setSelectedStock] = useState(null);
  const [toast, setToast] = useState(location.state?.toast || "");

  // debug
  useEffect(() => {
    if (tournament) {
      console.log("Tournament status:", tournament.status);
      console.log("Is participant:", isParticipant);
      console.log("Can trade:", isParticipant && tournament.status === "active");
      console.log("Start date:", tournament.start_date);
      console.log("Now:", new Date());
    }
  }, [tournament, isParticipant]);

  // Clear toast after 4 seconds
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  useEffect(() => {
    async function fetchData() {
      try {
        const [tRes, pRes, sRes] = await Promise.all([
          fetch(`http://localhost:5000/api/tournaments/${id}`),
          fetch(`http://localhost:5000/api/tournaments/${id}/participants`),
          fetch(`http://localhost:5000/api/stocks`),
        ]);
        const tData = await tRes.json();
        const pData = await pRes.json();
        const sData = await sRes.json();

        setTournament(tData);
        setStocks(Array.isArray(sData) ? sData : []);

        if (user && tData.owner) {
          setIsOwner(tData.owner._id === user.id || tData.owner === user.id);
        }

        if (Array.isArray(pData)) {
          setParticipants(pData);
          if (user) {
            const mine = pData.find(
              (p) => p.user?._id === user.id || p.user === user.id
            );
            setIsParticipant(!!mine);
            setMyParticipant(mine || null);
          }
        }
      } catch (err) {
        console.error("Error fetching tournament:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id, user]);

  async function handleJoin() {
    try {
      const res = await fetch(`http://localhost:5000/api/tournaments/${id}/join`, {
        method: "POST",
        headers: { Authorization: token },
      });
      const data = await res.json();
      if (res.ok) {
        const pRes = await fetch(`http://localhost:5000/api/tournaments/${id}/participants`);
        const pData = await pRes.json();
        setParticipants(pData);
        setIsParticipant(true);
        const mine = pData.find((p) => p.user?._id === user.id || p.user === user.id);
        setMyParticipant(mine || null);
      } else {
        alert(data.message || "Failed to join");
      }
    } catch (err) {
      console.error("Join error:", err);
    }
  }

  async function handleLeave() {
    try {
      const res = await fetch(`http://localhost:5000/api/tournaments/${id}/leave`, {
        method: "DELETE",
        headers: { Authorization: token },
      });
      const data = await res.json();
      if (res.ok) {
        setIsParticipant(false);
        setMyParticipant(null);
        const pRes = await fetch(`http://localhost:5000/api/tournaments/${id}/participants`);
        const pData = await pRes.json();
        setParticipants(pData);
      } else {
        alert(data.message || "Failed to leave");
      }
    } catch (err) {
      console.error("Leave error:", err);
    }
  }

  async function handleClose() {
    try {
      const res = await fetch(`http://localhost:5000/api/tournaments/${id}/close`, {
        method: "PATCH",
        headers: { Authorization: token },
      });
      const data = await res.json();
      if (res.ok) setTournament(data);
      else alert(data.message || "Failed to update status");
    } catch (err) {
      console.error("Close error:", err);
    }
  }

  async function handleDeleteTournament() {
    if (!window.confirm("Are you sure you want to delete this tournament?")) return;
    try {
      const res = await fetch(`http://localhost:5000/api/tournaments/${id}`, {
        method: "DELETE",
        headers: { Authorization: token },
      });
      if (res.ok) navigate("/tournaments");
      else {
        const data = await res.json();
        alert(data.message || "Failed to delete");
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  }

  function getStatusStyle(status) {
    switch (status) {
      case "open":   return { bg: "#0a3a4a", color: "#0F9FEA" };
      case "active": return { bg: "#0a3a1a", color: "#4caf50" };
      case "closed": return { bg: "#3a1a1a", color: "#ff6b6b" };
      case "ended":  return { bg: "#2a2a2a", color: "#888" };
      default:       return { bg: "#2a2a2a", color: "#888" };
    }
  }

  // Filter holdings by search
  const holdings = myParticipant?.holdings || [];
  const filteredHoldings = holdings.filter((h) =>
    h.symbol.toLowerCase().includes(holdingSearch.toLowerCase())
  );

  if (loading) {
    return (
      <div style={styles.page}>
        <Header />
        <main style={styles.main}><p style={styles.statusMessage}>Loading...</p></main>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div style={styles.page}>
        <Header />
        <main style={styles.main}><p style={styles.statusMessage}>Tournament not found.</p></main>
      </div>
    );
  }

  const { bg, color } = getStatusStyle(tournament.status);
  const canJoin = tournament.status === "open" || tournament.status === "active";
  const now = new Date();
  const endDate = new Date(tournament.end_date);
  const hasEnded = now > endDate;

  const canTrade = isParticipant && !hasEnded;
  return (
    <div style={styles.page}>
      <Header />

      {/* Toast notification */}
      {toast && (
        <div style={styles.toast}>{toast}</div>
      )}

      <main style={styles.main}>
        <nav style={styles.backNavigation}>
          <button style={styles.backButton} onClick={() => navigate("/tournaments")}>
            ← Back to Tournaments
          </button>
        </nav>

        {/* Tournament Header */}
        <header style={styles.tournamentHeader}>
          <div style={styles.titleRow}>
            <h1 style={styles.title}>{tournament.name}</h1>
            <span style={{ ...styles.badge, backgroundColor: bg, color }}>{tournament.status}</span>
          </div>
          <dl style={styles.metaList}>
            <dt style={styles.visuallyHidden}>Date Range</dt>
            <dd style={styles.metaItem}>{tournament.start_date?.slice(0, 10)} → {tournament.end_date?.slice(0, 10)}</dd>
            <span aria-hidden="true" style={styles.metaSeparator}>·</span>
            <dt style={styles.visuallyHidden}>Starting Balance</dt>
            <dd style={styles.metaItem}>${tournament.starting_balance} starting balance</dd>
            <span aria-hidden="true" style={styles.metaSeparator}>·</span>
            <dt style={styles.visuallyHidden}>Participants</dt>
            <dd style={styles.metaItem}>{participants.length} participants</dd>
            {tournament.owner?.username && (
              <>
                <span aria-hidden="true" style={styles.metaSeparator}>·</span>
                <dt style={styles.visuallyHidden}>Host</dt>
                <dd style={styles.metaItem}>Hosted by {tournament.owner.username}</dd>
              </>
            )}
          </dl>
          {tournament.description && <p style={styles.description}>{tournament.description}</p>}
        </header>

        {/* Action Panel */}
        <section style={styles.actionPanel}>
          {!token ? (
            <div style={styles.actionRow}>
              <p style={styles.actionText}>Login to join this tournament.</p>
              <button style={styles.primaryButton} onClick={() => navigate("/login")}>Login to Join</button>
            </div>
          ) : isOwner ? (
            <div style={styles.actionRow}>
              <p style={styles.ownerText}>You created this tournament.</p>
              <div style={styles.ownerActions}>
                <button style={styles.secondaryButton} onClick={handleClose}>
                  {tournament.status === "closed" ? "Open Joining" : "Close Joining"}
                </button>
                <button style={styles.dangerButton} onClick={handleDeleteTournament}>Delete Tournament</button>
              </div>
            </div>
          ) : isParticipant ? (
            <div style={styles.actionRow}>
              <p style={styles.successText}>✓ You are participating in this tournament.</p>
              {canJoin && (
                <button style={styles.dangerButton} onClick={handleLeave}>Leave Tournament</button>
              )}
            </div>
          ) : (
            <div style={styles.actionRow}>
              <p style={styles.actionText}>You are not part of this tournament.</p>
              {canJoin ? (
                <button style={styles.primaryButton} onClick={handleJoin}>Join Tournament</button>
              ) : (
                <span style={styles.closedText}>Tournament is {tournament.status}</span>
              )}
            </div>
          )}
        </section>

        {/* Buy Panel — participants only */}
        {canTrade && (
          <section style={styles.tradePanel}>
            <h2 style={styles.tradePanelTitle}>Buy Stocks</h2>
            <div style={styles.buyRow}>
              <div style={styles.dropdownWrap}>
                <StockSearchDropdown
                  stocks={stocks}
                  selected={selectedStock}
                  onSelect={setSelectedStock}
                />
              </div>
              <button
                style={{
                  ...styles.buyButton,
                  ...(!selectedStock ? styles.buyButtonDisabled : {}),
                }}
                disabled={!selectedStock}
                onClick={() => selectedStock && navigate(`/tournaments/${id}/buy/${selectedStock.symbol}`)}
              >
                Buy
              </button>
            </div>
          </section>
        )}

        {/* Holdings / Sell Panel — participants only */}
        {canTrade && (
          <section style={styles.holdingsPanel}>
            {/* Header row */}
            <div style={styles.holdingsHeader}>
              <h2 style={styles.tradePanelTitle} >Your Stocks</h2>
              <div style={styles.holdingsSearch}>
                <svg style={styles.holdingsSearchIcon} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  placeholder="Filter…"
                  value={holdingSearch}
                  onChange={(e) => setHoldingSearch(e.target.value)}
                  style={styles.holdingsSearchInput}
                />
              </div>
            </div>

            {/* Cash balance */}
            <div style={styles.cashRow}>
              <span style={styles.cashLabel}>Cash Balance</span>
              <span style={styles.cashValue}>
                ${(myParticipant?.cash_balance ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* Holdings list */}
            {filteredHoldings.length > 0 ? (
              <div style={styles.holdingsList}>
                {filteredHoldings.map((h) => {
                  const stockInfo = stocks.find((s) => s.symbol === h.symbol);
                  return (
                    <div key={h.symbol} style={styles.holdingItem}>
                      <div style={styles.holdingLeft}>
                        <span style={styles.holdingSymbol}>{h.symbol}</span>
                        {stockInfo && <span style={styles.holdingName}>{stockInfo.name}</span>}
                      </div>
                      <div style={styles.holdingMid}>
                        <span style={styles.holdingShares}>{h.shares} shares</span>
                        <span style={styles.holdingInvested}>
                          ${h.amount_invested.toLocaleString("en-US", { minimumFractionDigits: 2 })} invested
                        </span>
                      </div>
                      <button
                        style={styles.sellButton}
                        onClick={() => navigate(`/tournaments/${id}/sell/${h.symbol}`)}
                      >
                        Sell
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={styles.emptyHoldings}>
                {holdings.length === 0
                  ? "You don't own any stocks yet. Buy some above!"
                  : "No stocks match your search."}
              </div>
            )}
          </section>
        )}

        {/* Participants Leaderboard */}
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
            <div style={styles.emptyState}><p>No participants yet. Be the first to join!</p></div>
          )}
        </section>
      </main>
    </div>
  );
}

const BLUE = "#0F9FEA";
const GREEN = "#00C076";
const RED = "#FF4D4D";
const BG = "#1A1A1A";
const TEXT = "#F9F9F9";

const styles = {
  page: { minHeight: "100vh", backgroundColor: BG, color: TEXT, fontFamily: "'Segoe UI', sans-serif" },
  main: { maxWidth: "78.125rem", margin: "0 auto", padding: "2.5rem 1.25rem 5rem" },
  toast: {
    position: "fixed", top: "5rem", left: "50%", transform: "translateX(-50%)",
    backgroundColor: "#1a3a2a", border: "1px solid #00C076", color: GREEN,
    padding: "0.75rem 1.5rem", borderRadius: "0.5rem", fontSize: "0.9rem",
    fontWeight: "600", zIndex: 999, boxShadow: "0 0.25rem 1rem rgba(0,0,0,0.4)",
    whiteSpace: "nowrap",
  },
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

  // Action panel
  actionPanel: { backgroundColor: "#2a2a2a", border: "1px solid #3a3a3a", borderRadius: "0.625rem", padding: "1.25rem 1.5rem", marginBottom: "1rem" },
  actionRow: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1.25rem" },
  actionText: { margin: 0, color: "#888", fontSize: "0.95rem" },
  successText: { margin: 0, color: "#4caf50", fontSize: "0.95rem", fontWeight: "600" },
  ownerText: { margin: 0, color: BLUE, fontSize: "0.95rem", fontWeight: "600" },
  ownerActions: { display: "flex", gap: "0.75rem" },
  primaryButton: { padding: "0.625rem 1.5rem", backgroundColor: BLUE, color: "#fff", border: "none", borderRadius: "0.375rem", fontWeight: "600", fontSize: "0.95rem", cursor: "pointer" },
  secondaryButton: { padding: "0.625rem 1.5rem", backgroundColor: "transparent", color: "#ffaa55", border: "1px solid #ffaa55", borderRadius: "0.375rem", fontWeight: "600", fontSize: "0.95rem", cursor: "pointer" },
  dangerButton: { padding: "0.625rem 1.5rem", backgroundColor: "transparent", color: "#ff6b6b", border: "1px solid #ff6b6b", borderRadius: "0.375rem", fontWeight: "600", fontSize: "0.95rem", cursor: "pointer" },
  closedText: { color: "#666", fontSize: "0.9rem", fontStyle: "italic" },

  // Buy panel
  tradePanel: { backgroundColor: "#2a2a2a", border: "1px solid #3a3a3a", borderRadius: "0.625rem", padding: "1.25rem 1.5rem", marginBottom: "1rem" },
  tradePanelTitle: { margin: "0 0 1rem 0", fontSize: "1rem", fontWeight: "600", color: TEXT },
  buyRow: { display: "flex", gap: "0.75rem", alignItems: "flex-start" },
  dropdownWrap: { flex: 1 },
  buyButton: {
    padding: "0.75rem 1.5rem", backgroundColor: GREEN, color: "#fff",
    border: "none", borderRadius: "0.5rem", fontWeight: "700", fontSize: "0.95rem",
    cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0, fontFamily: "inherit",
  },
  buyButtonDisabled: { opacity: 0.4, cursor: "not-allowed" },

  // Holdings panel
  holdingsPanel: { backgroundColor: "#2a2a2a", border: "1px solid #3a3a3a", borderRadius: "0.625rem", padding: "1.25rem 1.5rem", marginBottom: "2rem" },
  holdingsHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.875rem" },
  holdingsSearch: { position: "relative" },
  holdingsSearchIcon: { position: "absolute", left: "0.625rem", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" },
  holdingsSearchInput: {
    padding: "0.4rem 0.75rem 0.4rem 1.875rem", backgroundColor: "#1f1f1f",
    border: "1px solid #444", borderRadius: "0.375rem", color: TEXT,
    fontSize: "0.85rem", outline: "none", fontFamily: "inherit",
  },
  cashRow: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    backgroundColor: "#252525", padding: "0.625rem 0.875rem",
    borderRadius: "0.5rem", border: "1px solid #333", marginBottom: "0.75rem",
  },
  cashLabel: { fontSize: "0.82rem", color: "#888" },
  cashValue: { fontSize: "1rem", fontWeight: "700", color: GREEN },
  holdingsList: { display: "flex", flexDirection: "column", gap: "0.5rem" },
  holdingItem: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    backgroundColor: "#252525", padding: "0.75rem 1rem",
    borderRadius: "0.5rem", gap: "1rem",
  },
  holdingLeft: { display: "flex", flexDirection: "column", gap: "0.1rem", minWidth: "4rem" },
  holdingSymbol: { fontWeight: "700", fontSize: "0.95rem", color: TEXT },
  holdingName: { fontSize: "0.75rem", color: "#666", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "12rem" },
  holdingMid: { display: "flex", flexDirection: "column", gap: "0.1rem", flex: 1 },
  holdingShares: { fontSize: "0.9rem", color: TEXT, fontWeight: "600" },
  holdingInvested: { fontSize: "0.78rem", color: "#888" },
  sellButton: {
    padding: "0.4rem 1rem", backgroundColor: "transparent", color: RED,
    border: `1px solid ${RED}`, borderRadius: "0.375rem", fontWeight: "600",
    fontSize: "0.85rem", cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit",
  },
  emptyHoldings: { color: "#666", fontSize: "0.9rem", textAlign: "center", padding: "1.5rem 0" },

  // Leaderboard
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
  visuallyHidden: { position: "absolute", width: "1px", height: "1px", padding: 0, margin: "-1px", overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap", border: 0 },
};

export default TournamentDetail;