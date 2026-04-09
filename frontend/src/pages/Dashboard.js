/**
 * Dashboard Component
 *
 * Full user dashboard matching the Figma node 27-700 design.
 *
 * Sections:
 * - Hero greeting with username + subtitle + action buttons
 * - Stats overview: Net Liquidity (with mini bar chart), Win Rate, Global Rank
 * - My Tournaments: horizontal scrolling cards with status chips + stats footer
 * - Market Insights bento: Top Movers list + Recent Activity timeline
 */

import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import Header from "../components/Header";
import Button from "../components/UI/Button";
import { ReactComponent as AddIcon } from "../assets/Icon_16x16/Add_16x16.svg";
import { ReactComponent as RightIcon } from "../assets/Icon_16x16/Right_16x16.svg";
import { ReactComponent as OutlierDiagramIcon } from "../assets/Icon_16x16/Outlier-Diagram_16x16.svg";
import { ReactComponent as AlertIcon } from "../assets/Icon_16x16/Alert_16x16.svg";
import { ReactComponent as KebabIcon } from "../assets/Icon_16x16/Kebab-Menu_16x16.svg";
import sortIcon16 from "../assets/Icon_16x16/Sort_16x16.svg";
import magnifyIcon16 from "../assets/Icon_16x16/Magnify_16x16.svg";
import deleteIcon16 from "../assets/Icon_16x16/Delete_16x16.svg";
import "../styles/Dashboard.css";

