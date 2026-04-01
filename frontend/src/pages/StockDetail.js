/**
 * StockDetail Page
 *
 * Displays detailed information for a single stock including
 * price, change metrics, and intraday price history chart.
 *
 * Key behaviours:
 * - Fetches single stock with priceHistory from /api/stocks/:symbol
 * - Shows price, change, changePct with green/red coloring
 * - Renders line chart from priceHistory tuples
 * - Shows "Price history unavailable" if no history yet
 * - Back button navigates to /stock-market
 */

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import Header from "../components/Header";
import "../styles/StockDetail.css";

function StockDetail() {
  const { symbol } = useParams();
  const navigate = useNavigate();
  const [stock, setStock] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchStock() {
      try {
        const res = await fetch(`http://localhost:5000/api/stocks/${symbol.toUpperCase()}`);
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
  const changeModifier = isPositive ? "--positive" : isNegative ? "--negative" : "--neutral";
  const chartColor = isPositive ? "#00C076" : isNegative ? "#FF4D4D" : "#888";

  // Format priceHistory tuples into recharts friendly objects
  const chartData = (stock.priceHistory || []).map(([timestamp, price]) => ({
    time: new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }),
    price,
  }));

  const hasHistory = chartData.length > 0;

  // Format helpers
  function formatPrice(price) {
    if (price === null || price === undefined) return "\u2014";
    return "$" + (price >= 1000
      ? price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : price.toFixed(2));
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

  // Custom tooltip for chart
  function CustomTooltip({ active, payload, label }) {
    if (!active || !payload || !payload.length) return null;
    return (
      <div className="stock-detail-tooltip">
        <p className="stock-detail-tooltip-time">{label}</p>
        <p className={`stock-detail-tooltip-price stock-detail-change${changeModifier}`}>
          {formatPrice(payload[0].value)}
        </p>
      </div>
    );
  }

  return (
    <div className="stock-detail-page">
      <Header />

      <main className="stock-detail-main">
        {/* Back navigation */}
        <nav className="stock-detail-back-nav">
          <button className="stock-detail-back-btn" onClick={() => navigate("/stock-market")}>
            {"\u2190"} Back to Stock Market
          </button>
        </nav>

        {/* Stock header */}
        <header className="stock-detail-header">
          <div className="stock-detail-title-row">
            <div className="stock-detail-title-left">
              <h1 className="stock-detail-symbol">{stock.symbol}</h1>
              <span className="stock-detail-exchange-badge">{stock.exchange}</span>
            </div>
            <div className="stock-detail-title-right">
              <span className="stock-detail-sector-tag">{stock.sector}</span>
              <span className="stock-detail-industry-tag">{stock.industry}</span>
            </div>
          </div>
          <p className="stock-detail-company">{stock.name}</p>
        </header>

        {/* Price section */}
        <section className="stock-detail-price-section">
          <span className="stock-detail-current-price">{formatPrice(stock.price)}</span>
          <div className="stock-detail-change-row">
            <span className={`stock-detail-change stock-detail-change${changeModifier}`}>
              {formatChange(stock.change)}
            </span>
            <span className={`stock-detail-change-pct stock-detail-change${changeModifier}`}>
              {formatChangePct(stock.changePct)}
            </span>
            <span className="stock-detail-price-label">today</span>
          </div>
        </section>

        {/* Chart section */}
        <section className="stock-detail-chart-section">
          <h2 className="stock-detail-chart-title">Price History</h2>
          {hasHistory ? (
            <div className="stock-detail-chart-wrap">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <XAxis
                    dataKey="time"
                    tick={{ fill: "#888", fontSize: 11, fontFamily: "var(--font-mono)" }}
                    tickLine={false}
                    axisLine={{ stroke: "#333" }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    domain={["auto", "auto"]}
                    tick={{ fill: "#888", fontSize: 11, fontFamily: "var(--font-mono)" }}
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
              <p>Price history unavailable {"\u2014"} data populates during market hours</p>
            </div>
          )}
        </section>

        {/* Stats section */}
        <section className="stock-detail-stats">
          {[
            { label: "Open",   value: formatPrice(stock.open) },
            { label: "High",   value: formatPrice(stock.high) },
            { label: "Low",    value: formatPrice(stock.low) },
            { label: "Volume", value: formatVolume(stock.volume) },
          ].map(({ label, value }) => (
            <div key={label} className="stock-detail-stat-card">
              <span className="stock-detail-stat-label">{label}</span>
              <span className="stock-detail-stat-value">{value}</span>
            </div>
          ))}
        </section>

      </main>
    </div>
  );
}

export default StockDetail;
