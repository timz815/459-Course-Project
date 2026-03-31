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
 * - Shows warning if isPendingUntilOpen — trade will queue until next market open
 * - On submit, pushes trade to queue and polls until executed
 * - Shows pending spinner while trade is in queue
 * - Navigates back to tournament detail on success with toast
 * - Stays on page and shows error on failure
 */

import { useContext, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import Header from "../components/Header";
import Button from "../components/UI/Button";
import { isPendingUntilOpen } from "../utils/marketHours";

function BuyStock() {
  const { id: tournamentId, symbol } = useParams();
  const { token } = useContext(AuthContext);
  const navigate = useNavigate();

  const [stock, setStock] = useState(null);
  const [participant, setParticipant] = useState(null);
  const [dollarAmount, setDollarAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [warningAcknowledged, setWarningAcknowledged] = useState(false);

  const pendingUntilOpen = isPendingUntilOpen();

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

        const tokenPayload = JSON.parse(atob(token.split(".")[1]));
        const myParticipant = participants.find(
          (p) => p.user?._id === tokenPayload.id || p.user === tokenPayload.id,
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

  async function pollUntilExecuted(queueId) {
    return new Promise((resolve) => {
      const interval = setInterval(async () => {
        try {
          const res = await fetch(
            `http://localhost:5000/api/tournaments/${tournamentId}/trades/queue`,
            { headers: { Authorization: token } },
          );
          const pending = await res.json();
          const stillPending = pending.some((t) => t._id === queueId);
          if (!stillPending) {
            clearInterval(interval);
            resolve();
          }
        } catch (err) {
          clearInterval(interval);
          resolve();
        }
      }, 1000);
    });
  }

  const amount = parseFloat(dollarAmount);
  const estimatedShares =
    stock?.price && amount > 0 ? (amount / stock.price).toFixed(1) : null;
  const cashBalance = participant?.cash_balance ?? 0;
  const isValid = amount > 0 && amount <= cashBalance;

  // If pendingUntilOpen, user must acknowledge warning first
  const canSubmit = isValid && (!pendingUntilOpen || warningAcknowledged);

  async function handleBuy() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch(
        `http://localhost:5000/api/tournaments/${tournamentId}/trades`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: token },
          body: JSON.stringify({
            symbol: symbol.toUpperCase(),
            side: "buy",
            dollar_amount: amount,
          }),
        },
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Failed to queue trade");
        setSubmitting(false);
        return;
      }

      setSubmitting(false);
      setPending(true);
      await pollUntilExecuted(data.queueId);

      const toastMsg = pendingUntilOpen
        ? `Buy order for ${symbol.toUpperCase()} queued — executes at next market open`
        : `Buy order for ${symbol.toUpperCase()} executed!`;

      navigate(`/tournaments/${tournamentId}`, { state: { toast: toastMsg } });
    } catch (err) {
      setError("Server error. Please try again.");
      setSubmitting(false);
      setPending(false);
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
                  <span style={styles.priceDisclaimer}>est.</span>
                </>
              ) : (
                <span style={styles.priceDisclaimer}>Price unavailable</span>
              )}
            </div>
          </header>

          <section style={styles.balanceSection}>
            <span style={styles.balanceLabel}>Available Cash</span>
            <span style={styles.balanceAmount}>
              ${cashBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          </section>

          {/* Market closed warning */}
          {pendingUntilOpen && (
            <aside style={styles.pendingWarning}>
              <p style={styles.pendingWarningTitle}>⚠ Market is currently closed</p>
              <p style={styles.pendingWarningText}>
                Your trade will be queued and executed at the next market open.
                The execution price may differ from the estimate shown.
              </p>
              <label style={styles.acknowledgeRow}>
                <input
                  type="checkbox"
                  checked={warningAcknowledged}
                  onChange={(e) => setWarningAcknowledged(e.target.checked)}
                  style={styles.acknowledgeCheckbox}
                />
                <span style={styles.acknowledgeLabel}>I understand my trade will execute at next market open</span>
              </label>
            </aside>
          )}

          {pending ? (
            <div style={styles.pendingState}>
              <div style={styles.spinner} />
              <p style={styles.pendingText}>
                {pendingUntilOpen ? "Trade queued..." : "Executing trade..."}
              </p>
              <p style={styles.pendingSubtext}>
                {pendingUntilOpen
                  ? "Your order will execute at next market open"
                  : "Fetching live price and processing your order"}
              </p>
            </div>
          ) : (
            <>
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

              {amount > cashBalance && amount > 0 && (
                <p style={styles.validationError}>
                  Amount exceeds your available cash balance
                </p>
              )}

              {estimatedShares && isValid && (
                <aside style={styles.estimatePreview}>
                  <span style={styles.estimateLabel}>Estimated shares</span>
                  <span style={styles.estimateValue}>~{estimatedShares} shares</span>
                  <span style={styles.estimateDisclaimer}>
                    Final amount calculated at execution price
                  </span>
                </aside>
              )}

              {error && <p style={styles.validationError}>{error}</p>}

              <footer style={styles.actionBar}>
                <Button
                  variant="cancel"
                  type="button"
                  onClick={() => navigate(`/tournaments/${tournamentId}`)}
                >
                  Cancel
                </Button>
                <Button
                  variant="tertiary"
                  type="button"
                  onClick={handleBuy}
                  disabled={!canSubmit || submitting}
                >
                  {submitting
                    ? "Queuing…"
                    : pendingUntilOpen
                    ? `Queue Buy ${stock.symbol}`
                    : `Buy ${stock.symbol}`}
                </Button>
              </footer>
            </>
          )}
        </article>
      </main>
    </div>
  );
}

