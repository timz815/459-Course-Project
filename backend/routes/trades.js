/**
 * Trades Routes
 *
 * Mounted at /api/tournaments/:id/trades (mergeParams: true)
 *
 * Endpoints:
 * - POST /api/tournaments/:id/trades  → execute buy or sell
 * - GET  /api/tournaments/:id/trades  → trade history for authenticated user
 *
 * Holdings and cash_balance are stored directly on the Participant document.
 * No separate holdings endpoint needed — participant data has everything.
 */

const express = require("express");
const router = express.Router();
const Tournament = require("../models/Tournament");
const Participant = require("../models/Participant");
const Trade = require("../models/Trade");
const Stock = require("../models/Stock");
const verifyToken = require("../middleware/authMiddleware");

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
const FINNHUB_BASE = "https://finnhub.io/api/v1";

// Fetch live price from Finnhub — called once per confirmed trade
async function fetchLivePrice(symbol) {
  const url = `${FINNHUB_BASE}/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok || !data.c || data.c === 0) return null;
  return data.c;
}

// POST /api/tournaments/:id/trades
// Body: { symbol, side, dollar_amount }
router.post("/:id/trades", verifyToken, async (req, res) => {
  try {
    const { id: tournamentId } = req.params;
    const { symbol, side, dollar_amount } = req.body;

    // Validate required fields present
    if (!symbol || !side || dollar_amount === undefined) {
      return res.status(400).json({ message: "Missing required fields: symbol, side, dollar_amount" });
    }
    
    // Validate side is buy or sell
    if (!["buy", "sell"].includes(side)) {
      return res.status(400).json({ message: "side must be 'buy' or 'sell'" });
    }
    
    // Parse and validate dollar amount
    const amount = parseFloat(dollar_amount);
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ message: "dollar_amount must be a positive number" });
    }

    // Verify tournament exists and is tradeable
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      return res.status(404).json({ message: "Tournament not found" });
    }
    if (tournament.status !== "active" && tournament.status !== "open") {
      return res.status(403).json({ message: "Trading is only allowed in active tournaments" });
    }

    // Verify user is a participant in this tournament
    const participant = await Participant.findOne({
      tournament: tournamentId,
      user: req.userId,
    });
    if (!participant) {
      return res.status(403).json({ message: "You must join this tournament before trading" });
    }

    // Verify stock exists in tournament universe
    const stock = await Stock.findOne({ symbol: symbol.toUpperCase() });
    if (!stock) {
      return res.status(404).json({ message: `${symbol.toUpperCase()} is not available in this tournament` });
    }

    // Fetch current market price
    const livePrice = await fetchLivePrice(symbol.toUpperCase());
    if (!livePrice) {
      return res.status(503).json({ message: `Could not fetch live price for ${symbol.toUpperCase()}. Please try again.` });
    }

    // Calculate shares from dollar amount
    const shares = parseFloat((amount / livePrice).toFixed(1));
    if (shares <= 0) {
      return res.status(400).json({ message: "Dollar amount too small to purchase any shares" });
    }

    // Locate existing position for this symbol
    const holdingIndex = participant.holdings.findIndex(
      (h) => h.symbol === symbol.toUpperCase()
    );

    if (side === "buy") {
      // Check sufficient cash
      if (participant.cash_balance < amount) {
        return res.status(400).json({
          message: `Insufficient funds. You have $${participant.cash_balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}, need $${amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
        });
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
        return res.status(400).json({ message: `You don't own any shares of ${symbol.toUpperCase()}` });
      }

      const holding = participant.holdings[holdingIndex];

      // Check sufficient shares
      if (shares > holding.shares) {
        return res.status(400).json({
          message: `Insufficient shares. You hold ${holding.shares} share(s) of ${symbol.toUpperCase()}, this sell requires ${shares}`,
        });
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

    // Persist updated participant data
    participant.markModified("holdings");
    await participant.save();

    // Record trade in history
    const trade = new Trade({
      tournament: tournamentId,
      user: req.userId,
      symbol: symbol.toUpperCase(),
      side,
      shares,
      price: livePrice,
      dollar_amount: amount,
    });
    await trade.save();

    res.status(201).json({
      message: `${side === "buy" ? "Bought" : "Sold"} ${shares} share(s) of ${symbol.toUpperCase()} at $${livePrice} per share`,
      trade,
      new_cash_balance: participant.cash_balance,
      holdings: participant.holdings,
    });

  } catch (err) {
    console.error("Trade execution error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tournaments/:id/trades
// Returns authenticated user's trade history in this tournament
router.get("/:id/trades", verifyToken, async (req, res) => {
  try {
    const trades = await Trade.find({
      tournament: req.params.id,
      user: req.userId,
    }).sort({ createdAt: -1 });

    res.json(trades);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;