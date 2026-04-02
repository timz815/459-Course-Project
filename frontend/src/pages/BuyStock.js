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
import "../styles/BuyStock.css";

function BuyStock() {
  const { id: tournamentId, symbol } = useParams();
  const { token } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const [stock, setStock] = useState(null);
  const [participant, setParticipant] = useState(null);
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
  const canSubmit = isValid && (!pendingUntilOpen || warningAcknowledged);

  // Submit trade to queue
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

      // Trade executed — navigate back with toast
      navigate(`/tournaments/${tournamentId}`, {
        state: { toast: `Buy order for ${symbol.toUpperCase()} executed!` },
      });
    } catch (err) {
      setError("Server error. Please try again.");
      setSubmitting(false);
      setPending(false);
    }
  }

  if (loading) {
    return (
      <div className="buy-stock-page">
        <Header />
        <main className="buy-stock-main">
          <p className="buy-stock-status ds-type-body-2">Loading...</p>
        </main>
      </div>
    );
  }

  if (!stock) {
    return (
      <div className="buy-stock-page">
        <Header />
        <main className="buy-stock-main">
          <p className="buy-stock-status ds-type-body-2">Stock not found.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="buy-stock-page">
      <Header />
      <main className="buy-stock-main">
        <article className="buy-stock-card">
          {/* Stock identity header */}
          <header className="buy-stock-header">
            <div>
              <span className="buy-stock-upper-label">
                Position to Accumulate
              </span>
              <div className="buy-stock-heading-row">
                <h1 className="buy-stock-ticker">{stock.symbol}</h1>
                <span className="buy-stock-company">{stock.name}</span>
              </div>
            </div>
            <div className="buy-stock-price-section">
              <span className="buy-stock-upper-label">Current Price</span>
              {stock.price ? (
                <span className="buy-stock-price-value">
                  ${stock.price.toFixed(2)}
                </span>
              ) : (
                <span className="buy-stock-price-note">Unavailable</span>
              )}
            </div>
          </header>

          {/* Available cash balance */}
          <div className="buy-stock-balance">
            <span className="buy-stock-balance-label">Available Cash</span>
            <span className="buy-stock-balance-value">
              $
              {cashBalance.toLocaleString("en-US", {
                minimumFractionDigits: 2,
              })}
            </span>
          </div>

          {/* Pending state */}
          {pending ? (
            <div className="buy-stock-pending">
              <div className="buy-stock-spinner" />
              <p className="buy-stock-pending-text">Executing trade...</p>
              <p className="buy-stock-pending-subtext">
                Fetching live price and processing your order
              </p>
            </div>
          ) : (
            <div className="buy-stock-form">
              {/* Order amount input */}
              <div className="buy-stock-input-section">
                <label
                  htmlFor="dollar_amount"
                  className="buy-stock-input-label"
                >
                  Order Amount
                </label>
                <div className="buy-stock-input-wrap">
                  <span className="buy-stock-input-dollar">$</span>
                  <input
                    id="dollar_amount"
                    className="buy-stock-input-field"
                    type="number"
                    min="0"
                    step="100"
                    placeholder="100,000"
                    value={dollarAmount}
                    onChange={(e) => setDollarAmount(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="buy-stock-helper">
                  <span className="buy-stock-helper-text">
                    {estimatedShares && isValid
                      ? `Est. ${estimatedShares} shares`
                      : "\u00A0"}
                  </span>
                </div>
              </div>

              {/* Percentage quick-pick buttons */}
              <div className="buy-stock-pct-row">
                {[25, 50, 75].map((pct) => {
                  const pctAmount = Math.floor(cashBalance * (pct / 100));
                  return (
                    <button
                      key={pct}
                      type="button"
                      className={`buy-stock-pct-btn${amount === pctAmount ? " buy-stock-pct-btn--active" : ""}`}
                      onClick={() => setDollarAmount(String(pctAmount))}
                    >
                      {pct}%
                    </button>
                  );
                })}
                <button
                  type="button"
                  className={`buy-stock-pct-btn${amount === Math.floor(cashBalance) ? " buy-stock-pct-btn--active" : ""}`}
                  onClick={() =>
                    setDollarAmount(String(Math.floor(cashBalance)))
                  }
                >
                  Max
                </button>
              </div>

              {/* Over-balance warning */}
              {amount > cashBalance && amount > 0 && (
                <p className="buy-stock-error">
                  Amount exceeds your available cash balance
                </p>
              )}

              {/* Server error display */}
              {error && <p className="buy-stock-error">{error}</p>}

              {/* Action buttons */}
              <div className="buy-stock-actions">
                <button
                  type="button"
                  className="buy-stock-btn-cancel"
                  onClick={() => navigate(returnToStockDetail)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="buy-stock-btn-buy"
                  onClick={() => setShowConfirm(true)}
                  disabled={!canSubmit || submitting}
                >
                  {`Buy ${stock.symbol}`}
                </button>
              </div>
            </div>
          )}
        </article>
      </main>

      {showConfirm && (
        <TradeConfirmModal
          side="buy"
          symbol={stock.symbol}
          companyName={stock.name}
          price={stock.price}
          amount={amount}
          shares={estimatedShares || "0.000"}
          onConfirm={() => {
            setShowConfirm(false);
            handleBuy();
          }}
          onCancel={() => setShowConfirm(false)}
          submitting={submitting}
        />
      )}
    </div>
  );
}

export default BuyStock;