const BLUE = "#0F9FEA";
const GREEN = "#00C076";
const ORANGE = "#FFA500";
const BG = "#1A1A1A";
const TEXT = "#F9F9F9";

const styles = {
  pageLayout: { minHeight: "100vh", backgroundColor: BG, fontFamily: "'Segoe UI', sans-serif" },
  mainContent: { display: "flex", justifyContent: "center", padding: "2.5rem 1.25rem" },
  statusMessage: { color: "#888", textAlign: "center", padding: "5rem" },
  purchaseCard: {
    width: "100%", maxWidth: "30rem", backgroundColor: "#2a2a2a",
    borderRadius: "1rem", padding: "2rem", border: "1px solid #333",
    boxShadow: "0 0.5rem 2rem rgba(0,0,0,0.4)",
    display: "flex", flexDirection: "column", gap: "0.75rem",
  },
  stockHeader: {
    display: "flex", justifyContent: "space-between",
    alignItems: "flex-start", marginBottom: "0.5rem",
  },
  stockSymbol: { margin: 0, fontSize: "1.6rem", fontWeight: "700", color: TEXT },
  companyName: { margin: "0.25rem 0 0", fontSize: "0.85rem", color: "#888" },
  priceDisplay: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.1rem" },
  priceLabel: { fontSize: "0.7rem", color: "#555", textTransform: "uppercase", letterSpacing: "0.06em" },
  priceAmount: { fontSize: "1.2rem", fontWeight: "700", color: TEXT },
  priceDisclaimer: { fontSize: "0.65rem", color: "#555" },
  balanceSection: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    backgroundColor: "#252525", padding: "0.625rem 0.875rem",
    borderRadius: "0.5rem", border: "1px solid #333",
  },
  balanceLabel: { fontSize: "0.82rem", color: "#888" },
  balanceAmount: { fontSize: "0.95rem", fontWeight: "700", color: GREEN },
  pendingWarning: {
    backgroundColor: "rgba(255,165,0,0.08)", border: "1px solid rgba(255,165,0,0.3)",
    borderRadius: "0.5rem", padding: "0.875rem 1rem",
    display: "flex", flexDirection: "column", gap: "0.5rem",
  },
  pendingWarningTitle: { margin: 0, fontSize: "0.85rem", fontWeight: "700", color: ORANGE },
  pendingWarningText: { margin: 0, fontSize: "0.8rem", color: "#aaa", lineHeight: 1.5 },
  acknowledgeRow: {
    display: "flex", alignItems: "flex-start", gap: "0.5rem", cursor: "pointer",
  },
  acknowledgeCheckbox: { marginTop: "0.1rem", cursor: "pointer", accentColor: ORANGE },
  acknowledgeLabel: { fontSize: "0.78rem", color: "#aaa", lineHeight: 1.4 },
  inputLabel: { fontSize: "0.82rem", fontWeight: "600", color: "#aaa", marginTop: "0.25rem" },
  amountInput: { position: "relative" },
  dollarSign: {
    position: "absolute", left: "0.875rem", top: "50%",
    transform: "translateY(-50%)", color: "#666", fontWeight: "600", pointerEvents: "none",
  },
  amountField: {
    width: "100%", padding: "0.75rem 1rem 0.75rem 1.75rem",
    borderRadius: "0.5rem", border: "1px solid #444", backgroundColor: "#1f1f1f",
    color: TEXT, fontSize: "1.1rem", outline: "none",
    boxSizing: "border-box", fontFamily: "inherit",
  },
  estimatePreview: {
    display: "flex", flexDirection: "column", gap: "0.15rem",
    backgroundColor: "rgba(15,159,234,0.08)", border: "1px solid rgba(15,159,234,0.2)",
    padding: "0.625rem 0.875rem", borderRadius: "0.5rem",
  },
  estimateLabel: { fontSize: "0.72rem", color: "#888", textTransform: "uppercase", letterSpacing: "0.06em" },
  estimateValue: { fontSize: "1.1rem", fontWeight: "700", color: BLUE },
  estimateDisclaimer: { fontSize: "0.7rem", color: "#555" },
  validationError: { color: "#ff6b6b", fontSize: "0.82rem", margin: 0 },
  actionBar: { display: "flex", gap: "0.75rem", marginTop: "0.75rem" },
  pendingState: {
    display: "flex", flexDirection: "column", alignItems: "center",
    gap: "0.75rem", padding: "2rem 1rem",
  },
  spinner: {
    width: "2.5rem", height: "2.5rem", border: "3px solid #333",
    borderTop: `3px solid ${GREEN}`, borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  pendingText: { margin: 0, color: TEXT, fontWeight: "600", fontSize: "1rem" },
  pendingSubtext: { margin: 0, color: "#888", fontSize: "0.82rem", textAlign: "center" },
};

const styleSheet = document.createElement("style");
styleSheet.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
document.head.appendChild(styleSheet);

export default BuyStock;