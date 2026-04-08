/**
 * StockMarket Page
 *
 * Displays a browsable, filterable stock board with shared dropdown controls.
 */

import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import FilterDropdown from "../components/UI/FilterDropdown";
import { ReactComponent as MagnifyIcon } from "../assets/Icon_16x16/Magnify_16x16.svg";
import { isMarketOpen } from "../utils/marketHours";
import "../styles/StockMarket.css";

const POLL_INTERVAL = 24 * 60 * 60 * 1000;

const SECTOR_ABBREV = {
  "Communication Services": "COMM SVCS",
  "Consumer Cyclical": "CONS CYCL",
  "Consumer Defensive": "CONS DEF",
  "Financial Services": "FIN SVCS",
};

function sectorChipLabel(sector) {
  return SECTOR_ABBREV[sector] || sector || "Unknown";
}

function formatCurrency(amount, digits = 2) {
  return Number(amount).toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatVolume(vol) {
  if (!vol) return "--";
  if (vol >= 1_000_000_000) return `${(vol / 1_000_000_000).toFixed(1)}B`;
  if (vol >= 1_000_000) return `${(vol / 1_000_000).toFixed(1)}M`;
  if (vol >= 1_000) return `${(vol / 1_000).toFixed(1)}K`;
  return String(vol);
}

function StockMarket() {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sectorFilter, setSectorFilter] = useState("all");
  const [exchangeFilter, setExchangeFilter] = useState("all");
  const [marketOpen, setMarketOpen] = useState(isMarketOpen());
  const navigate = useNavigate();

  const fetchStocks = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("http://localhost:5001/api/stocks");
      if (!res.ok) throw new Error("Failed to load stocks");
      const data = await res.json();
      setStocks(Array.isArray(data) ? data : []);
      setMarketOpen(isMarketOpen());
    } catch (err) {
      setError(err.message || "Unable to load stock data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStocks();
    const interval = setInterval(fetchStocks, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchStocks]);

  const sectors = Array.from(
    new Set(stocks.map((s) => s.sector).filter(Boolean)),
  ).sort();

  const sectorOptions = [
    { value: "all", label: "All Sectors", color: "rgba(136,146,156,0.6)" },
    ...sectors.map((sector) => ({
      value: sector,
      label: sector,
      color: "var(--color-neutral-100)",
    })),
  ];

  const exchangeOptions = [
    { value: "all", label: "All", color: "rgba(136,146,156,0.6)" },
    { value: "nasdaq", label: "NASDAQ", color: "var(--color-neutral-100)" },
    { value: "nyse", label: "NYSE", color: "var(--color-neutral-100)" },
  ];

  const filteredStocks = stocks.filter((s) => {
    const symbol = s.symbol?.toLowerCase() || "";
    const name = s.name?.toLowerCase() || "";

    const matchesSearch =
      symbol.includes(searchTerm.toLowerCase()) ||
      name.includes(searchTerm.toLowerCase());

    const matchesSector = sectorFilter === "all" || s.sector === sectorFilter;

    const matchesExchange =
      exchangeFilter === "all" || s.exchange?.toLowerCase() === exchangeFilter;

    return matchesSearch && matchesSector && matchesExchange;
  });

  const priceDate = stocks[0]?.priceUpdatedAt
    ? new Date(stocks[0].priceUpdatedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  function renderPriceChip(stock) {
    const pct = stock.changePct;
    if (pct === null || pct === undefined) {
      return <span className="sm-card-change sm-card-change--flat">--</span>;
    }

    const positive = pct > 0;
    const negative = pct < 0;

    return (
      <span
        className={`sm-card-change ${
          positive
            ? "sm-card-change--up"
            : negative
              ? "sm-card-change--down"
              : "sm-card-change--flat"
        }`}
      >
        {pct > 0 ? "+" : ""}
        {pct.toFixed(2)}%
      </span>
    );
  }

  return (
    <div className="stock-market-page">
      <Header />

      <main className="stock-market-main">
        <header className="sm-page-head">
          <p className="sm-eyebrow">Live Institutional Liquidity</p>
          <h1 className="sm-title">Stock Market</h1>
        </header>

        <section className="sm-filter-bar">
          <div className="sm-search-wrap">
            <MagnifyIcon className="sm-search-icon" />
            <input
              type="text"
              className="sm-search-input"
              placeholder="Search stocks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="sm-filter-dropdown sm-filter-dropdown--sector">
            <FilterDropdown
              value={sectorFilter}
              options={sectorOptions}
              onChange={setSectorFilter}
            />
          </div>

          <div className="sm-filter-dropdown sm-filter-dropdown--exchange">
            <FilterDropdown
              value={exchangeFilter}
              options={exchangeOptions}
              onChange={setExchangeFilter}
            />
          </div>

          <div className="sm-result-pill">
            SHOWING {filteredStocks.length} RESULTS
          </div>
        </section>

        {!marketOpen && priceDate && (
          <p className="sm-closed-note">
            Market closed. Last update {priceDate}.
          </p>
        )}

        {error && (
          <div className="sm-error" role="alert">
            {error}
            <button
              type="button"
              onClick={fetchStocks}
              className="sm-retry-btn"
            >
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <section className="sm-grid">
            {Array.from({ length: 12 }).map((_, idx) => (
              <div key={idx} className="sm-card sm-card--skeleton" />
            ))}
          </section>
        ) : (
          <section className="sm-grid">
            {filteredStocks.map((stock) => (
              <article
                key={stock.symbol}
                className="sm-card"
                onClick={() => navigate(`/stocks/${stock.symbol}`)}
              >
                <div className="sm-card-top">
                  <div className="sm-card-top-left">
                    <h2 className="sm-card-symbol">{stock.symbol}</h2>
                    <span className="sm-card-chip sm-card-chip--exchange">
                      {stock.exchange || "--"}
                    </span>
                  </div>
                  <span className="sm-card-chip sm-card-chip--sector">
                    {sectorChipLabel(stock.sector)}
                  </span>
                </div>

                <p className="sm-card-company">
                  {stock.name || "Unknown Company"}
                </p>

                <div className="sm-card-bottom">
                  <div className="sm-card-price-block">
                    <p className="sm-card-price">
                      {stock.price != null
                        ? `$${formatCurrency(stock.price)}`
                        : "--"}
                    </p>
                    <p className="sm-card-volume">
                      VOL: {formatVolume(stock.volume)}
                    </p>
                  </div>
                  {renderPriceChip(stock)}
                </div>
              </article>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}

export default StockMarket;
