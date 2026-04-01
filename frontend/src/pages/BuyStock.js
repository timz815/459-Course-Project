/**
 * BuyStock Page
 *
 * Allows a tournament participant to buy a stock by entering a dollar amount.
 */

import { useContext, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import Header from "../components/Header";
import Button from "../components/UI/Button";
import Input from "../components/UI/Input";
import "../styles/BuyStock.css";

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
          const pendingTrades = await res.json();
          const stillPending = pendingTrades.some((t) => t._id === queueId);

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
          <header className="buy-stock-header">
            <div>
              <h1 className="buy-stock-symbol ds-type-title-m">
                Buy {stock.symbol}
              </h1>
              <p className="buy-stock-name ds-type-body-2">{stock.name}</p>
            </div>
            <div className="buy-stock-price">
              {stock.price ? (
                <>
                  <span className="buy-stock-price-label ds-type-label">
                    ~Price
                  </span>
                  <span className="buy-stock-price-value">
                    ${stock.price.toFixed(2)}
                  </span>
                  <span className="buy-stock-price-note">EOD est.</span>
                </>
              ) : (
                <span className="buy-stock-price-note">Price unavailable</span>
              )}
            </div>
          </header>

          <section className="buy-stock-balance">
            <span className="buy-stock-balance-label ds-type-body-2">
              Available Cash
            </span>
            <span className="buy-stock-balance-value">
              $
              {cashBalance.toLocaleString("en-US", {
                minimumFractionDigits: 2,
              })}
            </span>
          </section>

          {pending ? (
            <div className="buy-stock-pending">
              <div className="buy-stock-spinner" />
              <p className="buy-stock-pending-text ds-type-subtitle-l">
                Executing trade...
              </p>
              <p className="buy-stock-pending-subtext ds-type-body-2">
                Fetching live price and processing your order
              </p>
            </div>
          ) : (
            <>
              <Input
                label="Amount to Invest"
                id="dollar_amount"
                type="number"
                min="0"
                step="100"
                placeholder="0.00"
                value={dollarAmount}
                onChange={(e) => setDollarAmount(e.target.value)}
                inputClassName="buy-stock-amount"
                autoFocus
              />

              {amount > cashBalance && amount > 0 && (
                <p className="buy-stock-error ds-type-body-2">
                  Amount exceeds your available cash balance
                </p>
              )}

              {estimatedShares && isValid && (
                <aside className="buy-stock-estimate">
                  <span className="buy-stock-estimate-label ds-type-label">
                    Estimated shares
                  </span>
                  <span className="buy-stock-estimate-value">
                    ~{estimatedShares} shares
                  </span>
                  <span className="buy-stock-estimate-note">
                    Final amount calculated at execution price
                  </span>
                </aside>
              )}

              {error && (
                <p className="buy-stock-error ds-type-body-2">{error}</p>
              )}

              <footer className="buy-stock-actions">
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
                  disabled={!isValid || submitting}
                >
                  {submitting ? "Queuing..." : `Buy ${stock.symbol}`}
                </Button>
              </footer>
            </>
          )}
        </article>
      </main>
    </div>
  );
}

export default BuyStock;
