/**
 * executeTrade Utility
 *
 * Core trade execution logic extracted from the trades route.
 * Called by the two queue system when processing queued trades.
 *
 * Key behaviours:
 * - Validates tournament, participant, and stock exist
 * - Fetches live price from Finnhub at moment of execution
 * - Handles buy and sell logic including balance and holdings updates
 * - Creates a Trade record on success
 * - Returns a result object — never throws to the caller
 * - No HTTP dependencies (no req/res) — pure business logic
 *
 * Usage:
 *   const { executeTrade } = require('../utils/executeTrade');
 *   const result = await executeTrade({ userId, tournamentId, symbol, side, dollar_amount });
 *   if (result.success) { ... } else { console.error(result.message) }
 */

const Tournament = require("../models/Tournament");
const Participant = require("../models/Participant");
const Trade = require("../models/Trade");
const Stock = require("../models/Stock");

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
const FINNHUB_BASE = "https://finnhub.io/api/v1";

/**
 * Fetches the current live price for a symbol from Finnhub.
 * @param {string} symbol
 * @returns {number|null}
 */
async function fetchLivePrice(symbol) {
  try {
    const url = `${FINNHUB_BASE}/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok || !data.c || data.c === 0) return null;
    return data.c;
  } catch (err) {
    console.error(`[executeTrade] Finnhub fetch failed for ${symbol}:`, err.message);
    return null;
  }
}

/**
 * Executes a buy or sell trade for a tournament participant.
 *
 * @param {Object} params
 * @param {string} params.userId       - The user's MongoDB ObjectId string
 * @param {string} params.tournamentId - The tournament's MongoDB ObjectId string
 * @param {string} params.symbol       - Stock ticker symbol (e.g. "AAPL")
 * @param {string} params.side         - "buy" or "sell"
 * @param {number} params.dollar_amount - Dollar amount to buy or sell
 *
 * @returns {Promise<{
 *   success: boolean,
 *   message: string,
 *   trade?: object,
 *   new_cash_balance?: number,
 *   holdings?: array
 * }>}
 */
async function executeTrade({ userId, tournamentId, symbol, side, dollar_amount }) {
  try {
    // Validate dollar amount
    const amount = parseFloat(dollar_amount);
    if (isNaN(amount) || amount <= 0) {
      return { success: false, message: "dollar_amount must be a positive number" };
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
      return { success: false, message: "Trading is only allowed in active tournaments" };
    }

    // Verify user is a participant
    const participant = await Participant.findOne({
      tournament: tournamentId,
      user: userId,
    });
    if (!participant) {
      return { success: false, message: "You must join this tournament before trading" };
    }

    // Verify stock exists in universe
    const stock = await Stock.findOne({ symbol: symbol.toUpperCase() });
    if (!stock) {
      return { success: false, message: `${symbol.toUpperCase()} is not available in this tournament` };
    }

    // Fetch live price from Finnhub
    const livePrice = await fetchLivePrice(symbol.toUpperCase());
    if (!livePrice) {
      return { success: false, message: `Could not fetch live price for ${symbol.toUpperCase()}. Please try again.` };
    }

    // Calculate shares from dollar amount
    const shares = parseFloat((amount / livePrice).toFixed(1));
    if (shares <= 0) {
      return { success: false, message: "Dollar amount too small to purchase any shares" };
    }

    // Locate existing position for this symbol
    const holdingIndex = participant.holdings.findIndex(
      (h) => h.symbol === symbol.toUpperCase()
    );

    if (side === "buy") {
      // Check sufficient cash
      if (participant.cash_balance < amount) {
        return {
          success: false,
          message: `Insufficient funds. You have $${participant.cash_balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}, need $${amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
        };
      }

      // Deduct cash balance
      participant.cash_balance = parseFloat((participant.cash_balance - amount).toFixed(2));

      // Add to existing position or create new holding
      if (holdingIndex >= 0) {
        participant.holdings[holdingIndex].shares = parseFloat(
          (participant.holdings[holdingIndex].shares + shares).toFixed(1)
        );
        participant.holdings[holdingIndex].amount_invested = parseFloat(
          (participant.holdings[holdingIndex].amount_invested + amount).toFixed(2)
        );
      } else {
        participant.holdings.push({
          symbol: symbol.toUpperCase(),
          shares,
          amount_invested: amount,
        });
      }
    } else {
      // Validate position exists for sell
      if (holdingIndex < 0) {
        return { success: false, message: `You don't own any shares of ${symbol.toUpperCase()}` };
      }

      const holding = participant.holdings[holdingIndex];

      // Check sufficient shares
      if (shares > holding.shares) {
        return {
          success: false,
          message: `Insufficient shares. You hold ${holding.shares} share(s) of ${symbol.toUpperCase()}, this sell requires ${shares}`,
        };
      }

      // Credit cash balance
      participant.cash_balance = parseFloat((participant.cash_balance + amount).toFixed(2));

      // Reduce position or remove if fully closed
      const newShares = parseFloat((holding.shares - shares).toFixed(1));
      const newAmountInvested = parseFloat((holding.amount_invested - amount).toFixed(2));

      if (newShares <= 0) {
        participant.holdings.splice(holdingIndex, 1);
      } else {
        participant.holdings[holdingIndex].shares = newShares;
        participant.holdings[holdingIndex].amount_invested = Math.max(0, newAmountInvested);
      }
    }

    // Persist updated participant
    participant.markModified("holdings");
    await participant.save();

    // Record trade in history
    const trade = new Trade({
      tournament: tournamentId,
      user: userId,
      symbol: symbol.toUpperCase(),
      side,
      shares,
      price: livePrice,
      dollar_amount: amount,
    });
    await trade.save();

    return {
      success: true,
      message: `${side === "buy" ? "Bought" : "Sold"} ${shares} share(s) of ${symbol.toUpperCase()} at $${livePrice} per share`,
      trade,
      new_cash_balance: participant.cash_balance,
      holdings: participant.holdings,
    };

  } catch (err) {
    console.error("[executeTrade] Unexpected error:", err.message);
    return { success: false, message: "An unexpected error occurred during trade execution" };
  }
}

module.exports = { executeTrade };