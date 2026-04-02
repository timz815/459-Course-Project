/**
 * StockDetail Page
 *
 * Displays detailed information for a single stock including
 * price, change metrics, and price history chart with time range tabs.
 *
 * Key behaviours:
 * - Fetches single stock with priceHistory and history3M from /api/stocks/:symbol
 * - Tab bar: Today / 1M / 3M
 *   - "Today" only shown if priceHistory has an entry timestamped today (ET)
 *     stale intraday data is silently ignored — tab simply hidden
 *   - 1M = last 21 entries from history3M + live Finnhub price trailing point if market open
 *   - 3M = full history3M array + live Finnhub price trailing point if market open
 * - Today x-axis filters to only show entries from today (ET) — no stale entries
 * - Live pulsing dot on 1M/3M tab labels when market is open
 * - Shows "Market closed · Last price as of [date]" banner when market is closed
 * - Back button navigates to /stock-market
 */

import { useEffect, useState } from "react";
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
import { isMarketOpen } from "../utils/marketHours";
import "../styles/StockDetail.css";

// ─── ET Helpers ───────────────────────────────────────────────────────────────

function isEasternDST(utcDate) {
  const year = utcDate.getUTCFullYear();
  const march = new Date(Date.UTC(year, 2, 1));
  const dstStart = new Date(
    Date.UTC(year, 2, ((14 - march.getUTCDay()) % 7) + 8),
  );
  const nov = new Date(Date.UTC(year, 10, 1));
  const dstEnd = new Date(
    Date.UTC(year, 10, ((7 - nov.getUTCDay()) % 7) + 1),
  );
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

/**
 * Returns true if priceHistory has at least one entry from today (ET).
 * Stale entries from previous days are silently ignored.
 */
function hasTodayData(priceHistory) {
  if (!priceHistory || priceHistory.length === 0) return false;
  const todayET = getTodayET();
  return priceHistory.some(([ts]) => toETDateString(new Date(ts)) === todayET);
}

// ─── Formatters ───────────────────────────────────────────────────────────────

function formatPrice(price) {
  if (price === null || price === undefined) return "—";
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

function formatChange(change) {
  if (change === null || change === undefined) return "—";
  return `${change >= 0 ? "+" : ""}${change.toFixed(2)}`;
}

function formatChangePct(pct) {
  if (pct === null || pct === undefined) return "—";
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`;
}

function formatVolume(vol) {
  if (!vol) return "—";
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

// ─── Chart data builders ──────────────────────────────────────────────────────

/**
 * Builds Today chart data — filters to only entries from today (ET).
 * No stale data from previous days is shown.
 */
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

/**
 * Builds 1M / 3M chart data from history3M daily candles.
 * Appends live Finnhub price as trailing "Now" point when market is open.
 */
function buildHistoricalData(history3M, sliceCount, livePrice, marketOpen) {
  const slice =
    sliceCount === null ? history3M : history3M.slice(-sliceCount);

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

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label, changeModifier }) {
  if (!active || !payload || !payload.length) return null;
  const isLive = payload[0]?.payload?.isLive;
  return (
    <div className="stock-detail-tooltip">
      <p className="stock-detail-tooltip-time">{isLive ? "Live" : label}</p>
      <p
        className={`stock-detail-tooltip-price stock-detail-change${changeModifier}`}
      >
        {formatPrice(payload[0].value)}
      </p>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

const SLICE_MAP = { "1M": 21, "3M": null };

function StockDetail() {
  const { symbol } = useParams();
  const navigate = useNavigate();
  const [stock, setStock] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [marketOpen] = useState(isMarketOpen());
  const [activeTab, setActiveTab] = useState(null);

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

  if (loading) {
    return (
      <div className="stock-detail-page">
        <Header />
        <main className="stock-detail-main">
          <p className="stock-detail-status">Loading...</p>
        </main>
      </div>
    );
  }

  if (error || !stock) {
    return (
      <div className="stock-detail-page">
        <Header />
        <main className="stock-detail-main">
          <p className="stock-detail-status">{error || "Stock not found."}</p>
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

  // Build chart data for the active tab
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

  // Y-axis domain with padding so the line doesn't hug the edges
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
    <div className="stock-detail-page">
      <Header />

      <main className="stock-detail-main">
        {/* Back navigation */}
        <nav className="stock-detail-back-nav">
          <button
            className="stock-detail-back-btn"
            onClick={() => navigate("/stock-market")}
          >
            ← Back to Stock Market
          </button>
        </nav>

        {/* Market closed banner */}
        {!marketOpen && priceDate && (
          <div className="stock-detail-market-closed-banner">
            Market closed · Last price as of {priceDate}
          </div>
        )}

        {/* Stock header */}
        <header className="stock-detail-header">
          <div className="stock-detail-title-row">
            <div className="stock-detail-title-left">
              <h1 className="stock-detail-symbol">{stock.symbol}</h1>
              <span className="stock-detail-exchange-badge">
                {stock.exchange}
              </span>
            </div>
            <div className="stock-detail-title-right">
              <span className="stock-detail-sector-tag">{stock.sector}</span>
              <span className="stock-detail-industry-tag">
                {stock.industry}
              </span>
            </div>
          </div>
          <p className="stock-detail-company">{stock.name}</p>
        </header>

        {/* Price section */}
        <section className="stock-detail-price-section">
          <span className="stock-detail-current-price">
            {formatPrice(stock.price)}
          </span>
          <div className="stock-detail-change-row">
            <span
              className={`stock-detail-change stock-detail-change${changeModifier}`}
            >
              {formatChange(stock.change)}
            </span>
            <span
              className={`stock-detail-change-pct stock-detail-change${changeModifier}`}
            >
              {formatChangePct(stock.changePct)}
            </span>
            <span className="stock-detail-price-label">vs prev close</span>
          </div>
        </section>

        {/* Chart section */}
        <section className="stock-detail-chart-section">
          {/* Tab bar */}
          <div className="stock-detail-tab-bar">
            {availableTabs.map((tab) => (
              <button
                key={tab}
                className={`stock-detail-tab${activeTab === tab ? " stock-detail-tab--active" : ""}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
                {tab !== "Today" && marketOpen && (
                  <span className="stock-detail-live-dot" />
                )}
              </button>
            ))}
          </div>

          {hasChartData ? (
            <div className="stock-detail-chart-wrap">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart
                  data={chartData}
                  margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                >
                  <XAxis
                    dataKey="time"
                    tick={{
                      fill: "#888",
                      fontSize: 11,
                      fontFamily: "var(--font-mono)",
                    }}
                    tickLine={false}
                    axisLine={{ stroke: "#333" }}
                    interval={tickInterval}
                  />
                  <YAxis
                    domain={yDomain}
                    tick={{
                      fill: "#888",
                      fontSize: 11,
                      fontFamily: "var(--font-mono)",
                    }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `$${v.toFixed(0)}`}
                    width={55}
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
            <div className="stock-detail-no-history">
              <p>
                {activeTab === "Today"
                  ? "Intraday data populates during market hours"
                  : "Historical data unavailable — run seedHistory.js to populate"}
              </p>
            </div>
          )}
        </section>

        {/* Stats section — now 5 cards including Prev Close */}
        <section className="stock-detail-stats stock-detail-stats--five">
          {[
            { label: "Open",       value: formatPrice(stock.open),          note: "Today"    },
            { label: "High",       value: formatPrice(stock.high),          note: "Today"    },
            { label: "Low",        value: formatPrice(stock.low),           note: "Today"    },
            { label: "Prev Close", value: formatPrice(stock.previousClose), note: null       },
            { label: "Volume",     value: formatVolume(stock.volume),       note: "Prev day" },
          ].map(({ label, value, note }) => (
            <div key={label} className="stock-detail-stat-card">
              <div className="stock-detail-stat-label-row">
                <span className="stock-detail-stat-label">{label}</span>
                {note && (
                  <span className="stock-detail-stat-note">{note}</span>
                )}
              </div>
              <span className="stock-detail-stat-value">{value}</span>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}

export default StockDetail;
