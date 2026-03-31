/**
 * StockMarket Page
 *
 * Displays a browsable, filterable grid of all available stocks with pricing.
 *
 * Key behaviours:
 * - Polls stock data every 24 hours automatically
 * - Supports filtering by search term, sector, and exchange
 * - Shows loading skeletons while fetching initial data
 * - Displays price, change, and volume metrics per stock
 * - Shows "Market closed · Last price as of [date]" when market is closed
 * - Clicking a stock card navigates to /stocks/:symbol for full detail
 * - Handles error states with retry functionality
 */

import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import { isMarketOpen } from "../utils/marketHours";

const POLL_INTERVAL = 24 * 60 * 60 * 1000;

function StockMarket() {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sectorFilter, setSectorFilter] = useState("All");
  const [exchangeFilter, setExchangeFilter] = useState("All");
  const [marketOpen, setMarketOpen] = useState(isMarketOpen());
  const navigate = useNavigate();

  const fetchStocks = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("http://localhost:5000/api/stocks");
      if (!res.ok) throw new Error("Failed to load stocks");
      const data = await res.json();
      setStocks(data);
      setMarketOpen(isMarketOpen());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStocks();
    const interval = setInterval(fetchStocks, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchStocks]);

  const sectors = ["All", ...Array.from(new Set(stocks.map((s) => s.sector))).sort()];

  const filtered = stocks.filter((s) => {
    const matchesSearch =
      s.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSector = sectorFilter === "All" || s.sector === sectorFilter;
    const matchesExchange = exchangeFilter === "All" || s.exchange === exchangeFilter;
    return matchesSearch && matchesSector && matchesExchange;
  });

  function formatPrice(price) {
    if (price === null || price === undefined) return "—";
    return "$" + (price >= 1000
      ? price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : price.toFixed(2));
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

  return (
    <div style={styles.pageLayout}>
      <style>{googleFonts}</style>
      <Header />

      <main style={styles.mainContent}>
        <header style={styles.pageHeader}>
          <div style={styles.pageTitleRow}>
            <h1 style={styles.pageTitle}>Stock Market</h1>
            {!marketOpen && (
              <span style={styles.marketClosedBadge}>Market Closed</span>
            )}
          </div>
          <button style={styles.refreshButton} onClick={fetchStocks} title="Refresh now">↻</button>
        </header>

        <section style={styles.filterBar}>
          <div style={styles.searchField}>
            <svg style={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search symbol or name…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
          </div>

          <select value={sectorFilter} onChange={(e) => setSectorFilter(e.target.value)} style={styles.filterSelect}>
            {sectors.map((s) => <option key={s} value={s}>{s === "All" ? "All Sectors" : s}</option>)}
          </select>

          <select value={exchangeFilter} onChange={(e) => setExchangeFilter(e.target.value)} style={styles.filterSelect}>
            {["All", "NASDAQ", "NYSE"].map((e) => <option key={e} value={e}>{e === "All" ? "All Exchanges" : e}</option>)}
          </select>

          <span style={styles.resultCount}>{filtered.length} stocks</span>
        </section>

        {error && (
          <div style={styles.errorAlert} role="alert">
            ⚠ {error} — <button style={styles.retryButton} onClick={fetchStocks}>Retry</button>
          </div>
        )}

        {loading ? (
          <div style={styles.stockGrid}>
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} style={styles.skeletonCard} />
            ))}
          </div>
        ) : (
          <div style={styles.stockGrid}>
            {filtered.map((stock) => {
              const isPositive = stock.change > 0;
              const isNegative = stock.change < 0;
              const changeColor = isPositive ? "#00C076" : isNegative ? "#FF4D4D" : "#888";
              const changeBg = isPositive ? "rgba(0,192,118,0.08)" : isNegative ? "rgba(255,77,77,0.08)" : "transparent";
              const priceDate = formatPriceDate(stock.priceUpdatedAt);

              return (
                <article
                  key={stock.symbol}
                  style={styles.stockCard}
                  onClick={() => navigate(`/stocks/${stock.symbol}`)}
                  onMouseEnter={e => e.currentTarget.style.borderColor = "#555"}
                  onMouseLeave={e => e.currentTarget.style.borderColor = "#333"}
                >
                  <header style={styles.cardHeader}>
                    <div>
                      <span style={styles.stockSymbol}>{stock.symbol}</span>
                      <span style={styles.exchangeTag}>{stock.exchange}</span>
                    </div>
                    <span style={styles.sectorTag}>{stock.sector}</span>
                  </header>

                  <p style={styles.companyName}>{stock.name}</p>

                  <div style={styles.priceDisplay}>
                    <span style={styles.currentPrice}>
                      {stock.price ? formatPrice(stock.price) : <span style={styles.pricePlaceholder}>—</span>}
                    </span>
                  </div>

                  <div style={{ ...styles.changeIndicator, backgroundColor: changeBg, borderColor: changeColor + "33" }}>
                    <span style={{ ...styles.changeValue, color: changeColor }}>
                      {formatChange(stock.change)}
                    </span>
                    <span style={{ ...styles.changePercent, color: changeColor }}>
                      {formatChangePct(stock.changePct)}
                    </span>
                  </div>

                  <footer style={styles.cardFooter}>
                    <div style={styles.volumeDisplay}>
                      <span style={styles.volumeLabel}>Vol</span>
                      <span style={styles.volumeValue}>{formatVolume(stock.volume)}</span>
                    </div>
                    {!marketOpen && priceDate && (
                      <span style={styles.marketClosedNote}>
                        Market closed · {priceDate}
                      </span>
                    )}
                  </footer>
                </article>
              );
            })}
          </div>
        )}
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
const BLUE = "#0F9FEA";

