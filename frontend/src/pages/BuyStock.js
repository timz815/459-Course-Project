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

// Fetch stock info and participant data on mount
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

      // Match participant to current user via token payload
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

// Calculate estimated shares from cached price
const amount = parseFloat(dollarAmount);
const estimatedShares =
  stock?.price && amount > 0
    ? (amount / stock.price).toFixed(1)
    : null;

const cashBalance = participant?.cash_balance ?? 0;
const isValid = amount > 0 && amount <= cashBalance;

// Execute buy trade via API
async function handleBuy() {
  if (!isValid) return;
  setSubmitting(true);
  setError("");

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
    <div style={styles.pageLayout}>
      <Header />
      <main style={styles.mainContent}>
        <p style={styles.statusMessage}>Loading...</p>
      </main>
    </div>
  );
}

if (!stock) {
  return (
    <div style={styles.pageLayout}>
      <Header />
      <main style={styles.mainContent}>
        <p style={styles.statusMessage}>Stock not found.</p>
      </main>
    </div>
  );
}

return (
  <div style={styles.pageLayout}>
    <Header />
    <main style={styles.mainContent}>
      <article style={styles.purchaseCard}>

        {/* Stock header with price */}
        <header style={styles.stockHeader}>
          <div>
            <h1 style={styles.stockSymbol}>Buy {stock.symbol}</h1>
            <p style={styles.companyName}>{stock.name}</p>
          </div>
          <div style={styles.priceDisplay}>
            {stock.price ? (
              <>
                <span style={styles.priceLabel}>~Price</span>
                <span style={styles.priceAmount}>${stock.price.toFixed(2)}</span>
                <span style={styles.priceDisclaimer}>EOD est.</span>
              </>
            ) : (
              <span style={styles.priceDisclaimer}>Price unavailable</span>
            )}
          </div>
        </header>

        {/* Available cash balance */}
        <section style={styles.balanceSection}>
          <span style={styles.balanceLabel}>Available Cash</span>
          <span style={styles.balanceAmount}>
            ${cashBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </span>
        </section>

        {/* Investment amount input */}
        <label htmlFor="dollar_amount" style={styles.inputLabel}>
          Amount to Invest
        </label>
        <div style={styles.amountInput}>
          <span style={styles.dollarSign}>$</span>
          <input
            id="dollar_amount"
            type="number"
            min="0"
            step="100"
            placeholder="0.00"
            value={dollarAmount}
            onChange={(e) => setDollarAmount(e.target.value)}
            style={styles.amountField}
            autoFocus
          />
        </div>

        {/* Validation feedback */}
        {amount > cashBalance && amount > 0 && (
          <p style={styles.validationError}>Amount exceeds your available cash balance</p>
        )}

        {/* Shares estimate preview */}
        {estimatedShares && isValid && (
          <aside style={styles.estimatePreview}>
            <span style={styles.estimateLabel}>Estimated shares</span>
            <span style={styles.estimateValue}>~{estimatedShares} shares</span>
            <span style={styles.estimateDisclaimer}>Final amount calculated at execution price</span>
          </aside>
        )}

        {/* Server error display */}
        {error && <p style={styles.validationError}>{error}</p>}

        {/* Action buttons */}
        <footer style={styles.actionBar}>
          <button
            type="button"
            style={styles.secondaryButton}
            onClick={() => navigate(`/tournaments/${tournamentId}`)}
          >
            Cancel
          </button>
          <button
            type="button"
            style={{
              ...styles.primaryButton,
              ...(!isValid || submitting ? styles.buttonDisabled : {}),
            }}
            onClick={handleBuy}
            disabled={!isValid || submitting}
          >
            {submitting ? "Buying…" : `Buy ${stock.symbol}`}
          </button>
        </footer>

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
pageLayout: { minHeight: "100vh", backgroundColor: BG, fontFamily: "'Segoe UI', sans-serif" },
mainContent: { display: "flex", justifyContent: "center", padding: "2.5rem 1.25rem" },
statusMessage: { color: "#888", textAlign: "center", padding: "5rem" },
purchaseCard: {
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
stockHeader: {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: "0.5rem",
},
stockSymbol: { margin: 0, fontSize: "1.6rem", fontWeight: "700", color: TEXT },
companyName: { margin: "0.25rem 0 0", fontSize: "0.85rem", color: "#888" },
priceDisplay: {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
  gap: "0.1rem",
},
priceLabel: { fontSize: "0.7rem", color: "#555", textTransform: "uppercase", letterSpacing: "0.06em" },
priceAmount: { fontSize: "1.2rem", fontWeight: "700", color: TEXT },
priceDisclaimer: { fontSize: "0.65rem", color: "#555" },
balanceSection: {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  backgroundColor: "#252525",
  padding: "0.625rem 0.875rem",
  borderRadius: "0.5rem",
  border: "1px solid #333",
},
balanceLabel: { fontSize: "0.82rem", color: "#888" },
balanceAmount: { fontSize: "0.95rem", fontWeight: "700", color: GREEN },
inputLabel: { fontSize: "0.82rem", fontWeight: "600", color: "#aaa", marginTop: "0.25rem" },
amountInput: { position: "relative" },
dollarSign: {
  position: "absolute", left: "0.875rem", top: "50%",
  transform: "translateY(-50%)", color: "#666", fontWeight: "600", pointerEvents: "none",
},
amountField: {
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
estimatePreview: {
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
estimateDisclaimer: { fontSize: "0.7rem", color: "#555" },
validationError: { color: "#ff6b6b", fontSize: "0.82rem", margin: 0 },
actionBar: { display: "flex", gap: "0.75rem", marginTop: "0.75rem" },
secondaryButton: {
  flex: 1, padding: "0.875rem", backgroundColor: "transparent",
  color: "#888", border: "1px solid #444", borderRadius: "0.5rem",
  fontSize: "1rem", fontWeight: "600", cursor: "pointer", fontFamily: "inherit",
},
primaryButton: {
  flex: 2, padding: "0.875rem", backgroundColor: GREEN,
  color: "#fff", border: "none", borderRadius: "0.5rem",
  fontSize: "1rem", fontWeight: "700", cursor: "pointer", fontFamily: "inherit",
},
buttonDisabled: { opacity: 0.5, cursor: "not-allowed" },
};

export default BuyStock;