/**
 * TradeQueue Model
 *
 * Mongoose schema representing a queued trade request awaiting execution.
 *
 * Key behaviours:
 * - Created when user submits a buy/sell request
 * - Status transitions: pending → executed | failed
 * - Executed by the two queue system on odd seconds
 * - FIFO ordering enforced by submittedAt timestamp
 * - Failed trades store reason in message field for user feedback
 * - Executed trades reference the resulting Trade document
 */

const mongoose = require("mongoose");

const TradeQueueSchema = new mongoose.Schema({
  // Reference to the tournament this trade belongs to
  tournament: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Tournament",
    required: true,
  },

  // Reference to the user who submitted the trade
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  // Stock symbol (normalized to uppercase)
  symbol: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
  },

  // Trade direction
  side: {
    type: String,
    enum: ["buy", "sell"],
    required: true,
  },

  // Dollar amount to buy or sell
  dollar_amount: {
    type: Number,
    required: true,
  },

  // Current lifecycle status of the queued trade
  status: {
    type: String,
    enum: ["pending", "executed", "failed"],
    default: "pending",
  },

  // Human readable result message — set on execution or failure
  message: {
    type: String,
    default: null,
  },

  // Reference to the Trade document created on successful execution
  trade: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Trade",
    default: null,
  },

  // When the user submitted the request — used for FIFO ordering
  submittedAt: {
    type: Date,
    default: Date.now,
  },

  // When the queue system processed this entry
  executedAt: {
    type: Date,
    default: null,
  },
});

// Index for efficiently finding pending trades in submission order
// Also used for fairness rule — one pending trade per user at a time
TradeQueueSchema.index({ status: 1, submittedAt: 1 });
TradeQueueSchema.index({ user: 1, status: 1 });

module.exports = mongoose.model("TradeQueue", TradeQueueSchema);