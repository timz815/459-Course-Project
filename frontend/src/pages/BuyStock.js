/**
 * BuyStock Page
 *
 * Allows a tournament participant to buy a stock by entering a dollar amount.
 *
 * Key behaviours:
 * - Reads tournamentId and symbol from URL params
 * - Fetches cached EOD stock price from DB for estimate display only
 * - Updates estimated shares in real-time as user types dollar amount
 * - Validates dollar_amount <= cash_balance before enabling submit
 * - Single Finnhub call happens on the backend at trade execution
 * - Navigates back to tournament detail on success or cancel
 */

import { useContext, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import Header from "../components/Header";

function BuyStock() {
  const { id: tournamentId, symbol } = useParams();
  const { token } = useContext(AuthContext);
  const navigate = useNavigate();

  const [stock, setStock] = useState(null);
  const [participant, setParticipant] = useState(null);
  const [dollarAmount, setDollarAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Fetch stock info (cached price) and participant (cash balance)
  useEffect(() => {
    async function fetchData() {
      try {
        const [stockRes, participantsRes] = await Promise.all([
          fetch(`http://localhost:5000/api/stocks`),
          fetch(`http://localhost:5000/api/tournaments/${tournamentId}/participants`),
        ]);
        const stocks = await stockRes.json();
        const participants = await participantsRes.json();

        const found = stocks.find((s) => s.symbol === symbol.toUpperCase());
        setStock(found || null);

        // Find this user's participant entry by decoding token
        const tokenPayload = JSON.parse(atob(token.split(".")[1]));
        const myParticipant = participants.find(
          (p) => p.user?._id === tokenPayload.id || p.user === tokenPayload.id
        );
        setParticipant(myParticipant || null);
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [tournamentId, symbol, token]);

  // Estimate shares from cached EOD price — purely cosmetic
  const amount = parseFloat(dollarAmount);
  const estimatedShares =
    stock?.price && amount > 0
      ? (amount / stock.price).toFixed(1)
      : null;

  const cashBalance = participant?.cash_balance ?? 0;
  const isValid = amount > 0 && amount <= cashBalance;

  async function handleBuy() {
    if (!isValid) return;
    setSubmitting(true);
    setError("");

    console.log("📡 URL:", `http://localhost:5000/api/tournaments/${tournamentId}/trades`);
    console.log("🏆 tournamentId:", tournamentId);
    console.log("🔑 token:", token);

    console.log("🔑 Token being sent:", token);
    console.log("🏆 Tournament ID:", tournamentId);
    console.log("💵 Amount:", amount);
    console.log("📈 Symbol:", symbol);

    try {
      const res = await fetch(
        `http://localhost:5000/api/tournaments/${tournamentId}/trades`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token,
          },
          body: JSON.stringify({
            symbol: symbol.toUpperCase(),
            side: "buy",
            dollar_amount: amount,
          }),
        }
      );

      const data = await res.json();
      if (res.ok) {
        navigate(`/tournaments/${tournamentId}`, {
          state: { toast: `${data.message}` },
        });
      } else {
        setError(data.message || "Trade failed");
      }
    } catch (err) {
      setError("Server error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div style={styles.page}>
        <Header />
        <main style={styles.main}>
          <p style={styles.statusMsg}>Loading...</p>
        </main>
      </div>
    );
  }

  if (!stock) {
    return (
      <div style={styles.page}>
        <Header />
        <main style={styles.main}>
          <p style={styles.statusMsg}>Stock not found.</p>
        </main>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <Header />
      <main style={styles.main}>
        <article style={styles.card}>

          {/* Header */}
          <div style={styles.cardHeader}>
            <div>
              <h1 style={styles.title}>Buy {stock.symbol}</h1>
              <p style={styles.subtitle}>{stock.name}</p>
            </div>
            <div style={styles.priceTag}>
              {stock.price ? (
                <>
                  <span style={styles.priceLabel}>~Price</span>
                  <span style={styles.priceValue}>${stock.price.toFixed(2)}</span>
                  <span style={styles.priceNote}>EOD est.</span>
                </>
              ) : (
                <span style={styles.priceNote}>Price unavailable</span>
              )}
            </div>
          </div>

          {/* Cash balance */}
          <div style={styles.balanceRow}>
            <span style={styles.balanceLabel}>Available Cash</span>
            <span style={styles.balanceValue}>
              ${cashBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          </div>

          {/* Dollar input */}
          <label htmlFor="dollar_amount" style={styles.label}>
            Amount to Invest
          </label>
          <div style={styles.currencyInput}>
            <span style={styles.currencySymbol}>$</span>
            <input
              id="dollar_amount"
              type="number"
              min="0"
              step="100"
              placeholder="0.00"
              value={dollarAmount}
              onChange={(e) => setDollarAmount(e.target.value)}
              style={styles.currencyField}
              autoFocus
            />
          </div>

          {/* Validation hint */}
          {amount > cashBalance && amount > 0 && (
            <p style={styles.error}>Amount exceeds your available cash balance</p>
          )}

          {/* Estimated shares */}
          {estimatedShares && isValid && (
            <div style={styles.estimate}>
              <span style={styles.estimateLabel}>Estimated shares</span>
              <span style={styles.estimateValue}>~{estimatedShares} shares</span>
              <span style={styles.estimateNote}>Final amount calculated at execution price</span>
            </div>
          )}

          {/* Server error */}
          {error && <p style={styles.error}>{error}</p>}

          {/* Actions */}
          <div style={styles.actions}>
            <button
              type="button"
              style={styles.cancelBtn}
              onClick={() => navigate(`/tournaments/${tournamentId}`)}
            >
              Cancel
            </button>
            <button
              type="button"
              style={{
                ...styles.buyBtn,
                ...(!isValid || submitting ? styles.btnDisabled : {}),
              }}
              onClick={handleBuy}
              disabled={!isValid || submitting}
            >
              {submitting ? "Buying…" : `Buy ${stock.symbol}`}
            </button>
          </div>

        </article>
      </main>
    </div>
  );
}

const BLUE = "#0F9FEA";
const GREEN = "#00C076";
const BG = "#1A1A1A";
const TEXT = "#F9F9F9";

const styles = {
  page: { minHeight: "100vh", backgroundColor: BG, fontFamily: "'Segoe UI', sans-serif" },
  main: { display: "flex", justifyContent: "center", padding: "2.5rem 1.25rem" },
  statusMsg: { color: "#888", textAlign: "center", padding: "5rem" },
  card: {
    width: "100%",
    maxWidth: "30rem",
    backgroundColor: "#2a2a2a",
    borderRadius: "1rem",
    padding: "2rem",
    border: "1px solid #333",
    boxShadow: "0 0.5rem 2rem rgba(0,0,0,0.4)",
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "0.5rem",
  },
  title: { margin: 0, fontSize: "1.6rem", fontWeight: "700", color: TEXT },
  subtitle: { margin: "0.25rem 0 0", fontSize: "0.85rem", color: "#888" },
  priceTag: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: "0.1rem",
  },
  priceLabel: { fontSize: "0.7rem", color: "#555", textTransform: "uppercase", letterSpacing: "0.06em" },
  priceValue: { fontSize: "1.2rem", fontWeight: "700", color: TEXT },
  priceNote: { fontSize: "0.65rem", color: "#555" },
  balanceRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#252525",
    padding: "0.625rem 0.875rem",
    borderRadius: "0.5rem",
    border: "1px solid #333",
  },
  balanceLabel: { fontSize: "0.82rem", color: "#888" },
  balanceValue: { fontSize: "0.95rem", fontWeight: "700", color: GREEN },
  label: { fontSize: "0.82rem", fontWeight: "600", color: "#aaa", marginTop: "0.25rem" },
  currencyInput: { position: "relative" },
  currencySymbol: {
    position: "absolute", left: "0.875rem", top: "50%",
    transform: "translateY(-50%)", color: "#666", fontWeight: "600", pointerEvents: "none",
  },
  currencyField: {
    width: "100%",
    padding: "0.75rem 1rem 0.75rem 1.75rem",
    borderRadius: "0.5rem",
    border: "1px solid #444",
    backgroundColor: "#1f1f1f",
    color: TEXT,
    fontSize: "1.1rem",
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
  },
  estimate: {
    display: "flex",
    flexDirection: "column",
    gap: "0.15rem",
    backgroundColor: "rgba(15,159,234,0.08)",
    border: "1px solid rgba(15,159,234,0.2)",
    padding: "0.625rem 0.875rem",
    borderRadius: "0.5rem",
  },
  estimateLabel: { fontSize: "0.72rem", color: "#888", textTransform: "uppercase", letterSpacing: "0.06em" },
  estimateValue: { fontSize: "1.1rem", fontWeight: "700", color: BLUE },
  estimateNote: { fontSize: "0.7rem", color: "#555" },
  error: { color: "#ff6b6b", fontSize: "0.82rem", margin: 0 },
  actions: { display: "flex", gap: "0.75rem", marginTop: "0.75rem" },
  cancelBtn: {
    flex: 1, padding: "0.875rem", backgroundColor: "transparent",
    color: "#888", border: "1px solid #444", borderRadius: "0.5rem",
    fontSize: "1rem", fontWeight: "600", cursor: "pointer", fontFamily: "inherit",
  },
  buyBtn: {
    flex: 2, padding: "0.875rem", backgroundColor: GREEN,
    color: "#fff", border: "none", borderRadius: "0.5rem",
    fontSize: "1rem", fontWeight: "700", cursor: "pointer", fontFamily: "inherit",
  },
  btnDisabled: { opacity: 0.5, cursor: "not-allowed" },
};

export default BuyStock;