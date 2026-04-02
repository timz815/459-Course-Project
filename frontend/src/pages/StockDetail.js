/**
 * StockDetail Page
 *
 * Displays detailed information for a single stock including
 * price, change metrics, and price history chart with time range tabs.
 * Layout: 4-col grid — chart spans 3 cols, sidebar (trade action + brief) col 4.
 *
 * Key behaviours:
 * - Fetches single stock with priceHistory and history3M from /api/stocks/:symbol
 * - Tab bar: Today / 1M / 3M inside the chart card
 * - "Today" only shown if priceHistory has an entry timestamped today (ET)
 * - 1M = last 21 entries from history3M + live Finnhub price trailing point if market open
 * - 3M = full history3M array + live Finnhub price trailing point if market open
 * - Today x-axis filters to only show entries from today (ET)
 * - Live pulsing dot on 1M/3M tab labels when market is open
 * - Shows "Market closed" banner when market is closed
 * - Back button navigates to /stock-market
 * - If user holds shares of this stock in any tournament, show "Sell Your Shares" button
 */

import { useContext, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import Header from "../components/Header";
import { AuthContext } from "../context/AuthContext";
import { ReactComponent as LeftIcon } from "../assets/Icon_16x16/Left_16x16.svg";
import { ReactComponent as ArrowRiseIcon } from "../assets/Icon_24x24/Arrow-Rise_24x24.svg";
import { ReactComponent as ArrowFallIcon } from "../assets/Icon_24x24/Arrow-Fall_24x24.svg";
import { isMarketOpen } from "../utils/marketHours";
import TournamentSelectModal from "../components/TournamentSelectModal";
import "../styles/StockDetail.css";

// --- ET Helpers ---

function isEasternDST(utcDate) {
  const year = utcDate.getUTCFullYear();
  const march = new Date(Date.UTC(year, 2, 1));
  const dstStart = new Date(
    Date.UTC(year, 2, ((14 - march.getUTCDay()) % 7) + 8),
  );
  const nov = new Date(Date.UTC(year, 10, 1));
  const dstEnd = new Date(Date.UTC(year, 10, ((7 - nov.getUTCDay()) % 7) + 1));
  return utcDate >= dstStart && utcDate < dstEnd;
}

function toETDateString(utcDate) {
  const offset = isEasternDST(utcDate) ? -4 : -5;
  const et = new Date(utcDate.getTime() + offset * 60 * 60 * 1000);
  const y = et.getUTCFullYear();
  const m = String(et.getUTCMonth() + 1).padStart(2, "0");
  const d = String(et.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getTodayET() {
  return toETDateString(new Date());
}

function hasTodayData(priceHistory) {
  if (!priceHistory || priceHistory.length === 0) return false;
  const todayET = getTodayET();
  return priceHistory.some(([ts]) => toETDateString(new Date(ts)) === todayET);
}

// --- Formatters ---

function formatPrice(price) {
  if (price === null || price === undefined) return "\u2014";
  return (
    "$" +
    (price >= 1000
      ? price.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : price.toFixed(2))
  );
}

function formatPriceRaw(price) {
  if (price === null || price === undefined) return "\u2014";
  return price >= 1000
    ? price.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : price.toFixed(2);
}

function formatChange(change) {
  if (change === null || change === undefined) return "\u2014";
  return `${change >= 0 ? "+" : ""}${change.toFixed(2)}`;
}

function formatChangePct(pct) {
  if (pct === null || pct === undefined) return "\u2014";
  return `(${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%)`;
}

function formatVolume(vol) {
  if (!vol) return "\u2014";
  if (vol >= 1_000_000) return (vol / 1_000_000).toFixed(1) + "M";
  if (vol >= 1_000) return (vol / 1_000).toFixed(0) + "K";
  return vol.toString();
}

function formatPriceDate(priceUpdatedAt) {
  if (!priceUpdatedAt) return null;
  return new Date(priceUpdatedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// --- Chart data builders ---

function buildTodayData(priceHistory) {
  const todayET = getTodayET();
  return priceHistory
    .filter(([ts]) => toETDateString(new Date(ts)) === todayET)
    .map(([ts, price]) => ({
      time: new Date(ts).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }),
      price,
      isLive: false,
    }));
}

function buildHistoricalData(history3M, sliceCount, livePrice, marketOpen) {
  const slice = sliceCount === null ? history3M : history3M.slice(-sliceCount);

  const data = slice.map(([ts, price]) => ({
    time: new Date(ts).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    price,
    isLive: false,
  }));

  if (marketOpen && livePrice) {
    data.push({ time: "Now", price: livePrice, isLive: true });
  }

  return data;
}

// --- Custom Tooltip ---

function CustomTooltip({ active, payload, label, changeModifier }) {
  if (!active || !payload || !payload.length) return null;
  const isLive = payload[0]?.payload?.isLive;
  return (
    <div className="sd-tooltip">
      <p className="sd-tooltip-time">{isLive ? "Live" : label}</p>
      <p className={`sd-tooltip-price sd-change${changeModifier}`}>
        {formatPrice(payload[0].value)}
      </p>
    </div>
  );
}

// --- Component ---

const SLICE_MAP = { "1M": 21, "3M": null };

function StockDetail() {
  const { symbol } = useParams();
  const navigate = useNavigate();
  const { token } = useContext(AuthContext);
  const [stock, setStock] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [marketOpen] = useState(isMarketOpen());
  const [activeTab, setActiveTab] = useState(null);
  const [watchlistAdded, setWatchlistAdded] = useState(false);
  const [tradeModal, setTradeModal] = useState(false);

  useEffect(() => {
    async function fetchStock() {
      try {
        const res = await fetch(
          `http://localhost:5000/api/stocks/${symbol.toUpperCase()}`,
        );
        if (!res.ok) throw new Error("Stock not found");
        const data = await res.json();
        setStock(data);
        setActiveTab(hasTodayData(data.priceHistory) ? "Today" : "1M");
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchStock();
  }, [symbol]);

  useEffect(() => {
    if (!stock?.symbol || !token) return;
    async function checkWatchlist() {
      try {
        const res = await fetch("http://localhost:5000/api/watchlist", {
          headers: { Authorization: token },
        });
        if (!res.ok) return;
        const items = await res.json();
        setWatchlistAdded(
          Array.isArray(items) &&
            items.some((item) => item.symbol === stock.symbol),
        );
      } catch {
        setWatchlistAdded(false);
      }
    }
    checkWatchlist();
  }, [stock, token]);

  async function handleAddToWatchlist() {
    if (!stock?.symbol || !token) return;
    try {
      const res = await fetch("http://localhost:5000/api/watchlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
        body: JSON.stringify({
          symbol: stock.symbol,
          name: stock.name || stock.symbol,
          sector: stock.sector || "Unknown",
          exchange: stock.exchange || "--",
        }),
      });
      if (res.ok) setWatchlistAdded(true);
    } catch {
      // ignore
    }
  }

  if (loading) {
    return (
      <div className="sd-page">
        <Header />
        <main className="sd-main">
          <p className="sd-status">Loading...</p>
        </main>
      </div>
    );
  }

  if (error || !stock) {
    return (
      <div className="sd-page">
        <Header />
        <main className="sd-main">
          <p className="sd-status">{error || "Stock not found."}</p>
        </main>
      </div>
    );
  }

  const isPositive = stock.change > 0;
  const isNegative = stock.change < 0;
  const changeModifier = isPositive
    ? "--positive"
    : isNegative
      ? "--negative"
      : "--neutral";
  const chartColor = isPositive ? "#00C076" : isNegative ? "#FF4D4D" : "#888";

  const showTodayTab = hasTodayData(stock.priceHistory);
  const availableTabs = showTodayTab ? ["Today", "1M", "3M"] : ["1M", "3M"];

  let chartData = [];
  if (activeTab === "Today") {
    chartData = buildTodayData(stock.priceHistory);
  } else if (activeTab && stock.history3M?.length > 0) {
    chartData = buildHistoricalData(
      stock.history3M,
      SLICE_MAP[activeTab],
      stock.price,
      marketOpen,
    );
  }

  const hasChartData = chartData.length > 0;
  const priceDate = formatPriceDate(stock.priceUpdatedAt);

  const prices = chartData.map((d) => d.price).filter(Boolean);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;
  const padding = prices.length
    ? (maxPrice - minPrice) * 0.15 || maxPrice * 0.02
    : 0;
  const yDomain = prices.length
    ? [
        parseFloat((minPrice - padding).toFixed(2)),
        parseFloat((maxPrice + padding).toFixed(2)),
      ]
    : ["auto", "auto"];

  const tickInterval =
    activeTab === "Today" ? "preserveStartEnd" : activeTab === "1M" ? 3 : 9;

  return (
    <div className="sd-page">
      <Header />

      <main className="sd-main">
        {/* Back link */}
        <nav className="sd-breadcrumb">
          <button
            className="sd-back-btn"
            onClick={() => navigate("/stock-market")}
          >
            <LeftIcon className="sd-back-icon" />
            <span>Back to Market</span>
          </button>
        </nav>

        {/* Header: Symbol & Price */}
        <section className="sd-header">
          <div className="sd-header-left">
            <div className="sd-symbol-row">
              <h1 className="sd-symbol">{stock.symbol}</h1>
              <span className="sd-exchange-chip">{stock.exchange}</span>
            </div>
            <div className="sd-company-row">
              <span className="sd-company-name">{stock.name}</span>
              <span className="sd-tag sd-tag--blue">{stock.sector}</span>
              {stock.industry && (
                <span className="sd-tag sd-tag--blue">{stock.industry}</span>
              )}
            </div>
          </div>
          <div className="sd-header-right">
            <span className="sd-price-large">
              {formatPriceRaw(stock.price)}
            </span>
            <div className="sd-change-row">
              {(isPositive || isNegative) &&
                (isPositive ? (
                  <ArrowRiseIcon
                    className={`sd-arrow-icon sd-arrow-icon${changeModifier}`}
                  />
                ) : (
                  <ArrowFallIcon
                    className={`sd-arrow-icon sd-arrow-icon${changeModifier}`}
                  />
                ))}
              <span className={`sd-change-text sd-change${changeModifier}`}>
                {formatChange(stock.change)} {formatChangePct(stock.changePct)}
              </span>
            </div>
          </div>
        </section>

        {/* Market closed banner */}
        {!marketOpen && priceDate && (
          <p className="sd-closed-note">
            Market closed &middot; Last price as of {priceDate}
          </p>
        )}

        {/* Chart Area: 3-col chart + 1-col sidebar */}
        <section className="sd-chart-area">
          {/* Stock Container (chart card) */}
          <div className="sd-chart-card">
            <div className="sd-chart-header">
              <div className="sd-tab-bar">
                {availableTabs.map((tab) => (
                  <button
                    key={tab}
                    className={`sd-tab${activeTab === tab ? " sd-tab--active" : ""}`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab}
                    {tab !== "Today" && marketOpen && (
                      <span className="sd-live-dot" />
                    )}
                  </button>
                ))}
              </div>
              <span className="sd-volume-label">
                VOLUME: {formatVolume(stock.volume)}
              </span>
            </div>

            {hasChartData ? (
              <div className="sd-chart-wrap">
                <ResponsiveContainer width="100%" height={380}>
                  <LineChart
                    data={chartData}
                    margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                  >
                    <XAxis
                      dataKey="time"
                      tick={{
                        fill: "#88929c",
                        fontSize: 10,
                        fontFamily: "var(--font-mono)",
                      }}
                      tickLine={false}
                      axisLine={{ stroke: "rgba(136,146,156,0.15)" }}
                      interval={tickInterval}
                    />
                    <YAxis
                      domain={yDomain}
                      tick={{
                        fill: "rgba(136,146,156,0.4)",
                        fontSize: 9,
                        fontFamily: "var(--font-mono)",
                      }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `$${v.toFixed(0)}`}
                      width={50}
                      orientation="right"
                    />
                    <Tooltip
                      content={
                        <CustomTooltip changeModifier={changeModifier} />
                      }
                    />
                    <Line
                      type="monotone"
                      dataKey="price"
                      stroke={chartColor}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, fill: chartColor, strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="sd-no-data">
                <p>
                  {activeTab === "Today"
                    ? "Intraday data populates during market hours"
                    : "Historical data unavailable \u2014 run seedHistory.js to populate"}
                </p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="sd-sidebar">
            {/* Action Card */}
            <div className="sd-action-card">
              <h3 className="sd-card-heading">Trade Action</h3>
              <div className="sd-action-buttons">
                <button
                  className="sd-btn-buy"
                  onClick={() => setTradeModal(true)}
                >
                  View Tournaments
                </button>
                <button
                  className="sd-btn-watchlist"
                  onClick={handleAddToWatchlist}
                >
                  {watchlistAdded ? "Added to Watchlist" : "Add to Watchlist"}
                </button>
              </div>
            </div>

            {/* Latest Brief */}
            <div className="sd-brief-card">
              <h3 className="sd-card-heading">Latest Brief</h3>
              <div className="sd-brief-items">
                <div className="sd-brief-item">
                  <span className="sd-brief-time">2 HOURS AGO</span>
                  <p className="sd-brief-text">
                    {stock.name} continues to attract institutional interest
                    ahead of quarterly earnings.
                  </p>
                </div>
                <div className="sd-brief-item sd-brief-item--border">
                  <span className="sd-brief-time">5 HOURS AGO</span>
                  <p className="sd-brief-text sd-brief-text--muted">
                    Analysts maintain coverage with an updated price target
                    following sector momentum.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stat Cards Row */}
        <section className="sd-stats">
          {[
            { label: "Open", value: formatPriceRaw(stock.open) },
            { label: "High", value: formatPriceRaw(stock.high) },
            { label: "Low", value: formatPriceRaw(stock.low) },
            { label: "Prev Close", value: formatPriceRaw(stock.previousClose) },
            { label: "Volume", value: formatVolume(stock.volume) },
          ].map(({ label, value }) => (
            <div key={label} className="sd-stat-card">
              <span className="sd-stat-label">{label}</span>
              <span className="sd-stat-value">{value}</span>
            </div>
          ))}
        </section>
      </main>

      {tradeModal && (
        <TournamentSelectModal
          symbol={stock.symbol}
          token={token}
          onSelect={(tournamentId, holdsShares) => {
            setTradeModal(false);
            navigate(
              holdsShares
                ? `/tournaments/${tournamentId}/sell/${stock.symbol}`
                : `/tournaments/${tournamentId}/buy/${stock.symbol}`,
            );
          }}
          onClose={() => setTradeModal(false)}
          onJoinNew={() => {
            setTradeModal(false);
            navigate("/tournaments");
          }}
        />
      )}
    </div>
  );
}

export default StockDetail;
