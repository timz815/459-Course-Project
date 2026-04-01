/**
 * StockDetail Page
 *
 * Displays detailed information for a single stock including
 * price, change metrics, and intraday price history chart.
 *
 * Key behaviours:
 * - Fetches single stock with priceHistory from /api/stocks/:symbol
 * - Shows price, change, changePct with green/red coloring
 * - Renders line chart from priceHistory tuples — green if up, red if down
 * - Shows "Price history unavailable" if no history yet
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

function StockDetail() {
  const { symbol } = useParams();
  const navigate = useNavigate();
  const [stock, setStock] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [marketOpen] = useState(isMarketOpen());

  useEffect(() => {
    async function fetchStock() {
      try {
        const res = await fetch(
          `http://localhost:5000/api/stocks/${symbol.toUpperCase()}`,
        );
        if (!res.ok) throw new Error("Stock not found");
        const data = await res.json();
        setStock(data);
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

  const chartData = (stock.priceHistory || []).map(([timestamp, price]) => ({
    time: new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }),
    price,
  }));

  const hasHistory = chartData.length > 0;

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

  function formatChange(change) {
    if (change === null || change === undefined) return "\u2014";
    return `${change >= 0 ? "+" : ""}${change.toFixed(2)}`;
  }

  function formatChangePct(pct) {
    if (pct === null || pct === undefined) return "\u2014";
    return `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`;
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

  function CustomTooltip({ active, payload, label }) {
    if (!active || !payload || !payload.length) return null;
    return (
      <div className="stock-detail-tooltip">
        <p className="stock-detail-tooltip-time">{label}</p>
        <p
          className={`stock-detail-tooltip-price stock-detail-change${changeModifier}`}
        >
          {formatPrice(payload[0].value)}
        </p>
      </div>
    );
  }

  const priceDate = formatPriceDate(stock.priceUpdatedAt);

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
            {"\u2190"} Back to Stock Market
          </button>
        </nav>

        {/* Market closed disclaimer */}
        {!marketOpen && priceDate && (
          <div style={styles.marketClosedBanner}>
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
            <span style={styles.priceLabel}>today</span>
          </div>
        </section>

        {/* Chart section */}
        <section style={styles.chartSection}>
          <h2 style={styles.chartTitle}>Price History</h2>
          {hasHistory ? (
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
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    domain={["auto", "auto"]}
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
                  <Tooltip content={<CustomTooltip />} />
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
                Price history unavailable {"\u2014"} data populates during
                market hours
              </p>
            </div>
          )}
        </section>

        {/* Stats section */}
        <section className="stock-detail-stats">
          {[
            { label: "Open", value: formatPrice(stock.open) },
            { label: "High", value: formatPrice(stock.high) },
            { label: "Low", value: formatPrice(stock.low) },
            { label: "Volume", value: formatVolume(stock.volume) },
          ].map(({ label, value }) => (
            <div key={label} style={styles.statCard}>
              <span style={styles.statLabel}>{label}</span>
              <span style={styles.statValue}>{value}</span>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}

const googleFonts = `@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap');`;

const BG = "#1A1A1A";
const SURFACE = "#242424";
const CARD_BG = "#2a2a2a";
const BORDER = "#333";
const TEXT = "#F9F9F9";
const MUTED = "#888";
const GREEN = "#00C076";
const RED = "#FF4D4D";
const BLUE = "#0F9FEA";

const styles = {
  page: {
    minHeight: "100vh",
    backgroundColor: BG,
    color: TEXT,
    fontFamily: "'IBM Plex Sans', sans-serif",
  },
  main: {
    maxWidth: "56rem",
    margin: "0 auto",
    padding: "2.5rem 1.5rem 5rem",
  },
  statusMessage: {
    textAlign: "center",
    padding: "5rem",
    color: MUTED,
  },

  // Navigation
  backNav: { marginBottom: "1.5rem" },
  backButton: {
    background: "none",
    border: "none",
    color: BLUE,
    fontWeight: "600",
    fontSize: "0.9rem",
    cursor: "pointer",
    padding: 0,
    fontFamily: "inherit",
  },

  // Header
  stockHeader: { marginBottom: "1.5rem" },
  titleRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "0.5rem",
    flexWrap: "wrap",
    gap: "0.75rem",
  },
  titleLeft: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
  },
  symbol: {
    margin: 0,
    fontSize: "2.5rem",
    fontWeight: "700",
    fontFamily: "'IBM Plex Mono', monospace",
    letterSpacing: "-0.02em",
    color: TEXT,
  },
  exchangeBadge: {
    fontSize: "0.7rem",
    fontWeight: "600",
    color: BLUE,
    backgroundColor: "rgba(15,159,234,0.1)",
    padding: "0.2rem 0.5rem",
    borderRadius: "0.25rem",
    letterSpacing: "0.04em",
  },
  titleRight: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: "0.375rem",
  },
  sectorTag: {
    fontSize: "0.75rem",
    color: MUTED,
    backgroundColor: SURFACE,
    padding: "0.2rem 0.6rem",
    borderRadius: "0.25rem",
    border: `1px solid ${BORDER}`,
  },
  industryTag: {
    fontSize: "0.75rem",
    color: MUTED,
    backgroundColor: SURFACE,
    padding: "0.2rem 0.6rem",
    borderRadius: "0.25rem",
    border: `1px solid ${BORDER}`,
  },
  companyName: {
    margin: 0,
    fontSize: "1rem",
    color: MUTED,
    fontWeight: "400",
  },

  // Price
  priceSection: {
    marginBottom: "2rem",
    paddingBottom: "2rem",
    borderBottom: `1px solid ${BORDER}`,
  },
  currentPrice: {
    display: "block",
    fontSize: "3rem",
    fontWeight: "600",
    fontFamily: "'IBM Plex Mono', monospace",
    letterSpacing: "-0.03em",
    color: TEXT,
    marginBottom: "0.5rem",
  },
  changeRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
  },
  change: {
    fontSize: "1.1rem",
    fontWeight: "600",
    fontFamily: "'IBM Plex Mono', monospace",
  },
  changePct: {
    fontSize: "1.1rem",
    fontWeight: "600",
    fontFamily: "'IBM Plex Mono', monospace",
  },
  priceLabel: {
    fontSize: "0.8rem",
    color: MUTED,
  },

  // Chart
  chartSection: {
    backgroundColor: CARD_BG,
    border: `1px solid ${BORDER}`,
    borderRadius: "0.75rem",
    padding: "1.5rem",
    marginBottom: "1.5rem",
  },
  chartTitle: {
    margin: "0 0 1.25rem 0",
    fontSize: "0.85rem",
    fontWeight: "600",
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  chartWrapper: {
    width: "100%",
  },
  noHistory: {
    textAlign: "center",
    padding: "3rem 1rem",
    color: MUTED,
    fontSize: "0.9rem",
  },
  tooltip: {
    backgroundColor: SURFACE,
    border: `1px solid ${BORDER}`,
    borderRadius: "0.5rem",
    padding: "0.5rem 0.875rem",
  },
  tooltipTime: {
    margin: "0 0 0.2rem",
    fontSize: "0.75rem",
    color: MUTED,
    fontFamily: "'IBM Plex Mono', monospace",
  },
  tooltipPrice: {
    margin: 0,
    fontSize: "0.95rem",
    fontWeight: "600",
    fontFamily: "'IBM Plex Mono', monospace",
  },

  // Stats
  statsSection: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "0.75rem",
  },
  statCard: {
    backgroundColor: CARD_BG,
    border: `1px solid ${BORDER}`,
    borderRadius: "0.5rem",
    padding: "0.875rem 1rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.375rem",
  },
  statLabel: {
    fontSize: "0.7rem",
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    fontWeight: "600",
  },
  statValue: {
    fontSize: "1rem",
    fontWeight: "600",
    fontFamily: "'IBM Plex Mono', monospace",
    color: TEXT,
  },
};

export default StockDetail;
