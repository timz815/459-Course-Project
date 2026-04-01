/**
 * StockMarket Page
 *
 * Displays a browsable, filterable grid of all available stocks with EOD pricing.
 *
 * Key behaviours:
 * - Polls stock data every 24 hours automatically
 * - Supports filtering by search term, sector, and exchange
 * - Shows loading skeletons while fetching initial data
 * - Displays price, change, and volume metrics per stock
 * - Clicking a stock card navigates to /stocks/:symbol for full detail
 * - Handles error states with retry functionality
 */

import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Input from "../components/UI/Input";
import "../styles/StockMarket.css";

const POLL_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

function StockMarket() {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sectorFilter, setSectorFilter] = useState("All");
  const [exchangeFilter, setExchangeFilter] = useState("All");
  const navigate = useNavigate();

  // Fetch stock data from API
  const fetchStocks = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("http://localhost:5000/api/stocks");
      if (!res.ok) throw new Error("Failed to load stocks");
      const data = await res.json();
      setStocks(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch and polling setup
  useEffect(() => {
    fetchStocks();
    const interval = setInterval(fetchStocks, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchStocks]);

  // Build sector filter options from available data
  const sectors = [
    "All",
    ...Array.from(new Set(stocks.map((s) => s.sector))).sort(),
  ];

  // Apply all active filters to stock list
  const filtered = stocks.filter((s) => {
    const matchesSearch =
      s.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSector = sectorFilter === "All" || s.sector === sectorFilter;
    const matchesExchange =
      exchangeFilter === "All" || s.exchange === exchangeFilter;
    return matchesSearch && matchesSector && matchesExchange;
  });

  // Format price with locale for large numbers
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

  // Format change value with sign
  function formatChange(change) {
    if (change === null || change === undefined) return "\u2014";
    const sign = change >= 0 ? "+" : "";
    return `${sign}${change.toFixed(2)}`;
  }

  // Format percentage change with sign
  function formatChangePct(pct) {
    if (pct === null || pct === undefined) return "\u2014";
    const sign = pct >= 0 ? "+" : "";
    return `${sign}${pct.toFixed(2)}%`;
  }

  // Format volume with K/M suffixes
  function formatVolume(vol) {
    if (!vol) return "\u2014";
    if (vol >= 1_000_000) return (vol / 1_000_000).toFixed(1) + "M";
    if (vol >= 1_000) return (vol / 1_000).toFixed(0) + "K";
    return vol.toString();
  }

  function changeClass(stock) {
    if (stock.change > 0)
      return "stock-market-change stock-market-change--positive";
    if (stock.change < 0)
      return "stock-market-change stock-market-change--negative";
    return "stock-market-change";
  }

  const hasPrices = stocks.some((s) => s.price !== null);
  const priceDate = stocks.find((s) => s.priceDate)?.priceDate || null;

  return (
    <div className="stock-market-page">
      <Header />

      <main className="stock-market-main">
        <header className="stock-market-header">
          <h1 className="stock-market-title">Stock Market</h1>
          <div className="stock-market-refresh">
            {priceDate && (
              <span className="stock-market-updated">Updated: {priceDate}</span>
            )}
            <button
              className="stock-market-refresh-btn"
              onClick={fetchStocks}
              title="Refresh now"
            >
              {"\u21BB"}
            </button>
          </div>
        </header>

        <section className="stock-market-filters">
          <Input
            type="text"
            placeholder="Search symbol or name…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            inputClassName="stock-market-search-input"
          />

          <select
            value={sectorFilter}
            onChange={(e) => setSectorFilter(e.target.value)}
            className="stock-market-select"
          >
            {sectors.map((s) => (
              <option key={s} value={s}>
                {s === "All" ? "All Sectors" : s}
              </option>
            ))}
          </select>

          <select
            value={exchangeFilter}
            onChange={(e) => setExchangeFilter(e.target.value)}
            className="stock-market-select"
          >
            {["All", "NASDAQ", "NYSE"].map((e) => (
              <option key={e} value={e}>
                {e === "All" ? "All Exchanges" : e}
              </option>
            ))}
          </select>

          <span className="stock-market-count">{filtered.length} stocks</span>
        </section>

        {error && (
          <div className="stock-market-error" role="alert">
            {"\u26A0"} {error} \u2014{" "}
            <button className="stock-market-retry" onClick={fetchStocks}>
              Retry
            </button>
          </div>
        )}

        {!loading && !hasPrices && (
          <div className="stock-market-info">
            {"\u23F3"} Price data is being fetched in the background (~4 min).
            Refresh the page once complete.
          </div>
        )}

        {loading ? (
          <div className="stock-market-grid">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="stock-market-skeleton" />
            ))}
          </div>
        ) : (
          <div className="stock-market-grid">
            {filtered.map((stock) => (
              <article
                key={stock.symbol}
                className="stock-market-card"
                onClick={() => navigate(`/stocks/${stock.symbol}`)}
              >
                <header className="stock-market-card-header">
                  <div>
                    <span className="stock-market-symbol">{stock.symbol}</span>
                    <span className="stock-market-exchange-tag">
                      {stock.exchange}
                    </span>
                  </div>
                  <span className="stock-market-sector-tag">
                    {stock.sector}
                  </span>
                </header>

                <p className="stock-market-company">{stock.name}</p>

                <div className="stock-market-price-area">
                  <span className="stock-market-price">
                    {stock.price ? (
                      formatPrice(stock.price)
                    ) : (
                      <span className="stock-market-price--muted">
                        {"\u2014"}
                      </span>
                    )}
                  </span>
                </div>

                <div className={changeClass(stock)}>
                  <span className="stock-market-change-val">
                    {formatChange(stock.change)}
                  </span>
                  <span className="stock-market-change-pct">
                    {formatChangePct(stock.changePct)}
                  </span>
                </div>

                <footer className="stock-market-volume">
                  <span className="stock-market-volume-label">Vol</span>
                  <span className="stock-market-volume-value">
                    {formatVolume(stock.volume)}
                  </span>
                </footer>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default StockMarket;
