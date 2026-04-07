import { useRef } from "react";
import "../styles/TradeConfirmModal.css";

function formatCurrency(n) {
  if (!Number.isFinite(n)) return "$0.00";
  return (
    "$" +
    n.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

/**
 * TradeConfirmModal
 *
 * Props:
 *   side        — "buy" | "sell"
 *   symbol      — e.g. "NVDA"
 *   companyName — e.g. "NVIDIA Corp"
 *   price       — current stock price (number)
 *   amount      — dollar amount of the trade (number)
 *   shares      — estimated shares (string, e.g. "7.014")
 *   onConfirm   — called when user clicks confirm
 *   onCancel    — called when user clicks cancel or overlay
 *   submitting  — if true, disable confirm button
 *   warnings    — optional array of { type: "error" | "info", message: string }
 *                 "error" warnings block confirm; "info" warnings are informational only
 */
function TradeConfirmModal({
  side,
  symbol,
  companyName,
  price,
  amount,
  shares,
  onConfirm,
  onCancel,
  submitting,
  warnings = [],
}) {
  const overlayRef = useRef(null);
  const isBuy = side === "buy";
  const hasBlockingWarning = warnings.some((w) => w.type === "error");

  function handleOverlayClick(e) {
    if (e.target === overlayRef.current) onCancel();
  }

  return (
    <div className="tcm-overlay" ref={overlayRef} onClick={handleOverlayClick}>
      <div
        className={`tcm-modal ${isBuy ? "tcm-modal--buy" : "tcm-modal--sell"}`}
      >
        {/* Header */}
        <h2 className="tcm-title">
          {isBuy ? "Confirm Buy Order" : "Confirm Sell Order"}
        </h2>
        <p className="tcm-subtitle">Review your transaction before execution</p>

        {/* Stock identity card */}
        <div className="tcm-stock-card">
          <div className="tcm-stock-left">
            <span className="tcm-stock-symbol">{symbol}</span>
            <span className="tcm-stock-name">{companyName}</span>
          </div>
          <div className="tcm-stock-right">
            {isBuy && (
              <span className="tcm-stock-price-label">Current Price</span>
            )}
            <span className="tcm-stock-price">{formatCurrency(price)}</span>
          </div>
        </div>

        {/* Detail rows */}
        <div className="tcm-details">
          <div className="tcm-detail-row">
            <span className="tcm-detail-label">
              {isBuy ? "Amount to Invest" : "Shares to Sell"}
            </span>
            <span className="tcm-detail-value">
              {isBuy ? formatCurrency(amount) : shares}
            </span>
          </div>
          <div className="tcm-detail-row">
            <span className="tcm-detail-label">
              {isBuy ? "Estimated Shares" : "Estimated Proceeds"}
            </span>
            <span className="tcm-detail-value">
              {isBuy ? `${shares} shares` : formatCurrency(amount)}
            </span>
          </div>
          <div className="tcm-detail-row">
            <span className="tcm-detail-label">Transaction Fee</span>
            <span
              className={`tcm-detail-value tcm-detail-value--fee${isBuy ? "" : " tcm-detail-value--sell-fee"}`}
            >
              {isBuy ? "$0.00 (Paper Account)" : "Paper Account ($0.00)"}
            </span>
          </div>
        </div>

        {/* Total */}
        {isBuy ? (
          <div className="tcm-total-row">
            <span className="tcm-total-label">Total Cost</span>
            <span className="tcm-total-value tcm-total-value--buy">
              {formatCurrency(amount)}
            </span>
          </div>
        ) : (
          <div className="tcm-total-box">
            <span className="tcm-total-box-label">Total Liquidation Value</span>
            <span className="tcm-total-box-value">
              {formatCurrency(amount)}
            </span>
          </div>
        )}

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="tcm-warnings">
            {warnings.map((w, i) => (
              <p key={i} className={`tcm-warning tcm-warning--${w.type}`}>
                {w.message}
              </p>
            ))}
          </div>
        )}

        {/* Confirm button */}
        <button
          type="button"
          className={`tcm-confirm-btn ${isBuy ? "tcm-confirm-btn--buy" : "tcm-confirm-btn--sell"}`}
          onClick={onConfirm}
          disabled={submitting || hasBlockingWarning}
        >
          {submitting
            ? "Processing\u2026"
            : isBuy
              ? "Confirm & Submit"
              : "Confirm & Sell"}
        </button>

        {/* Cancel link */}
        <button type="button" className="tcm-cancel-link" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export default TradeConfirmModal;
