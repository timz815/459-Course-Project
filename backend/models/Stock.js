/**
 * Stock Model
 *
 * Mongoose schema representing a stock with static metadata and Finnhub/Polygon price data.
 *
 * Key behaviours:
 * - Static fields (symbol, name, sector, industry, exchange) seeded once
 * - All real-time price fields owned and updated by Finnhub via priceQueue
 * - previousClose stores yesterday's EOD price (Finnhub `pc` field)
 * - priceHistory stores intraday [timestamp, price] tuples during market hours
 *   Frontend checks last entry's date vs today (ET) — if stale, "Today" tab is hidden
 * - history3M stores up to ~63 daily [timestamp, close] tuples from Polygon
 *   Seeded once via seedHistory.js, then appended daily by the volume job
 *   Frontend slices: last 5 = 1W, last 21 = 1M, all = 3M
 *   Live Finnhub price appended client-side as trailing point when market is open
 */

const mongoose = require("mongoose");

const StockSchema = new mongoose.Schema(
  {
    symbol: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    name:     { type: String, required: true },
    sector:   { type: String, required: true },
    industry: { type: String, required: true },
    exchange: { type: String, required: true, enum: ["NASDAQ", "NYSE"] },

    // Real-time price fields — owned by Finnhub
    price:          { type: Number, default: null },
    previousClose:  { type: Number, default: null },
    open:           { type: Number, default: null },
    high:           { type: Number, default: null },
    low:            { type: Number, default: null },
    volume:         { type: Number, default: null },
    change:         { type: Number, default: null },
    changePct:      { type: Number, default: null },
    priceUpdatedAt: { type: Date,   default: null },

    // Intraday history — [timestamp, price] tuples, Finnhub, market hours only
    // Max 78 entries. Frontend checks last entry's date vs today (ET):
    // if not today → "Today" tab hidden, stale data is ignored
    priceHistory: { type: [[Number]], default: [] },

    // Daily historical closes — [timestamp, close] tuples from Polygon
    // Seeded with ~63 entries (3 months) via seedHistory.js
    // Daily job appends yesterday's close and trims to max 63 entries
    // Never contains "today" — always D-1 and older
    // Frontend slices: last 5 = 1W, last 21 = 1M, all = 3M
    // Live Finnhub price appended client-side as trailing point when market open
    history3M:        { type: [[Number]], default: [] },
    historyUpdatedAt: { type: Date,       default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Stock", StockSchema);