/**
 * SellStock Page
 *
 * Allows a tournament participant to sell a stock they own by entering a dollar amount.
 *
 * Key behaviours:
 * - Reads tournamentId and symbol from URL params
 * - Fetches participant data to show holding info (shares, amount_invested)
 * - Fetches cached EOD price for estimated shares display only
 * - Updates estimated shares in real-time as user types dollar amount
 * - No frontend cap on dollar amount — backend validates against actual shares held
 * - On submit, pushes trade to queue and polls until executed
 * - Shows pending spinner while trade is in queue
 * - Navigates back to tournament detail on success with toast
 * - Stays on page and shows error on failure
 */

import { useContext, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import Header from "../components/Header";
import TradeConfirmModal from "../components/TradeConfirmModal";
import { isPendingUntilOpen } from "../utils/marketHours";
import "../styles/SellStock.css";

function SellStock() {
  const { id: tournamentId, symbol } = useParams();
  const { token } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const [stock, setStock] = useState(null);
  const [holding, setHolding] = useState(null);
  const [dollarAmount, setDollarAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [warningAcknowledged] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const pendingUntilOpen = isPendingUntilOpen();
  const returnToStockDetail =
    location.state?.returnTo || `/stocks/${symbol.toUpperCase()}`;

  useEffect(() => {
    async function fetchData() {
      try {
        const [stockRes, participantsRes] = await Promise.all([
          fetch(`http://localhost:5000/api/stocks`),
          fetch(
            `http://localhost:5000/api/tournaments/${tournamentId}/participants`,
          ),
        ]);
        const stocks = await stockRes.json();
        const participants = await participantsRes.json();

        const found = stocks.find((s) => s.symbol === symbol.toUpperCase());
        setStock(found || null);

        const tokenPayload = JSON.parse(atob(token.split(".")[1]));
        const myParticipant = participants.find(
          (p) => p.user?._id === tokenPayload.id || p.user === tokenPayload.id,
        );

        if (myParticipant) {
          const myHolding = myParticipant.holdings?.find(
            (h) => h.symbol === symbol.toUpperCase(),
          );
          setHolding(myHolding || null);
        }
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
  const isValid = amount > 0;
  const canSubmit = isValid && (!pendingUntilOpen || warningAcknowledged);

  async function handleSell() {
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
            side: "sell",
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

      // Trade executed — navigate back with toast
      navigate(`/tournaments/${tournamentId}`, {
        state: { toast: `Sell order for ${symbol.toUpperCase()} executed!` },
      });
    } catch (err) {
      setError("Server error. Please try again.");
      setSubmitting(false);
      setPending(false);
    }
  }

  if (loading) {
    return (
      <div className="sell-stock-page">
        <Header />
        <main className="sell-stock-main">
          <p className="sell-stock-status ds-type-body-2">Loading...</p>
        </main>
      </div>
    );
  }

  if (!stock || !holding) {
    return (
      <div className="sell-stock-page">
        <Header />
        <main className="sell-stock-main">
          <p className="sell-stock-status ds-type-body-2">
            {!stock
              ? "Stock not found."
              : `You don't own any ${symbol.toUpperCase()} in this tournament.`}
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="sell-stock-page">
      <Header />
      <main className="sell-stock-main">
        <article className="sell-stock-card">
          {/* Red accent bar */}
          <div className="sell-stock-accent-bar" />

          <div className="sell-stock-body">
            {/* Stock identity header */}
            <header className="sell-stock-header">
              <div>
                <span className="sell-stock-upper-label">
                  Position to liquidate
                </span>
                <div className="sell-stock-heading-row">
                  <h1 className="sell-stock-ticker">${stock.symbol}</h1>
                  <span className="sell-stock-company">{stock.name}</span>
                </div>
              </div>
              <div className="sell-stock-price-section">
                <span className="sell-stock-upper-label">Current Price</span>
                {stock.price ? (
                  <span className="sell-stock-price-value">
                    ${stock.price.toFixed(2)}
                  </span>
                ) : (
                  <span className="sell-stock-price-note">Unavailable</span>
                )}
              </div>
            </header>

            {/* Asset data grid */}
            <div className="sell-stock-grid">
              <div className="sell-stock-stat-box">
                <span className="sell-stock-stat-label">Total Shares Held</span>
                <span className="sell-stock-stat-value sell-stock-stat-value--highlight">
                  {holding.shares}
                </span>
              </div>
              <div className="sell-stock-stat-box">
                <span className="sell-stock-stat-label">Amount Invested</span>
                <span className="sell-stock-stat-value">
                  $
                  {holding.amount_invested.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>

            {/* Pending state */}
            {pending ? (
              <div className="sell-stock-pending">
                <div className="sell-stock-spinner" />
                <p className="sell-stock-pending-text">Executing trade...</p>
                <p className="sell-stock-pending-subtext">
                  Fetching live price and processing your order
                </p>
              </div>
            ) : (
              <>
                {/* Amount input */}
                <div className="sell-stock-input-section">
                  <label
                    htmlFor="dollar_amount"
                    className="sell-stock-input-label"
                  >
                    Amount to Sell
                  </label>
                  <div className="sell-stock-input-wrap">
                    <span className="sell-stock-input-dollar">$</span>
                    <input
                      id="dollar_amount"
                      className="sell-stock-input-field"
                      type="number"
                      min="0"
                      step="100"
                      placeholder="100,000"
                      value={dollarAmount}
                      onChange={(e) => setDollarAmount(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div className="sell-stock-helper">
                    <span className="sell-stock-helper-label">
                      Estimated Shares
                    </span>
                    <span className="sell-stock-helper-value">
                      {estimatedShares && isValid
                        ? `~ ${estimatedShares} SHARES`
                        : "— 0.000 SHARES"}
                    </span>
                  </div>
                </div>

                {/* Summary panel */}
                <div className="sell-stock-summary">
                  <div className="sell-stock-summary-row">
                    <span className="sell-stock-summary-label">
                      Fee Estimate
                    </span>
                    <span className="sell-stock-summary-value">$0.00</span>
                  </div>
                  <div className="sell-stock-summary-row">
                    <span className="sell-stock-summary-label">
                      Tax Implication
                    </span>
                    <span className="sell-stock-summary-value">
                      None (Paper Account)
                    </span>
                  </div>
                  <div className="sell-stock-summary-divider" />
                  <div className="sell-stock-summary-row">
                    <span className="sell-stock-summary-total-label">
                      Liquidation Value
                    </span>
                    <span className="sell-stock-summary-total-value">
                      {isValid
                        ? `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                        : "$0.00"}
                    </span>
                  </div>
                </div>

                {/* Error display */}
                {error && <p className="sell-stock-error">{error}</p>}

                {/* Action buttons */}
                <div className="sell-stock-actions">
                  <button
                    type="button"
                    className="sell-stock-btn-cancel"
                    onClick={() => navigate(returnToStockDetail)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="sell-stock-btn-sell"
                    onClick={() => setShowConfirm(true)}
                    disabled={!canSubmit || submitting}
                  >
                    Sell Stock
                  </button>
                </div>
              </>
            )}
          </div>
        </article>
      </main>

      {showConfirm && (
        <TradeConfirmModal
          side="sell"
          symbol={stock.symbol}
          companyName={stock.name}
          price={stock.price}
          amount={amount}
          shares={estimatedShares || "0.000"}
          onConfirm={() => {
            setShowConfirm(false);
            handleSell();
          }}
          onCancel={() => setShowConfirm(false)}
          submitting={submitting}
        />
      )}
    </div>
  );
}

export default SellStock;
