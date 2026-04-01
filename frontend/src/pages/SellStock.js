/**
 * SellStock Page
 *
 * Allows a tournament participant to sell a stock they own by entering a dollar amount.
 */

import { useContext, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import Header from "../components/Header";
import Button from "../components/UI/Button";
import Input from "../components/UI/Input";
import "../styles/SellStock.css";

function SellStock() {
  const { id: tournamentId, symbol } = useParams();
  const { token } = useContext(AuthContext);
  const navigate = useNavigate();

  const [stock, setStock] = useState(null);
  const [holding, setHolding] = useState(null);
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
  const isValid = amount > 0;

  async function handleSell() {
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
          <header className="sell-stock-header">
            <div>
              <h1 className="sell-stock-symbol ds-type-title-m">
                Sell {stock.symbol}
              </h1>
              <p className="sell-stock-name ds-type-body-2">{stock.name}</p>
            </div>
            <div className="sell-stock-price">
              {stock.price ? (
                <>
                  <span className="sell-stock-price-label ds-type-label">
                    ~Price
                  </span>
                  <span className="sell-stock-price-value">
                    ${stock.price.toFixed(2)}
                  </span>
                  <span className="sell-stock-price-note">EOD est.</span>
                </>
              ) : (
                <span className="sell-stock-price-note">Price unavailable</span>
              )}
            </div>
          </header>

          <section className="sell-stock-position">
            <div className="sell-stock-position-detail">
              <span className="sell-stock-position-metric ds-type-label">
                Shares Held
              </span>
              <span className="sell-stock-position-value">
                {holding.shares}
              </span>
            </div>
            <div className="sell-stock-position-divider" />
            <div className="sell-stock-position-detail">
              <span className="sell-stock-position-metric ds-type-label">
                Amount Invested
              </span>
              <span className="sell-stock-position-value">
                $
                {holding.amount_invested.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
          </section>

          {pending ? (
            <div className="sell-stock-pending">
              <div className="sell-stock-spinner" />
              <p className="sell-stock-pending-text ds-type-subtitle-l">
                Executing trade...
              </p>
              <p className="sell-stock-pending-subtext ds-type-body-2">
                Fetching live price and processing your order
              </p>
            </div>
          ) : (
            <>
              <Input
                label="Amount to Sell"
                id="dollar_amount"
                type="number"
                min="0"
                step="100"
                placeholder="0.00"
                value={dollarAmount}
                onChange={(e) => setDollarAmount(e.target.value)}
                inputClassName="sell-stock-amount"
                autoFocus
              />

              {estimatedShares && isValid && (
                <aside className="sell-stock-estimate">
                  <span className="sell-stock-estimate-label ds-type-label">
                    Estimated shares to sell
                  </span>
                  <span className="sell-stock-estimate-value">
                    ~{estimatedShares} shares
                  </span>
                  <span className="sell-stock-estimate-note">
                    Final amount calculated at execution price
                  </span>
                </aside>
              )}

              {error && (
                <p className="sell-stock-error ds-type-body-2">{error}</p>
              )}

              <footer className="sell-stock-actions">
                <Button
                  variant="cancel"
                  type="button"
                  onClick={() => navigate(`/tournaments/${tournamentId}`)}
                >
                  Cancel
                </Button>
                <Button
                  variant="cancel"
                  type="button"
                  onClick={handleSell}
                  disabled={!isValid || submitting}
                >
                  {submitting ? "Queuing..." : `Sell ${stock.symbol}`}
                </Button>
              </footer>
            </>
          )}
        </article>
      </main>
    </div>
  );
}

export default SellStock;
