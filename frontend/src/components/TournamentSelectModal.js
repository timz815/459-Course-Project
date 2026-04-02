import { useEffect, useRef, useState } from "react";
import magnifyIcon from "../assets/Icon_16x16/Magnify_16x16.svg";
import { ReactComponent as CancelIcon } from "../assets/Icon_16x16/Cancel_16x16.svg";
import { ReactComponent as PlusIcon } from "../assets/Icon_16x16/Plus_16x16.svg";
import "../styles/TournamentSelectModal.css";

function formatCurrency(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "$0.00";
  return (
    "$" +
    n.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function timeRemaining(endDate) {
  if (!endDate) return "";
  const diff = new Date(endDate) - new Date();
  if (diff <= 0) return "Ended";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  if (days > 0) return `Ends in ${days}d ${hours}h`;
  if (hours > 0) return `Ends in ${hours}h`;
  const mins = Math.floor((diff / (1000 * 60)) % 60);
  return `Ends in ${mins}m`;
}

function getStatusLabel(status) {
  switch (status) {
    case "open":
      return "OPEN";
    case "active":
      return "ACTIVE";
    default:
      return status?.toUpperCase() || "";
  }
}

function TournamentSelectModal({
  symbol,
  token,
  onSelect,
  onClose,
  onJoinNew,
}) {
  const [tournaments, setTournaments] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const overlayRef = useRef(null);

  useEffect(() => {
    if (!token) return;
    async function fetchTournaments() {
      try {
        const tokenPayload = JSON.parse(atob(token.split(".")[1]));
        const userId = tokenPayload.id;

        const res = await fetch("http://localhost:5000/api/tournaments");
        const all = await res.json();
        if (!Array.isArray(all)) return;

        const active = all.filter(
          (t) => t.status === "active" || t.status === "open",
        );

        const result = [];
        for (const t of active) {
          try {
            const pRes = await fetch(
              `http://localhost:5000/api/tournaments/${t._id}/participants`,
            );
            const participants = await pRes.json();
            if (!Array.isArray(participants)) continue;
            const myP = participants.find(
              (p) => (p.user?._id || p.user) === userId,
            );
            if (myP) {
              const holdsShares = myP.holdings?.some(
                (h) => h.symbol === symbol.toUpperCase() && h.shares > 0,
              );
              result.push({
                _id: t._id,
                name: t.name,
                status: t.status,
                end_date: t.end_date,
                cash_balance: myP.cash_balance,
                holdsShares: !!holdsShares,
              });
            }
          } catch {
            // skip
          }
        }
        setTournaments(result);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchTournaments();
  }, [token, symbol]);

  function handleOverlayClick(e) {
    if (e.target === overlayRef.current) onClose();
  }

  const filtered = search
    ? tournaments.filter((t) =>
        t.name.toLowerCase().includes(search.toLowerCase()),
      )
    : tournaments;

  return (
    <div className="tsm-overlay" ref={overlayRef} onClick={handleOverlayClick}>
      <div className="tsm-modal" data-node-id="568:4341">
        {/* Header */}
        <div className="tsm-header">
          <div className="tsm-header-text">
            <h2 className="tsm-title">Select Tournament to Trade</h2>
            <p className="tsm-subtitle">
              Choose an active bracket for {symbol} position
            </p>
          </div>
          <button
            type="button"
            className="tsm-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <CancelIcon className="tsm-close-icon" />
          </button>
        </div>

        {/* Search */}
        <div className="tsm-search-wrap">
          <div className="tsm-search">
            <img src={magnifyIcon} alt="" className="tsm-search-icon" />
            <input
              type="text"
              className="tsm-search-input"
              placeholder="Search tournaments..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* List */}
        <div className="tsm-list">
          {loading && <p className="tsm-empty">Loading tournaments...</p>}
          {!loading && filtered.length === 0 && (
            <p className="tsm-empty">
              {tournaments.length === 0
                ? "You haven\u2019t joined any active tournaments yet."
                : "No tournaments match your search."}
            </p>
          )}
          {filtered.map((t) => (
            <button
              key={t._id}
              type="button"
              className="tsm-item"
              onClick={() => onSelect(t._id, t.holdsShares)}
            >
              <div className="tsm-item-left">
                <span className="tsm-item-name">{t.name}</span>
                <div className="tsm-item-meta">
                  <span className="tsm-item-chip">
                    {getStatusLabel(t.status)}
                  </span>
                  <span className="tsm-item-dot">&middot;</span>
                  <span className="tsm-item-time">
                    {timeRemaining(t.end_date)}
                  </span>
                </div>
              </div>
              <div className="tsm-item-right">
                <span className="tsm-item-balance-label">
                  {t.holdsShares ? "Holding · Sell" : "No Position · Buy"}
                </span>
                <span className="tsm-item-balance-value">
                  {formatCurrency(t.cash_balance)}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="tsm-footer">
          <button type="button" className="tsm-footer-link" onClick={onJoinNew}>
            <PlusIcon className="tsm-footer-plus" />
            <span>JOIN NEW AREA</span>
          </button>
          <button type="button" className="tsm-footer-cancel" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default TournamentSelectModal;
