/**
 * TournamentDetail Component
 *
 * Displays tournament page. Visitor view for non-participants,
 * swaps to TournamentDetailJoined when user has joined.
 */

import { useContext, useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import Header from "../components/Header";
import Button from "../components/UI/Button";
import InfoModal from "../components/InfoModal";
import TournamentDetailJoined from "./TournamentDetailJoined";
import { ReactComponent as TentIcon } from "../assets/Icon_16x16/Tent_16x16.svg";
import { ReactComponent as CheckIcon } from "../assets/Icon_16x16/Check-Completed_16x16.svg";
import { ReactComponent as SortIcon } from "../assets/Icon_16x16/Sort_16x16.svg";
import { ReactComponent as RefreshIcon } from "../assets/Icon_16x16/Refresh_16x16.svg";
import { ReactComponent as ProfileIcon } from "../assets/Icon_Others/Profile-Default_32x32.svg";
import "../styles/TournamentDetail.css";

function formatCurrency(amount) {
  return Number(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getStatusLabel(status) {
  switch (status) {
    case "open":
      return "OPEN";
    case "active":
      return "ACTIVE NOW";
    case "closed":
      return "CLOSED";
    case "ended":
      return "ENDED";
    default:
      return status?.toUpperCase() || "";
  }
}

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
  const [toast, setToast] = useState(location.state?.toast || "");
  const [showDetails, setShowDetails] = useState(false);

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
              (p) => p.user?._id === user.id || p.user === user.id,
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
      const res = await fetch(
        `http://localhost:5000/api/tournaments/${id}/join`,
        { method: "POST", headers: { Authorization: token } },
      );
      const data = await res.json();
      if (res.ok) {
        const pRes = await fetch(
          `http://localhost:5000/api/tournaments/${id}/participants`,
        );
        const pData = await pRes.json();
        setParticipants(pData);
        setIsParticipant(true);
        const mine = pData.find(
          (p) => p.user?._id === user.id || p.user === user.id,
        );
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
      const res = await fetch(
        `http://localhost:5000/api/tournaments/${id}/leave`,
        { method: "DELETE", headers: { Authorization: token } },
      );
      const data = await res.json();
      if (res.ok) {
        setIsParticipant(false);
        setMyParticipant(null);
        const pRes = await fetch(
          `http://localhost:5000/api/tournaments/${id}/participants`,
        );
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
      const res = await fetch(
        `http://localhost:5000/api/tournaments/${id}/close`,
        { method: "PATCH", headers: { Authorization: token } },
      );
      const data = await res.json();
      if (res.ok) setTournament(data);
      else alert(data.message || "Failed to update status");
    } catch (err) {
      console.error("Close error:", err);
    }
  }

  async function handleDeleteTournament() {
    if (!window.confirm("Are you sure you want to delete this tournament?"))
      return;
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

  function refreshParticipants() {
    fetch(`http://localhost:5000/api/tournaments/${id}/participants`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setParticipants(data);
      })
      .catch(console.error);
  }

  if (loading) {
    return (
      <div className="td-page">
        <Header />
        <main className="td-main">
          <p className="td-loading">Loading...</p>
        </main>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="td-page">
        <Header />
        <main className="td-main">
          <p className="td-loading">Tournament not found.</p>
        </main>
      </div>
    );
  }

  /* Swap to joined view when user is a participant */
  if (isParticipant) {
    return (
      <TournamentDetailJoined
        tournament={tournament}
        participants={participants}
        stocks={stocks}
        myParticipant={myParticipant}
        user={user}
        token={token}
        id={id}
        isOwner={isOwner}
        handleLeave={handleLeave}
        handleClose={handleClose}
        handleDeleteTournament={handleDeleteTournament}
        refreshParticipants={refreshParticipants}
      />
    );
  }

  const canJoin =
    token &&
    !isOwner &&
    (tournament.status === "open" || tournament.status === "active");

  return (
    <div className="td-page">
      <Header />
      {toast && <div className="td-toast">{toast}</div>}

      <main className="td-main">
        {/* ── Header Section ── */}
        <section className="td-header-section">
          <div className="td-header-left">
            <div className="td-chips-row">
              <span
                className={`td-status-chip td-status-chip--${tournament.status}`}
              >
                {getStatusLabel(tournament.status)}
              </span>
              <span className="td-tournament-id">
                Tournament ID: PT-{id?.slice(-4) || id}
              </span>
            </div>

            <h1 className="td-title">{tournament.name}</h1>

            <div className="td-meta-row">
              <div className="td-meta-col">
                <span className="td-meta-label">Entry Balance</span>
                <span className="td-meta-value">
                  ${formatCurrency(tournament.starting_balance)}
                </span>
              </div>
              <div className="td-meta-col">
                <span className="td-meta-label">Participants</span>
                <span className="td-meta-value">
                  {participants.length.toLocaleString()}
                </span>
              </div>
              <div className="td-meta-col">
                <span className="td-meta-label">Closing Date</span>
                <span className="td-meta-value">
                  {formatDate(tournament.end_date)}
                </span>
              </div>
              {tournament.owner?.username && (
                <div className="td-meta-col">
                  <span className="td-meta-label">Host</span>
                  <span className="td-meta-value td-meta-value--host">
                    {tournament.owner.username}
                    <CheckIcon className="td-verified-icon" />
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Join Container — logged-in, not joined */}
          {canJoin && (
            <div className="td-join-container">
              <Button
                variant="primary"
                headIcon={<TentIcon />}
                onClick={handleJoin}
              >
                Join Tournament
              </Button>
              <button
                type="button"
                className="td-view-rules-btn"
                onClick={() => setShowDetails(true)}
              >
                View Details
              </button>
            </div>
          )}

          {!canJoin && !isOwner && (
            <div className="td-join-container">
              <button
                type="button"
                className="td-view-rules-btn"
                onClick={() => setShowDetails(true)}
              >
                View Details
              </button>
            </div>
          )}

          {/* Owner Controls */}
          {isOwner && (
            <div className="td-join-container">
              <Button variant="secondary" onClick={handleClose}>
                {tournament.status === "closed"
                  ? "Open Joining"
                  : "Close Joining"}
              </Button>
              <Button variant="cancel" onClick={handleDeleteTournament}>
                Delete Tournament
              </Button>
              <button
                type="button"
                className="td-view-rules-btn"
                onClick={() => setShowDetails(true)}
              >
                View Details
              </button>
            </div>
          )}
        </section>

        {/* ── Leaderboard (full width) ── */}
        <section className="td-leaderboard">
          <div className="td-leaderboard-header">
            <h2 className="td-leaderboard-title">Tournament Leaderboard</h2>
            <div className="td-leaderboard-actions">
              <button type="button" className="td-icon-btn" aria-label="Sort">
                <SortIcon />
              </button>
              <button
                type="button"
                className="td-icon-btn"
                onClick={refreshParticipants}
                aria-label="Refresh"
              >
                <RefreshIcon />
              </button>
            </div>
          </div>

          <div className="td-table">
            <div className="td-table-head">
              <span className="td-th td-th--rank">Rank</span>
              <span className="td-th td-th--user">User</span>
              <span className="td-th td-th--value">Portfolio Value</span>
              <span className="td-th td-th--change">Day Change</span>
            </div>
            <div className="td-table-body">
              {participants.map((p, i) => {
                const isMe =
                  user && (p.user?._id === user.id || p.user === user.id);
                const rank = i + 1;
                return (
                  <div
                    key={p._id}
                    className={`td-table-row${isMe ? " td-table-row--me" : ""}`}
                  >
                    <span className="td-td td-td--rank">
                      <span
                        className={`td-rank-badge${rank === 1 ? " td-rank-badge--first" : ""}${isMe ? " td-rank-badge--me" : ""}`}
                      >
                        {String(rank).padStart(2, "0")}
                      </span>
                    </span>
                    <span className="td-td td-td--user">
                      {p.user?.avatarUrl ? (
                        <img
                          src={p.user.avatarUrl}
                          alt={`${p.user?.username || "User"} avatar`}
                          className="td-avatar"
                        />
                      ) : (
                        <ProfileIcon className="td-avatar" />
                      )}
                      <span
                        className={`td-username${rank === 1 ? " td-username--first" : ""}${isMe ? " td-username--me" : ""}`}
                      >
                        {p.user?.username || "Unknown"}
                        {isMe && " (You)"}
                      </span>
                    </span>
                    <span className="td-td td-td--value">
                      ${formatCurrency(p.cash_balance || 0)}
                    </span>
                    <span className="td-td td-td--change td-change--neutral">
                      --
                    </span>
                  </div>
                );
              })}
              {participants.length === 0 && (
                <div className="td-table-empty">
                  No participants yet. Be the first to join!
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {showDetails && (
        <InfoModal
          title="Tournament Details"
          onClose={() => setShowDetails(false)}
        >
          <p className="im-section-title">Overview</p>
          <div className="im-row">
            <span className="im-label">Name</span>
            <span className="im-value">{tournament.name}</span>
          </div>
          <div className="im-row">
            <span className="im-label">Status</span>
            <span className={`im-value im-value--${tournament.status}`}>
              {getStatusLabel(tournament.status)}
            </span>
          </div>
          <div className="im-row">
            <span className="im-label">Host</span>
            <span className="im-value">
              {tournament.owner?.username || "—"}
            </span>
          </div>

          <p className="im-section-title">Schedule</p>
          <div className="im-row">
            <span className="im-label">Start Date</span>
            <span className="im-value">
              {tournament.start_date ? formatDate(tournament.start_date) : "—"}
            </span>
          </div>
          <div className="im-row">
            <span className="im-label">End Date</span>
            <span className="im-value">{formatDate(tournament.end_date)}</span>
          </div>

          <p className="im-section-title">Rules</p>
          <div className="im-row">
            <span className="im-label">Starting Balance</span>
            <span className="im-value">
              ${formatCurrency(tournament.starting_balance)}
            </span>
          </div>
          <div className="im-row">
            <span className="im-label">Entry Fee</span>
            <span className="im-value">Free</span>
          </div>
          <div className="im-row">
            <span className="im-label">Participants</span>
            <span className="im-value">{participants.length}</span>
          </div>
          <div className="im-row">
            <span className="im-label">Transaction Fee</span>
            <span className="im-value">$0.00 (Paper Account)</span>
          </div>

          <p className="im-section-title">Description</p>
          <p className="im-message">
            {tournament.description?.trim() || "No description / rules provided."}
          </p>
        </InfoModal>
      )}
    </div>
  );
}

export default TournamentDetail;