/* ─── Helpers ──────────────────────────────────────────────────────────────── */

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function ordinal(n) {
  if (!n) return "—";
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function formatCurrency(n) {
  if (n == null) return "—";
  return Number(n).toLocaleString("en-US", {
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

/* ─── Component ────────────────────────────────────────────────────────────── */

function Dashboard() {
  const { token, user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [competitions, setCompetitions] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [watchlistPrices, setWatchlistPrices] = useState({});

  /* ─── Decode userId from JWT ───────────────────────────────────────────── */
  function getUserId() {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.id || payload.userId || payload._id;
    } catch {
      return null;
    }
  }

  /* ─── Fetch user's tournament participations ───────────────────────────── */
  useEffect(() => {
    if (!token) return;

    async function fetchCompetitions() {
      try {
        const userId = getUserId();
        if (!userId) return;

        // Fetch all tournaments
        const allRes = await fetch("http://localhost:5001/api/tournaments");
        const allTournaments = await allRes.json();
        if (!Array.isArray(allTournaments)) return;

        const relevantTournaments = allTournaments.filter(
          (t) => t.status === "active" || t.status === "open",
        );

        const result = [];

        for (const tournament of relevantTournaments) {
          try {
            const pRes = await fetch(
              `http://localhost:5001/api/tournaments/${tournament._id}/participants`,
            );
            const participants = await pRes.json();
            if (!Array.isArray(participants)) continue;

            const myEntry = participants.find((p) => {
              const pUserId = typeof p.user === "object" ? p.user._id : p.user;
              return pUserId === userId;
            });

            if (!myEntry) continue;

            // Calculate rank by cash_balance
            const sorted = [...participants].sort(
              (a, b) => b.cash_balance - a.cash_balance,
            );
            const rank =
              sorted.findIndex((p) => {
                const pId = typeof p.user === "object" ? p.user._id : p.user;
                return pId === userId;
              }) + 1;

            result.push({
              tournament,
              myEntry,
              rank,
              totalParticipants: participants.length,
            });
          } catch {
            /* skip */
          }
        }

        setCompetitions(result);
      } catch (err) {
        console.error("Error fetching competitions:", err);
      }
    }

    fetchCompetitions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  /* ─── Fetch user's watchlist ──────────────────────────────────────────── */
  useEffect(() => {
    if (!token) return;
    async function fetchWatchlist() {
      try {
        const res = await fetch("http://localhost:5001/api/watchlist", {
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

  /* ─── Fetch stocks for Top Movers ──────────────────────────────────────── */
  useEffect(() => {
    async function fetchStocks() {
      try {
        const res = await fetch("http://localhost:5001/api/stocks");
        const data = await res.json();
        if (Array.isArray(data)) setStocks(data);
      } catch (err) {
        console.error("Error fetching stocks:", err);
      }
    }
    fetchStocks();
  }, []);

  /* ─── Fetch live prices for watchlist symbols ──────────────────────────── */
  useEffect(() => {
    async function fetchWatchlistPrices() {
      try {
        const res = await fetch("http://localhost:5001/api/stocks");
        const data = await res.json();
        if (!Array.isArray(data)) return;
        const priceMap = {};
        for (const s of data) {
          priceMap[s.symbol] = { price: s.price, changePct: s.changePct };
        }
        setWatchlistPrices(priceMap);
      } catch (err) {
        console.error("Error fetching watchlist prices:", err);
      }
    }
    fetchWatchlistPrices();
  }, []);

  /* ─── Derive net liquidity from all participations ─────────────────────── */
  const netLiquidity = competitions.reduce((sum, c) => {
    if (!c.myEntry) return sum;
    const holdingsValue = (c.myEntry.holdings || []).reduce((hSum, h) => {
      const stock = stocks.find((s) => s.symbol === h.symbol);
      const price = stock?.price ?? 0;
      return hSum + h.shares * price;
    }, 0);
    return sum + c.myEntry.cash_balance + holdingsValue;
  }, 0);

  /* ─── Top movers: sort by absolute daily change % ──────────────────────── */
  const topMovers = [...stocks]
    .filter((s) => s.changePct != null)
    .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))
    .slice(0, 4);

  /* ─── Mini bar chart heights (last 6 periods, normalized) ──────────────── */
  const barHeights = (() => {
    // Gather cash balances across competitions as proxy data for chart
    const vals = competitions
      .slice(0, 6)
      .map((c) => c.myEntry?.cash_balance ?? 0);
    while (vals.length < 6) vals.push(0);
    const max = Math.max(...vals, 1);
    return vals.map((v) => Math.max((v / max) * 100, 5));
  })();

  return (
    <div className="dashboard-page">
      <Header />

      <main className="dashboard-main">
        {/* ─── Hero Greeting ──────────────────────────────────────────────── */}
        <section className="dash-hero">
          <h1 className="dash-hero-title">
            Welcome back,{" "}
            <span className="dash-hero-username">
              {user?.username ?? "Trader"}
            </span>
          </h1>
          <p className="dash-hero-subtitle">
            {competitions.length > 0
              ? `You're competing in ${competitions.length} active tournament${competitions.length > 1 ? "s" : ""}. Check your positions below.`
              : "You're not in any active tournaments yet. Create or join one to start trading."}
          </p>
          <div className="dash-hero-actions">
            <Button
              variant="primary"
              headIcon={<AddIcon />}
              onClick={() => navigate("/add-tournament")}
            >
              Create Tournament
            </Button>
            <Button variant="tertiary" onClick={() => navigate("/tournaments")}>
              Check All Tournaments
            </Button>
          </div>
        </section>

        {/* ─── Stats Overview (Asymmetric Grid) ──────────────────────────── */}
        <section className="dash-stats">
          {/* Net Liquidity — spans 8 cols */}
          <div className="dash-stats-liquidity">
            <div className="dash-stats-liquidity-glow" aria-hidden="true" />
            <div className="dash-stats-liquidity-inner">
              <div className="dash-stats-liquidity-header">
                <div className="dash-stats-liquidity-text">
                  <span className="dash-label">Net Liquidity</span>
                  <span className="dash-currency-l">
                    {formatCurrency(netLiquidity)}
                  </span>
                </div>
                {competitions.length > 0 && (
                  <span className="dash-chip dash-chip--green">
                    Active {competitions.length}
                  </span>
                )}
              </div>
              <div className="dash-bar-chart">
                {barHeights.map((h, i) => (
                  <div
                    key={i}
                    className={`dash-bar ${i === barHeights.length - 1 ? "dash-bar--active" : ""}`}
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Win Rate + Global Rank — spans 4 cols */}
          <div className="dash-stats-side">
            <div className="dash-stats-block">
              <span className="dash-label">Win Rate</span>
              <div className="dash-stats-value-row">
                <span className="dash-stats-value">—</span>
                <span className="dash-stats-hint dash-stats-hint--muted">
                  No data yet
                </span>
              </div>
            </div>
            <div className="dash-stats-divider" />
            <div className="dash-stats-block">
              <span className="dash-label">Global Rank</span>
              <div className="dash-stats-value-row">
                <span className="dash-stats-value">—</span>
                <span className="dash-stats-hint dash-stats-hint--muted">
                  Unranked
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ─── My Tournaments ────────────────────────────────────────────── */}
        <section className="dash-tournaments">
          <div className="dash-tournaments-header">
            <div className="dash-tournaments-heading">
              <h2 className="dash-tournaments-title">My Tournaments</h2>
              <p className="dash-tournaments-subtitle">
                Manage your active stakes and pending invites.
              </p>
            </div>
            <button
              className="dash-link"
              onClick={() => navigate("/tournaments")}
            >
              View History
              <RightIcon className="dash-link-icon" />
            </button>
          </div>

          <div className="dash-tournaments-scroll">
            {competitions.length > 0 ? (
              competitions.map(
                ({ tournament: t, myEntry, rank, totalParticipants }) => {
                  const isActive = t.status === "active";
                  return (
                    <article
                      key={t._id}
                      className={`dash-tcard ${isActive ? "dash-tcard--active" : "dash-tcard--open"}`}
                      onClick={() => navigate(`/tournaments/${t._id}`)}
                    >
                      <div className="dash-tcard-top">
                        <span
                          className={`dash-chip ${isActive ? "dash-chip--green" : "dash-chip--blue"}`}
                        >
                          {isActive ? "Active" : "Open"}
                        </span>
                        <KebabIcon className="dash-tcard-kebab" />
                      </div>

                      <div className="dash-tcard-info">
                        <h3 className="dash-tcard-name">{t.name}</h3>
                        <span className="dash-tcard-date">
                          {isActive ? "Ends" : "Starts"}{" "}
                          {formatDate(isActive ? t.end_date : t.start_date)}
                        </span>
                      </div>

                      <div className="dash-tcard-footer">
                        <div className="dash-tcard-stat">
                          <span className="dash-tcard-stat-label">
                            {isActive ? "Balance" : "Buy-In"}
                          </span>
                          <span className="dash-tcard-stat-value">
                            {isActive
                              ? formatCurrency(myEntry?.cash_balance)
                              : formatCurrency(t.starting_balance)}
                          </span>
                        </div>
                        <div className="dash-tcard-stat dash-tcard-stat--right">
                          <span className="dash-tcard-stat-label">
                            {isActive ? "Position" : "Entries"}
                          </span>
                          <span
                            className={`dash-tcard-stat-accent ${
                              isActive
                                ? rank <= 3
                                  ? "dash-color-success"
                                  : rank > totalParticipants * 0.5
                                    ? "dash-color-danger"
                                    : "dash-color-success"
                                : "dash-color-primary"
                            }`}
                          >
                            {isActive
                              ? ordinal(rank)
                              : `${totalParticipants}/${t.max_participants ?? "∞"}`}
                          </span>
                        </div>
                      </div>
                    </article>
                  );
                },
              )
            ) : (
              <div className="dash-tournaments-empty">
                <p>No active tournaments.</p>
                <p>Create or join a tournament to get started.</p>
              </div>
            )}
          </div>
        </section>

        {/* ─── Watchlist ─────────────────────────────────────────────────── */}
        <section className="dash-watchlist">
          <div className="dash-watchlist-head">
            <div>
              <p className="dash-watchlist-eyebrow">Market Pulse</p>
              <h2 className="dash-watchlist-title">Watchlist</h2>
            </div>
            <div className="dash-watchlist-actions">
              <button type="button" className="dash-watchlist-icon-btn">
                <img src={sortIcon16} alt="Sort" />
              </button>
              <button type="button" className="dash-watchlist-icon-btn">
                <img src={magnifyIcon16} alt="Search" />
              </button>
            </div>
          </div>

          <div className="dash-wl-table">
            <div className="dash-wl-header">
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
                <div key={stock.symbol} className="dash-wl-row">
                  <div className="dash-wl-asset">
                    <div className="dash-wl-avatar">
                      {stock.symbol.charAt(0)}
                    </div>
                    <div className="dash-wl-asset-info">
                      <span
                        className="dash-wl-symbol"
                        role="button"
                        tabIndex={0}
                        onClick={() => navigate(`/stocks/${stock.symbol}`)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter")
                            navigate(`/stocks/${stock.symbol}`);
                        }}
                      >
                        {stock.symbol}
                      </span>
                      <span className="dash-wl-name">{stock.name}</span>
                    </div>
                  </div>

                  <div className="dash-wl-tags">
                    <span className="dash-wl-tag">{stock.sector}</span>
                    <span className="dash-wl-tag">{stock.exchange}</span>
                  </div>

                  <span className="dash-wl-price">
                    {priceData ? formatPrice(priceData.price) : "—"}
                  </span>

                  <span
                    className={`dash-wl-change ${isPositive ? "positive" : "negative"}`}
                  >
                    {priceData ? formatChange(changePct) : "—"}
                  </span>

                  <div className="dash-wl-delete">
                    <button
                      type="button"
                      className="dash-wl-delete-btn"
                      aria-label={`Remove ${stock.symbol} from watchlist`}
                      onClick={() => {
                        setWatchlist((prev) =>
                          prev.filter((w) => w.symbol !== stock.symbol),
                        );
                        fetch(
                          `http://localhost:5001/api/watchlist/${stock.symbol}`,
                          {
                            method: "DELETE",
                            headers: { Authorization: token },
                          },
                        ).catch(() => {});
                      }}
                    >
                      <img src={deleteIcon16} alt="" />
                    </button>
                  </div>
                </div>
              );
            })}

            {watchlist.length === 0 && (
              <div className="dash-wl-empty">
                <p>
                  Your watchlist is empty. Add stocks from the Stock Market
                  page.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* ─── Market Insights (Bento Grid) ──────────────────────────────── */}
        <section className="dash-insights">
          {/* Top Movers */}
          <div className="dash-insights-movers">
            <div className="dash-insights-heading">
              <OutlierDiagramIcon className="dash-insights-icon" />
              <h3 className="dash-insights-title">Top Movers</h3>
            </div>
            <div className="dash-movers-list">
              {topMovers.length > 0 ? (
                topMovers.map((s) => (
                  <div
                    key={s.symbol}
                    className="dash-movers-item"
                    onClick={() => navigate(`/stocks/${s.symbol}`)}
                  >
                    <div className="dash-movers-left">
                      <span className="dash-movers-symbol">{s.symbol}</span>
                      <span className="dash-movers-name">{s.name}</span>
                    </div>
                    <span
                      className={`dash-movers-change ${
                        s.changePct >= 0
                          ? "dash-color-success"
                          : "dash-color-danger"
                      }`}
                    >
                      {s.changePct >= 0 ? "+" : ""}
                      {s.changePct?.toFixed(1)}%
                    </span>
                  </div>
                ))
              ) : (
                <p className="dash-empty-hint">No stock data available</p>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="dash-insights-activity">
            <div className="dash-insights-heading">
              <AlertIcon className="dash-insights-icon" />
              <h3 className="dash-insights-title">Recent Activity</h3>
            </div>
            <div className="dash-activity-list">
              {competitions.length > 0 ? (
                <div className="dash-activity-item">
                  <div className="dash-activity-dot dash-activity-dot--primary" />
                  <div className="dash-activity-text">
                    <p className="dash-activity-message">
                      You joined{" "}
                      <strong>{competitions[0].tournament.name}</strong>
                    </p>
                    <span className="dash-activity-time">Recently</span>
                  </div>
                </div>
              ) : (
                <p className="dash-empty-hint">No recent activity</p>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Dashboard;
