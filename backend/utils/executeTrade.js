/**
 * executeTrade Utility
 *
 * Core trade execution logic called by the price queue system.
 *
 * Key behaviours:
 * - Validates tournament, participant, and stock exist
 * - If isPendingUntilOpen (weekend, Friday after close, Monday pre-market,
 *   holiday) → returns pending, trade stays in queue
 * - Weekday during or outside market hours → fetches live price from Finnhub
 *   falls back to previousClose if Finnhub returns null
 * - Handles buy and sell logic including balance and holdings updates
 * - Creates a Trade record on success
 * - Returns a result object — never throws to the caller
 * - No HTTP dependencies (no req/res) — pure business logic
 */

const Tournament = require("../models/Tournament");
const Participant = require("../models/Participant");
const Trade = require("../models/Trade");
const Stock = require("../models/Stock");
const { isPendingUntilOpen } = require("./marketHours");

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
const FINNHUB_BASE = "https://finnhub.io/api/v1";

function normalizeHoldings(holdings) {
  const merged = new Map();

  for (const holding of holdings || []) {
    const symbol = holding?.symbol?.toUpperCase?.();
    if (!symbol) continue;

    const existing = merged.get(symbol);
    if (existing) {
      existing.shares = parseFloat(
        ((existing.shares || 0) + (holding.shares || 0)).toFixed(1),
      );
      existing.amount_invested = parseFloat(
        (
          (existing.amount_invested || 0) + (holding.amount_invested || 0)
        ).toFixed(2),
      );
    } else {
      merged.set(symbol, {
        symbol,
        shares: parseFloat(((holding.shares || 0) * 1).toFixed(1)),
        amount_invested: parseFloat(
          ((holding.amount_invested || 0) * 1).toFixed(2),
        ),
      });
    }
  }

  return Array.from(merged.values()).filter((holding) => holding.shares > 0);
}

/**
 * Fetches the current live price for a symbol from Finnhub.
 * Returns null on failure — never throws.
 */
