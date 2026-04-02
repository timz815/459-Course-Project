import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import Button from "./UI/Button";
import { ReactComponent as RightIcon16 } from "../assets/Icon_16x16/Right_16x16.svg";
import { ReactComponent as TrophyIcon24 } from "../assets/Icon_24x24/Trophy_24x24.svg";
import { ReactComponent as RiseDiagramIcon24 } from "../assets/Icon_24x24/Rise-Diagram_24x24.svg";
import plusIcon16 from "../assets/Icon_16x16/Plus_16x16.svg";
import sortIcon16 from "../assets/Icon_16x16/Sort_16x16.svg";
import magnifyIcon16 from "../assets/Icon_16x16/Magnify_16x16.svg";
import deleteIcon16 from "../assets/Icon_16x16/Delete_16x16.svg";
import "../styles/UserHomeContent.css";

/* Color palette for competition card icons (cycles) */
const CARD_THEMES = [
  { bg: "blue", icon: TrophyIcon24, barColor: "blue" },
  { bg: "green", icon: RiseDiagramIcon24, barColor: "green" },
];

function UserHomeContent() {
  const navigate = useNavigate();
  const { token } = useContext(AuthContext);

  const [competitions, setCompetitions] = useState([]);
  const [watchlistPrices, setWatchlistPrices] = useState({});
  const [watchlist, setWatchlist] = useState([]);

  useEffect(() => {
    if (!token) return;
    async function fetchWatchlist() {
      try {
        const res = await fetch("http://localhost:5000/api/watchlist", {
          headers: { Authorization: token },
        });
        if (!res.ok) return;
        const items = await res.json();
        if (Array.isArray(items)) setWatchlist(items);
      } catch {
        // ignore
      }
    }
    fetchWatchlist();
  }, [token]);

  /* ─── Fetch user's active competitions ─────────────────────────────────── */
  useEffect(() => {
    if (!token) return;

    async function fetchCompetitions() {
      try {
        // Get all tournaments
        const tournamentsRes = await fetch(
          "http://localhost:5000/api/tournaments",
        );
        const allTournaments = await tournamentsRes.json();
        if (!Array.isArray(allTournaments)) return;

        const activeTournaments = allTournaments.filter(
          (t) => t.status === "active" || t.status === "open",
        );

        // Fetch "my tournaments" to identify which ones user owns
        const myRes = await fetch(
          "http://localhost:5000/api/tournaments/my-tournaments",
          { headers: { Authorization: token } },
        );
        const myTournaments = await myRes.json();
        const myIds = new Set(
          Array.isArray(myTournaments) ? myTournaments.map((t) => t._id) : [],
        );

        // Also check participations via the participants endpoint
        // by fetching each tournament's participants with auth
        const result = [];

        for (const tournament of activeTournaments) {
          try {
            const pRes = await fetch(
              `http://localhost:5000/api/tournaments/${tournament._id}/participants`,
            );
            const participants = await pRes.json();
            if (!Array.isArray(participants)) continue;

            // Decode our userId from the token to match
            let userId = null;
            try {
              const payload = JSON.parse(atob(token.split(".")[1]));
              userId = payload.id || payload.userId || payload._id;
            } catch {
              // can't decode
            }

            const myEntry = participants.find((p) => {
              const pUserId = typeof p.user === "object" ? p.user._id : p.user;
              return pUserId === userId;
            });

            if (myEntry || myIds.has(tournament._id)) {
              // Calculate rank
              const sorted = [...participants].sort(
                (a, b) => b.cash_balance - a.cash_balance,
              );
              const rank = myEntry
                ? sorted.findIndex(
                    (p) =>
                      (typeof p.user === "object" ? p.user._id : p.user) ===
                      userId,
                  ) + 1
                : null;

              result.push({
                tournament,
                myEntry,
                rank,
                totalParticipants: participants.length,
              });
            }
          } catch {
            // skip
          }
        }

        setCompetitions(result);
      } catch (err) {
        console.error("Error fetching competitions:", err);
      }
    }

    fetchCompetitions();
  }, [token]);

  /* ─── Fetch live prices for watchlist symbols ──────────────────────────── */
  useEffect(() => {
    async function fetchPrices() {
      try {
        const res = await fetch("http://localhost:5000/api/stocks");
        const stocks = await res.json();
        if (!Array.isArray(stocks)) return;

        const priceMap = {};
        for (const s of stocks) {
          priceMap[s.symbol] = {
            price: s.price,
            changePct: s.changePct,
          };
        }
        setWatchlistPrices(priceMap);
      } catch (err) {
        console.error("Error fetching stock prices:", err);
      }
    }

    fetchPrices();
  }, []);

  /* ─── Helpers ──────────────────────────────────────────────────────────── */

  function timeRemaining(endDate) {
    if (!endDate) return "TBD";
    const now = new Date();
    const end = new Date(endDate);
    const diff = end - now;
    if (diff <= 0) return "Ended";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);

    if (days > 0)
      return `Ends in ${days} day${days > 1 ? "s" : ""}, ${hours} hour${hours !== 1 ? "s" : ""}`;
    if (hours > 0) return `Ends in ${hours} hour${hours !== 1 ? "s" : ""}`;
    const mins = Math.floor((diff / (1000 * 60)) % 60);
    return `Ends in ${mins} min`;
  }

  function formatCurrency(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "$0.00";
    return n.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    });
  }

  function formatPrice(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "$0.00";
    return (
      "$" +
      n.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }

  function formatChange(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "0.00%";
    const sign = n >= 0 ? "+" : "";
    return `${sign}${n.toFixed(2)}%`;
  }

  async function removeFromWatchlist(symbol) {
    setWatchlist((prev) => prev.filter((w) => w.symbol !== symbol));
    try {
      await fetch(`http://localhost:5000/api/watchlist/${symbol}`, {
        method: "DELETE",
        headers: { Authorization: token },
      });
    } catch {
      // ignore
    }
  }

  return (
    <main className="user-home">
      <div className="user-home-inner">
        {/* ─── Hero ──────────────────────────────────────────────────────── */}
        <section className="uh-hero" data-node-id="26:264">
          <div className="uh-hero-gradient" aria-hidden="true" />

          <div className="uh-hero-content">
            <div className="uh-chip">
              <span className="uh-chip-dot" />
              <span className="uh-chip-text">Live Market Quotes Enabled</span>
            </div>

            <h1 className="uh-hero-title">
              Master the <span>Market</span>
              <br />
              Without the Risk.
            </h1>

            <p className="uh-hero-subtitle">
              Compete in zero-risk paper-trading arenas. Sharpen your strategy,
              climb the leaderboard, and track performance in active
              tournaments.
            </p>

            <div className="uh-hero-actions">
              <Button
                variant="primary"
                onClick={() => navigate("/tournaments")}
              >
                Enter Arena
              </Button>
              <Button variant="tertiary" onClick={() => navigate("/dashboard")}>
                View Dashboard
              </Button>
            </div>
          </div>
        </section>

        {/* ─── Your Active Competitions ──────────────────────────────────── */}
        <section data-node-id="26:280">
          <div className="uh-section-head">
            <div>
              <p className="uh-section-eyebrow">Portfolio Management</p>
              <h2 className="uh-section-title">Your Active Competitions</h2>
            </div>
            <button
              type="button"
              className="uh-view-all"
              onClick={() => navigate("/dashboard")}
            >
              View all
              <RightIcon16 className="uh-view-all-icon" />
            </button>
          </div>

          <div className="uh-comp-grid" style={{ marginTop: "1.5rem" }}>
            {competitions.map((comp, i) => {
              const theme = CARD_THEMES[i % CARD_THEMES.length];
              const CompIcon = theme.icon;
              const cash = comp.myEntry?.cash_balance ?? 0;
              const starting = comp.tournament.starting_balance ?? 0;
              const pct = starting > 0 ? (cash / starting) * 100 : 0;

              return (
                <article
                  key={comp.tournament._id}
                  className="uh-comp-card"
                  data-node-id="26:292"
                >
                  <div className="uh-comp-top">
                    <div className={`uh-comp-icon ${theme.bg}`}>
                      <CompIcon className="uh-comp-icon-svg" />
                    </div>
                    {comp.rank != null && (
                      <div className="uh-comp-rank">
                        <p className="uh-comp-rank-label">Rank</p>
                        <div className="uh-comp-rank-value">
                          <span
                            className={`uh-comp-rank-num ${comp.rank <= Math.ceil(comp.totalParticipants * 0.25) ? "good" : "bad"}`}
                          >
                            #{comp.rank}
                          </span>
                          <span className="uh-comp-rank-total">
                            /
                            {comp.totalParticipants > 999
                              ? `${(comp.totalParticipants / 1000).toFixed(1)}k`
                              : comp.totalParticipants}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="uh-comp-info">
                    <h3 className="uh-comp-name">{comp.tournament.name}</h3>
                    <p className="uh-comp-ends">
                      {timeRemaining(comp.tournament.end_date)}
                    </p>
                  </div>

                  <div className="uh-comp-stats">
                    <div className="uh-comp-buying-row">
                      <span className="uh-comp-buying-label">Buying Power</span>
                      <span className="uh-comp-buying-value">
                        {formatCurrency(cash)}
                      </span>
                    </div>
                    <div className="uh-comp-progress">
                      <div
                        className={`uh-comp-progress-bar ${theme.barColor}`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    className="uh-comp-resume"
                    onClick={() =>
                      navigate(`/tournaments/${comp.tournament._id}`)
                    }
                  >
                    Resume Trading
                  </button>
                </article>
              );
            })}

            {/* Join New Tournament card - always shown */}
            <article
              className="uh-comp-new"
              data-node-id="26:342"
              onClick={() => navigate("/tournaments")}
            >
              <div className="uh-comp-new-plus">
                <img src={plusIcon16} alt="" />
              </div>
              <h4 className="uh-comp-new-title">Join New Tournament</h4>
              <p className="uh-comp-new-sub">Discover upcoming arenas</p>
            </article>
          </div>
        </section>

        {/* ─── Watchlist ─────────────────────────────────────────────────── */}
        <section data-node-id="26:352">
          <div className="uh-section-head">
            <div>
              <p className="uh-section-eyebrow">Market Pulse</p>
              <h2 className="uh-section-title primary">Watchlist</h2>
            </div>
            <div className="uh-wl-actions">
              <button type="button" className="uh-wl-icon-btn">
                <img src={sortIcon16} alt="Sort" />
              </button>
              <button type="button" className="uh-wl-icon-btn">
                <img src={magnifyIcon16} alt="Search" />
              </button>
            </div>
          </div>

          <div className="uh-wl-table" style={{ marginTop: "1.5rem" }}>
            <div className="uh-wl-header">
              <span>Asset</span>
              <span>Sector / Exchange</span>
              <span>Price</span>
              <span>Change</span>
              <span />
            </div>

            {watchlist.map((stock) => {
              const priceData = watchlistPrices[stock.symbol];
              const changePct = priceData?.changePct ?? 0;
              const isPositive = changePct >= 0;

              return (
                <div key={stock.symbol} className="uh-wl-row">
                  <div className="uh-wl-asset">
                    <div className="uh-wl-avatar">{stock.symbol.charAt(0)}</div>
                    <div className="uh-wl-asset-info">
                      <span
                        className="uh-wl-symbol"
                        role="button"
                        tabIndex={0}
                        onClick={() =>
                          navigate(`/stock-market/${stock.symbol}`)
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter")
                            navigate(`/stock-market/${stock.symbol}`);
                        }}
                      >
                        {stock.symbol}
                      </span>
                      <span className="uh-wl-name">{stock.name}</span>
                    </div>
                  </div>

                  <div className="uh-wl-tags">
                    <span className="uh-wl-tag">{stock.sector}</span>
                    <span className="uh-wl-tag">{stock.exchange}</span>
                  </div>

                  <span className="uh-wl-price">
                    {priceData ? formatPrice(priceData.price) : "—"}
                  </span>

                  <span
                    className={`uh-wl-change ${isPositive ? "positive" : "negative"}`}
                  >
                    {priceData ? formatChange(changePct) : "—"}
                  </span>

                  <div className="uh-wl-delete">
                    <button
                      type="button"
                      className="uh-wl-delete-btn"
                      aria-label={`Remove ${stock.symbol} from watchlist`}
                      onClick={() => removeFromWatchlist(stock.symbol)}
                    >
                      <img src={deleteIcon16} alt="" />
                    </button>
                  </div>
                </div>
              );
            })}

            {watchlist.length === 0 && (
              <div className="uh-empty">
                <p>
                  Your watchlist is empty. Add stocks from the Stock Market
                  page.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

export default UserHomeContent;