const styles = {
  pageLayout: { minHeight: "100vh", backgroundColor: BG, color: TEXT, fontFamily: "'IBM Plex Sans', sans-serif" },
  mainContent: { maxWidth: "90rem", margin: "0 auto", padding: "2.5rem 1.5rem 5rem" },
  pageHeader: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    marginBottom: "2rem", paddingBottom: "1.5rem", borderBottom: `1px solid ${BORDER}`,
  },
  pageTitleRow: { display: "flex", alignItems: "center", gap: "1rem" },
  pageTitle: { margin: 0, fontSize: "2rem", fontWeight: "700", letterSpacing: "-0.02em" },
  marketClosedBadge: {
    fontSize: "0.75rem", fontWeight: "600", color: MUTED,
    backgroundColor: SURFACE, padding: "0.25rem 0.625rem",
    borderRadius: "1rem", border: `1px solid ${BORDER}`,
  },
  refreshButton: {
    background: "none", border: `1px solid ${BORDER}`, color: MUTED, borderRadius: "0.375rem",
    width: "2rem", height: "2rem", cursor: "pointer", fontSize: "1rem",
    display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "inherit",
  },
  filterBar: { display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.75rem", flexWrap: "wrap" },
  searchField: { position: "relative", flex: "1", minWidth: "12rem", maxWidth: "20rem" },
  searchIcon: { position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" },
  searchInput: {
    width: "100%", padding: "0.6rem 1rem 0.6rem 2.25rem", backgroundColor: SURFACE,
    border: `1px solid ${BORDER}`, borderRadius: "0.5rem", color: TEXT, fontSize: "0.9rem",
    outline: "none", boxSizing: "border-box", fontFamily: "inherit",
  },
  filterSelect: {
    padding: "0.6rem 1rem", backgroundColor: SURFACE, border: `1px solid ${BORDER}`,
    borderRadius: "0.5rem", color: TEXT, fontSize: "0.9rem", outline: "none", cursor: "pointer", fontFamily: "inherit",
  },
  resultCount: { marginLeft: "auto", fontSize: "0.85rem", color: MUTED },
  errorAlert: {
    backgroundColor: "rgba(255,77,77,0.1)", border: "1px solid rgba(255,77,77,0.3)",
    color: "#FF4D4D", padding: "0.75rem 1rem", borderRadius: "0.5rem", marginBottom: "1.5rem", fontSize: "0.9rem",
  },
  retryButton: { background: "none", border: "none", color: "#FF4D4D", textDecoration: "underline", cursor: "pointer", fontFamily: "inherit", fontSize: "0.9rem" },
  stockGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(16rem, 1fr))", gap: "1rem" },
  skeletonCard: { height: "10rem", backgroundColor: SURFACE, borderRadius: "0.75rem", border: `1px solid ${BORDER}` },
  stockCard: {
    backgroundColor: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: "0.75rem",
    padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.5rem",
    cursor: "pointer", transition: "border-color 0.15s",
  },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" },
  stockSymbol: { fontSize: "1.1rem", fontWeight: "700", fontFamily: "'IBM Plex Mono', monospace", color: TEXT, marginRight: "0.5rem" },
  exchangeTag: {
    fontSize: "0.65rem", fontWeight: "600", color: BLUE, backgroundColor: "rgba(15,159,234,0.1)",
    padding: "0.15rem 0.4rem", borderRadius: "0.25rem", verticalAlign: "middle", letterSpacing: "0.04em",
  },
  sectorTag: {
    fontSize: "0.65rem", color: MUTED, backgroundColor: SURFACE, padding: "0.2rem 0.5rem",
    borderRadius: "0.25rem", whiteSpace: "nowrap", maxWidth: "8rem", overflow: "hidden",
    textOverflow: "ellipsis", border: `1px solid ${BORDER}`,
  },
  companyName: { margin: 0, fontSize: "0.78rem", color: MUTED, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  priceDisplay: { marginTop: "0.25rem" },
  currentPrice: { fontSize: "1.6rem", fontWeight: "600", fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "-0.02em", color: TEXT },
  pricePlaceholder: { color: MUTED },
  changeIndicator: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.4rem 0.6rem", borderRadius: "0.4rem", border: "1px solid transparent" },
  changeValue: { fontSize: "0.9rem", fontWeight: "600", fontFamily: "'IBM Plex Mono', monospace" },
  changePercent: { fontSize: "0.9rem", fontWeight: "600", fontFamily: "'IBM Plex Mono', monospace" },
  cardFooter: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.25rem" },
  volumeDisplay: { display: "flex", gap: "0.375rem" },
  volumeLabel: { fontSize: "0.72rem", color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em" },
  volumeValue: { fontSize: "0.72rem", color: MUTED, fontFamily: "'IBM Plex Mono', monospace" },
  marketClosedNote: { fontSize: "0.65rem", color: MUTED, fontStyle: "italic" },
};

export default StockMarket;