async function fetchLivePrice(symbol) {
  try {
    const url = `${FINNHUB_BASE}/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok || !data.c || data.c === 0) return null;
    return data.c;
  } catch (err) {
    console.error(
      `[executeTrade] Finnhub fetch failed for ${symbol}:`,
      err.message,
    );
    return null;
  }
}

/**
 * Executes a buy or sell trade for a tournament participant.
 *
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.tournamentId
 * @param {string} params.symbol
 * @param {string} params.side
 * @param {number} params.dollar_amount
 *
 * @returns {Promise<{
 *   success: boolean,
 *   pending?: boolean,
 *   message: string,
 *   trade?: object,
 *   new_cash_balance?: number,
 *   holdings?: array
 * }>}
 */
async function executeTrade({
  userId,
  tournamentId,
  symbol,
  side,
  dollar_amount,
}) {
  try {
    // Hold pending over weekend, holidays, Friday after close, Monday pre-market
    if (isPendingUntilOpen()) {
      return {
        success: false,
        pending: true,
        message: "Market is closed — trade will execute at next market open",
      };
    }

    // Validate dollar amount
    const amount = parseFloat(dollar_amount);
    if (isNaN(amount) || amount <= 0) {
      return {
        success: false,
        message: "dollar_amount must be a positive number",
      };
    }

    // Validate side
    if (!["buy", "sell"].includes(side)) {
      return { success: false, message: "side must be 'buy' or 'sell'" };
    }

    // Verify tournament exists and is tradeable
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      return { success: false, message: "Tournament not found" };
    }
    if (tournament.status !== "active" && tournament.status !== "open") {
      return {
        success: false,
        message: "Trading is only allowed in active tournaments",
      };
    }

    // Verify user is a participant
    const participant = await Participant.findOne({
      tournament: tournamentId,
      user: userId,
    });
    if (!participant) {
      return {
        success: false,
        message: "You must join this tournament before trading",
      };
    }

    participant.holdings = normalizeHoldings(participant.holdings);

    // Verify stock exists in universe
    const stock = await Stock.findOne({ symbol: symbol.toUpperCase() });
    if (!stock) {
      return {
        success: false,
        message: `${symbol.toUpperCase()} is not available in this tournament`,
      };
    }

    // Get execution price — live price during market hours
    // falls back to previousClose for weekday after hours
    let executionPrice = await fetchLivePrice(symbol.toUpperCase());
    let usedPreviousClose = false;

    if (!executionPrice) {
      if (stock.previousClose) {
        executionPrice = stock.previousClose;
        usedPreviousClose = true;
        console.log(
          `[executeTrade] Using previousClose for ${symbol}: $${executionPrice}`,
        );
      } else {
        return {
          success: false,
          message: `Could not fetch price for ${symbol.toUpperCase()}. Please try again.`,
        };
      }
    }

    // Calculate shares from dollar amount
    const shares = parseFloat((amount / executionPrice).toFixed(1));
    if (shares <= 0) {
      return {
        success: false,
        message: "Dollar amount too small to purchase any shares",
      };
    }

    // Locate existing position for this symbol
    const holdingIndex = participant.holdings.findIndex(
      (h) => h.symbol === symbol.toUpperCase(),
    );

    if (side === "buy") {
      if (participant.cash_balance < amount) {
        return {
          success: false,
          message: `Insufficient funds. You have $${participant.cash_balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}, need $${amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
        };
      }

      participant.cash_balance = parseFloat(
        (participant.cash_balance - amount).toFixed(2),
      );

      if (holdingIndex >= 0) {
        participant.holdings[holdingIndex].shares = parseFloat(
          (participant.holdings[holdingIndex].shares + shares).toFixed(1),
        );
        participant.holdings[holdingIndex].amount_invested = parseFloat(
          (participant.holdings[holdingIndex].amount_invested + amount).toFixed(
            2,
          ),
        );
      } else {
        participant.holdings.push({
          symbol: symbol.toUpperCase(),
          shares,
          amount_invested: amount,
        });
      }
    } else {
      if (holdingIndex < 0) {
        return {
          success: false,
          message: `You don't own any shares of ${symbol.toUpperCase()}`,
        };
      }

      const holding = participant.holdings[holdingIndex];

      if (shares > holding.shares) {
        return {
          success: false,
          message: `Insufficient shares. You hold ${holding.shares} share(s) of ${symbol.toUpperCase()}, this sell requires ${shares}`,
        };
      }

      participant.cash_balance = parseFloat(
        (participant.cash_balance + amount).toFixed(2),
      );

      const newShares = parseFloat((holding.shares - shares).toFixed(1));
      const newAmountInvested = parseFloat(
        (holding.amount_invested - amount).toFixed(2),
      );

      if (newShares <= 0) {
        participant.holdings.splice(holdingIndex, 1);
      } else {
        participant.holdings[holdingIndex].shares = newShares;
        participant.holdings[holdingIndex].amount_invested = Math.max(
          0,
          newAmountInvested,
        );
      }
    }

    participant.markModified("holdings");
    await participant.save();

    const trade = new Trade({
      tournament: tournamentId,
      user: userId,
      symbol: symbol.toUpperCase(),
      side,
      shares,
      price: executionPrice,
      dollar_amount: amount,
    });
    await trade.save();

    const priceNote = usedPreviousClose ? " (previous close price)" : "";

    return {
      success: true,
      message: `${side === "buy" ? "Bought" : "Sold"} ${shares} share(s) of ${symbol.toUpperCase()} at $${executionPrice} per share${priceNote}`,
      trade,
      new_cash_balance: participant.cash_balance,
      holdings: participant.holdings,
    };
  } catch (err) {
    console.error("[executeTrade] Unexpected error:", err.message);
    return {
      success: false,
      message: "An unexpected error occurred during trade execution",
    };
  }
}

module.exports = { executeTrade };
