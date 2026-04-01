/**
 * TournamentDetail Component
 *
 * Displays full tournament information with participant management and owner controls.
 */

import { useContext, useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import Header from "../components/Header";
import Button from "../components/UI/Button";
import Input from "../components/UI/Input";
import StockSearchDropdown from "../components/StockSearchDropdown";
import "../styles/TournamentDetail.css";

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
        {
          method: "POST",
          headers: { Authorization: token },
        },
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
        {
          method: "DELETE",
          headers: { Authorization: token },
        },
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
        {
          method: "PATCH",
          headers: { Authorization: token },
        },
      );
      const data = await res.json();
      if (res.ok) {
        setTournament(data);
      } else {
        alert(data.message || "Failed to update status");
      }
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
      if (res.ok) {
        navigate("/tournaments");
      } else {
        const data = await res.json();
        alert(data.message || "Failed to delete");
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  }

  function getStatusClass(status) {
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

  const holdings = myParticipant?.holdings || [];
  const filteredHoldings = holdings.filter((h) =>
    h.symbol.toLowerCase().includes(holdingSearch.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="tournament-detail-page">
        <Header />
        <main className="tournament-detail-main">
          <p className="tournament-detail-status ds-type-body-2">Loading...</p>
        </main>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="tournament-detail-page">
        <Header />
        <main className="tournament-detail-main">
          <p className="tournament-detail-status ds-type-body-2">
            Tournament not found.
          </p>
        </main>
      </div>
    );
  }

  const statusClass = getStatusClass(tournament.status);
  const canJoin =
    tournament.status === "open" || tournament.status === "active";
  const now = new Date();
  const endDate = new Date(tournament.end_date);
  const hasEnded = now > endDate;
  const canTrade = isParticipant && !hasEnded;

  return (
    <div className="tournament-detail-page">
      <Header />

      {toast && <div className="tournament-detail-toast">{toast}</div>}

      <main className="tournament-detail-main">
        <nav className="tournament-detail-back-nav">
          <Button
            variant="secondary"
            size="small"
            onClick={() => navigate("/tournaments")}
          >
            �� Back to Tournaments
          </Button>
        </nav>

        <header className="tournament-detail-header">
          <div className="tournament-detail-title-row">
            <h1 className="tournament-detail-title ds-type-title-l">
              {tournament.name}
            </h1>
            <span
              className={`tournament-detail-status-badge tournament-detail-status-${statusClass}`}
            >
              {tournament.status}
            </span>
          </div>
          <dl className="tournament-detail-metadata">
            <dt className="ds-visually-hidden">Date Range</dt>
            <dd className="tournament-detail-meta-item">
              {tournament.start_date?.slice(0, 10)} ��{" "}
              {tournament.end_date?.slice(0, 10)}
            </dd>
            <span
              aria-hidden="true"
              className="tournament-detail-meta-separator"
            >
              ��
            </span>
            <dt className="ds-visually-hidden">Starting Balance</dt>
            <dd className="tournament-detail-meta-item">
              ${tournament.starting_balance} starting balance
            </dd>
            <span
              aria-hidden="true"
              className="tournament-detail-meta-separator"
            >
              ��
            </span>
            <dt className="ds-visually-hidden">Participants</dt>
            <dd className="tournament-detail-meta-item">
              {participants.length} participants
            </dd>
            {tournament.owner?.username && (
              <>
                <span
                  aria-hidden="true"
                  className="tournament-detail-meta-separator"
                >
                  ��
                </span>
                <dt className="ds-visually-hidden">Host</dt>
                <dd className="tournament-detail-meta-item">
                  Hosted by {tournament.owner.username}
                </dd>
              </>
            )}
          </dl>
          {tournament.description && (
            <p className="tournament-detail-description ds-type-body-2">
              {tournament.description}
            </p>
          )}
        </header>

        <section className="tournament-detail-panel">
          {!token ? (
            <div className="tournament-detail-action-row">
              <p className="tournament-detail-action-text ds-type-body-2">
                Login to join this tournament.
              </p>
              <Button variant="primary" onClick={() => navigate("/login")}>
                Login to Join
              </Button>
            </div>
          ) : isOwner ? (
            <div className="tournament-detail-action-row">
              <p className="tournament-detail-owner-text ds-type-subtitle-l">
                You created this tournament.
              </p>
              <div className="tournament-detail-owner-actions">
                <Button variant="secondary" onClick={handleClose}>
                  {tournament.status === "closed"
                    ? "Open Joining"
                    : "Close Joining"}
                </Button>
                <Button variant="cancel" onClick={handleDeleteTournament}>
                  Delete Tournament
                </Button>
              </div>
            </div>
          ) : isParticipant ? (
            <div className="tournament-detail-action-row">
              <p className="tournament-detail-success-text ds-type-subtitle-l">
                ? You are participating in this tournament.
              </p>
              {canJoin && (
                <Button variant="cancel" onClick={handleLeave}>
                  Leave Tournament
                </Button>
              )}
            </div>
          ) : (
            <div className="tournament-detail-action-row">
              <p className="tournament-detail-action-text ds-type-body-2">
                You are not part of this tournament.
              </p>
              {canJoin ? (
                <Button variant="primary" onClick={handleJoin}>
                  Join Tournament
                </Button>
              ) : (
                <span className="tournament-detail-closed-text ds-type-body-2">
                  Tournament is {tournament.status}
                </span>
              )}
            </div>
          )}
        </section>

        {canTrade && (
          <section className="tournament-detail-panel">
            <h2 className="tournament-detail-panel-title ds-type-title-m">
              Buy Stocks
            </h2>
            <div className="tournament-detail-buy-row">
              <div className="tournament-detail-dropdown-wrap">
                <StockSearchDropdown
                  stocks={stocks}
                  selected={selectedStock}
                  onSelect={setSelectedStock}
                />
              </div>
              <Button
                variant="tertiary"
                disabled={!selectedStock}
                onClick={() =>
                  selectedStock &&
                  navigate(`/tournaments/${id}/buy/${selectedStock.symbol}`)
                }
              >
                Buy
              </Button>
            </div>
          </section>
        )}

        {canTrade && (
          <section className="tournament-detail-panel">
            <div className="tournament-detail-portfolio-header">
              <h2 className="tournament-detail-panel-title ds-type-title-m">
                Your Stocks
              </h2>
              <Input
                type="text"
                placeholder="Filter..."
                value={holdingSearch}
                onChange={(e) => setHoldingSearch(e.target.value)}
                inputClassName="tournament-detail-search-input"
              />
            </div>

            <div className="tournament-detail-cash-row">
              <span className="tournament-detail-cash-label ds-type-body-2">
                Cash Balance
              </span>
              <span className="tournament-detail-cash-amount">
                $
                {(myParticipant?.cash_balance ?? 0).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>

            {filteredHoldings.length > 0 ? (
              <div className="tournament-detail-holdings">
                {filteredHoldings.map((h) => {
                  const stockInfo = stocks.find((s) => s.symbol === h.symbol);
                  return (
                    <article
                      key={h.symbol}
                      className="tournament-detail-holding-card"
                    >
                      <div className="tournament-detail-holding-primary">
                        <span className="tournament-detail-holding-symbol">
                          {h.symbol}
                        </span>
                        {stockInfo && (
                          <span className="tournament-detail-holding-name">
                            {stockInfo.name}
                          </span>
                        )}
                      </div>
                      <div className="tournament-detail-holding-detail">
                        <span className="tournament-detail-holding-shares">
                          {h.shares} shares
                        </span>
                        <span className="tournament-detail-holding-invested">
                          $
                          {h.amount_invested.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                          })}{" "}
                          invested
                        </span>
                      </div>
                      <Button
                        variant="cancel"
                        size="small"
                        onClick={() =>
                          navigate(`/tournaments/${id}/sell/${h.symbol}`)
                        }
                      >
                        Sell
                      </Button>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="tournament-detail-empty">
                {holdings.length === 0
                  ? "You don't own any stocks yet. Buy some above!"
                  : "No stocks match your search."}
              </div>
            )}
          </section>
        )}

        <section className="tournament-detail-panel">
          <h2 className="tournament-detail-leaderboard-title ds-type-title-m">
            Participants
            <span className="tournament-detail-count">
              {" "}
              ({participants.length})
            </span>
          </h2>
          {participants.length > 0 ? (
            <ol className="tournament-detail-leaderboard">
              {participants.map((p, index) => (
                <li key={p._id} className="tournament-detail-leaderboard-item">
                  <div className="tournament-detail-participant-info">
                    <span className="tournament-detail-rank">#{index + 1}</span>
                    <span className="tournament-detail-participant-name">
                      {p.user?.username || "Unknown"}
                    </span>
                  </div>
                  <output className="tournament-detail-balance">
                    ${p.cash_balance?.toLocaleString()}
                  </output>
                </li>
              ))}
            </ol>
          ) : (
            <div className="tournament-detail-empty-leaderboard ds-type-body-2">
              <p>No participants yet. Be the first to join!</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default TournamentDetail;
