/**
 * Trades Routes
 *
 * Mounted at /api/tournaments/:id/trades (mergeParams: true)
 *
 * Endpoints:
 * - POST /api/tournaments/:id/trades  → validate and push to TradeQueue
 * - GET  /api/tournaments/:id/trades  → trade history for authenticated user
 * - GET  /api/tournaments/:id/trades/queue → pending queue status for authenticated user
 *
 * Actual trade execution happens in the two queue system (utils/priceQueue.js)
 * using the executeTrade utility (utils/executeTrade.js).
 *
 * Holdings and cash_balance are stored directly on the Participant document.
 */

const express = require("express");
const router = express.Router();
const Tournament = require("../models/Tournament");
const Participant = require("../models/Participant");
const Trade = require("../models/Trade");
const TradeQueue = require("../models/TradeQueue");
const verifyToken = require("../middleware/authMiddleware");

// POST /api/tournaments/:id/trades
// Validates request and pushes to TradeQueue for execution
router.post("/:id/trades", verifyToken, async (req, res) => {
  try {
    const { id: tournamentId } = req.params;
    const { symbol, side, dollar_amount } = req.body;

    // Validate required fields present
    if (!symbol || !side || dollar_amount === undefined) {
      return res.status(400).json({ message: "Missing required fields: symbol, side, dollar_amount" });
    }

    // Validate side
    if (!["buy", "sell"].includes(side)) {
      return res.status(400).json({ message: "side must be 'buy' or 'sell'" });
    }

    // Validate dollar amount
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

    // Verify user is a participant
    const participant = await Participant.findOne({
      tournament: tournamentId,
      user: req.userId,
    });
    if (!participant) {
      return res.status(403).json({ message: "You must join this tournament before trading" });
    }

    // Push to trade queue
    const queued = new TradeQueue({
      tournament: tournamentId,
      user: req.userId,
      symbol: symbol.toUpperCase(),
      side,
      dollar_amount: amount,
    });
    await queued.save();

    res.status(202).json({
      message: `Trade queued — ${side} $${amount} of ${symbol.toUpperCase()} will execute shortly`,
      queueId: queued._id,
      status: "pending",
    });

  } catch (err) {
    console.error("Trade queue error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tournaments/:id/trades/queue
// Returns authenticated user's pending trades in this tournament
router.get("/:id/trades/queue", verifyToken, async (req, res) => {
  try {
    const pending = await TradeQueue.find({
      tournament: req.params.id,
      user: req.userId,
      status: "pending",
    }).sort({ submittedAt: 1 });

    res.json(pending);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tournaments/:id/trades
// Returns authenticated user's executed trade history in this tournament
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