/**
 * StockMarket Component
 *
 * Public page displaying stock cards with cached prices from DB.
 *
 * Key behaviours:
 * - Single fetch to /api/stocks returns metadata + prices together
 * - Polls every 5 minutes (prices only update daily anyway)
 * - Filter by sector and exchange, search by name or symbol
 * - Shows priceDate so user knows which day's close is displayed
 * - Green / red color coding for price movement
 */

import { useEffect, useState, useCallback } from "react";
import Header from "../components/Header";

const POLL_INTERVAL = 5 * 60 * 1000; // 5 minutes

function StockMarket() {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [countdown, setCountdown] = useState(POLL_INTERVAL / 1000);
  const [searchTerm, setSearchTerm] = useState("");
  const [sectorFilter, setSectorFilter] = useState("All");
  const [exchangeFilter, setExchangeFilter] = useState("All");

  const fetchStocks = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("http://localhost:5000/api/stocks");
      if (!res.ok) throw new Error("Failed to load stocks");
      const data = await res.json();
      setStocks(data);
      setLastUpdated(new Date());
      setCountdown(POLL_INTERVAL / 1000);
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

  useEffect(() => {
    const tick = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(tick);
  }, []);

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
    const sign = change >= 0 ? "+" : "";
    return `${sign}${change.toFixed(2)}`;
  }

  function formatChangePct(pct) {
    if (pct === null || pct === undefined) return "—";
    const sign = pct >= 0 ? "+" : "";
    return `${sign}${pct.toFixed(2)}%`;
  }

  function formatVolume(vol) {
    if (!vol) return "—";
    if (vol >= 1_000_000) return (vol / 1_000_000).toFixed(1) + "M";
    if (vol >= 1_000) return (vol / 1_000).toFixed(0) + "K";
    return vol.toString();
  }

  // Check if any stock has price data yet
  const hasPrices = stocks.some((s) => s.price !== null);
  const priceDate = stocks.find((s) => s.priceDate)?.priceDate || null;

  return (
    <div style={styles.page}>
      <style>{googleFonts}</style>
      <Header />

      <main style={styles.main}>

        {/* Page Header */}
        <header style={styles.pageHeader}>
          <div>
            <h1 style={styles.title}>Stock Market</h1>
            <p style={styles.subtitle}>
              Top 20 by market cap · Previous day's close
              {priceDate && <span style={styles.priceDate}> · {priceDate}</span>}
            </p>
          </div>

          <div style={styles.refreshInfo}>
            {lastUpdated && (
              <span style={styles.lastUpdated}>
                Updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            <div style={styles.countdownBadge}>
              <span style={styles.countdownDot} />
              Refreshing in {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, "0")}
            </div>
            <button style={styles.refreshBtn} onClick={fetchStocks} title="Refresh now">↻</button>
          </div>
        </header>

        {/* Filters */}
        <div style={styles.filtersRow}>
          <div style={styles.searchWrap}>
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

          <select value={sectorFilter} onChange={(e) => setSectorFilter(e.target.value)} style={styles.select}>
            {sectors.map((s) => <option key={s} value={s}>{s === "All" ? "All Sectors" : s}</option>)}
          </select>

          <select value={exchangeFilter} onChange={(e) => setExchangeFilter(e.target.value)} style={styles.select}>
            {["All", "NASDAQ", "NYSE"].map((e) => <option key={e} value={e}>{e === "All" ? "All Exchanges" : e}</option>)}
          </select>

          <span style={styles.resultCount}>{filtered.length} stocks</span>
        </div>

        {/* Error */}
        {error && (
          <div style={styles.errorBanner} role="alert">
            ⚠ {error} — <button style={styles.retryBtn} onClick={fetchStocks}>Retry</button>
          </div>
        )}

        {/* Price fetch in progress notice */}
        {!loading && !hasPrices && (
          <div style={styles.infoBanner}>
            ⏳ Price data is being fetched in the background (~4 min). Cards will populate automatically.
          </div>
        )}

        {/* Loading skeleton */}
        {loading ? (
          <div style={styles.grid}>
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} style={styles.skeleton} />
            ))}
          </div>
        ) : (
          <div style={styles.grid}>
            {filtered.map((stock) => {
              const isPositive = stock.change > 0;
              const isNegative = stock.change < 0;
              const changeColor = isPositive ? "#00C076" : isNegative ? "#FF4D4D" : "#888";
              const changeBg = isPositive ? "rgba(0,192,118,0.08)" : isNegative ? "rgba(255,77,77,0.08)" : "transparent";

              return (
                <article key={stock.symbol} style={styles.card}>

                  <div style={styles.cardTop}>
                    <div>
                      <span style={styles.symbol}>{stock.symbol}</span>
                      <span style={styles.exchangeBadge}>{stock.exchange}</span>
                    </div>
                    <span style={styles.sectorTag}>{stock.sector}</span>
                  </div>

                  <p style={styles.companyName}>{stock.name}</p>

                  <div style={styles.priceRow}>
                    <span style={styles.price}>
                      {stock.price ? formatPrice(stock.price) : <span style={styles.loadingDash}>—</span>}
                    </span>
                  </div>

                  <div style={{ ...styles.changeRow, backgroundColor: changeBg, borderColor: changeColor + "33" }}>
                    <span style={{ ...styles.change, color: changeColor }}>
                      {formatChange(stock.change)}
                    </span>
                    <span style={{ ...styles.changePct, color: changeColor }}>
                      {formatChangePct(stock.changePct)}
                    </span>
                  </div>

                  <div style={styles.volumeRow}>
                    <span style={styles.volumeLabel}>Vol</span>
                    <span style={styles.volumeValue}>{formatVolume(stock.volume)}</span>
                  </div>

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
  page: { minHeight: "100vh", backgroundColor: BG, color: TEXT, fontFamily: "'IBM Plex Sans', sans-serif" },
  main: { maxWidth: "90rem", margin: "0 auto", padding: "2.5rem 1.5rem 5rem" },
  pageHeader: {
    display: "flex", justifyContent: "space-between", alignItems: "flex-end",
    marginBottom: "2rem", paddingBottom: "1.5rem", borderBottom: `1px solid ${BORDER}`,
    flexWrap: "wrap", gap: "1rem",
  },
  title: { margin: "0 0 0.25rem", fontSize: "2rem", fontWeight: "700", letterSpacing: "-0.02em" },
  subtitle: { margin: 0, fontSize: "0.85rem", color: MUTED },
  priceDate: { color: BLUE },
  refreshInfo: { display: "flex", alignItems: "center", gap: "0.75rem" },
  lastUpdated: { fontSize: "0.8rem", color: MUTED },
  countdownBadge: {
    display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8rem", color: MUTED,
    backgroundColor: SURFACE, padding: "0.35rem 0.75rem", borderRadius: "2rem", border: `1px solid ${BORDER}`,
  },
  countdownDot: { width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#00C076", display: "inline-block" },
  refreshBtn: {
    background: "none", border: `1px solid ${BORDER}`, color: MUTED, borderRadius: "0.375rem",
    width: "2rem", height: "2rem", cursor: "pointer", fontSize: "1rem",
    display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "inherit",
  },
  filtersRow: { display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.75rem", flexWrap: "wrap" },
  searchWrap: { position: "relative", flex: "1", minWidth: "12rem", maxWidth: "20rem" },
  searchIcon: { position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" },
  searchInput: {
    width: "100%", padding: "0.6rem 1rem 0.6rem 2.25rem", backgroundColor: SURFACE,
    border: `1px solid ${BORDER}`, borderRadius: "0.5rem", color: TEXT, fontSize: "0.9rem",
    outline: "none", boxSizing: "border-box", fontFamily: "inherit",
  },
  select: {
    padding: "0.6rem 1rem", backgroundColor: SURFACE, border: `1px solid ${BORDER}`,
    borderRadius: "0.5rem", color: TEXT, fontSize: "0.9rem", outline: "none", cursor: "pointer", fontFamily: "inherit",
  },
  resultCount: { marginLeft: "auto", fontSize: "0.85rem", color: MUTED },
  errorBanner: {
    backgroundColor: "rgba(255,77,77,0.1)", border: "1px solid rgba(255,77,77,0.3)",
    color: "#FF4D4D", padding: "0.75rem 1rem", borderRadius: "0.5rem", marginBottom: "1.5rem", fontSize: "0.9rem",
  },
  infoBanner: {
    backgroundColor: "rgba(15,159,234,0.08)", border: "1px solid rgba(15,159,234,0.2)",
    color: BLUE, padding: "0.75rem 1rem", borderRadius: "0.5rem", marginBottom: "1.5rem", fontSize: "0.9rem",
  },
  retryBtn: { background: "none", border: "none", color: "#FF4D4D", textDecoration: "underline", cursor: "pointer", fontFamily: "inherit", fontSize: "0.9rem" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(16rem, 1fr))", gap: "1rem" },
  skeleton: { height: "10rem", backgroundColor: SURFACE, borderRadius: "0.75rem", border: `1px solid ${BORDER}` },
  card: {
    backgroundColor: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: "0.75rem",
    padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.5rem", cursor: "default",
  },
  cardTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" },
  symbol: { fontSize: "1.1rem", fontWeight: "700", fontFamily: "'IBM Plex Mono', monospace", color: TEXT, marginRight: "0.5rem" },
  exchangeBadge: {
    fontSize: "0.65rem", fontWeight: "600", color: BLUE, backgroundColor: "rgba(15,159,234,0.1)",
    padding: "0.15rem 0.4rem", borderRadius: "0.25rem", verticalAlign: "middle", letterSpacing: "0.04em",
  },
  sectorTag: {
    fontSize: "0.65rem", color: MUTED, backgroundColor: SURFACE, padding: "0.2rem 0.5rem",
    borderRadius: "0.25rem", whiteSpace: "nowrap", maxWidth: "8rem", overflow: "hidden",
    textOverflow: "ellipsis", border: `1px solid ${BORDER}`,
  },
  companyName: { margin: 0, fontSize: "0.78rem", color: MUTED, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  priceRow: { marginTop: "0.25rem" },
  price: { fontSize: "1.6rem", fontWeight: "600", fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "-0.02em", color: TEXT },
  loadingDash: { color: MUTED },
  changeRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.4rem 0.6rem", borderRadius: "0.4rem", border: "1px solid transparent" },
  change: { fontSize: "0.9rem", fontWeight: "600", fontFamily: "'IBM Plex Mono', monospace" },
  changePct: { fontSize: "0.9rem", fontWeight: "600", fontFamily: "'IBM Plex Mono', monospace" },
  volumeRow: { display: "flex", justifyContent: "space-between", marginTop: "0.25rem" },
  volumeLabel: { fontSize: "0.72rem", color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em" },
  volumeValue: { fontSize: "0.72rem", color: MUTED, fontFamily: "'IBM Plex Mono', monospace" },
};

export default StockMarket;