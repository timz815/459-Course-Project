/**
 * Stock Model
 *
 * Mongoose schema representing a stock with static metadata and Finnhub price data.
 *
 * Key behaviours:
 * - Static fields (symbol, name, sector, industry, exchange) seeded once
 * - All price fields owned and updated by Finnhub via priceQueue
 * - previousClose stores yesterday's EOD price (Finnhub `pc` field)
 * - priceHistory stores intraday [timestamp, price] tuples during market hours
 * - Polygon handles historical candles only (future work)
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
    name: {
      type: String,
      required: true,
    },
    sector: {
      type: String,
      required: true,
    },
    industry: {
      type: String,
      required: true,
    },
    exchange: {
      type: String,
      required: true,
      enum: ["NASDAQ", "NYSE"],
    },
    // All price fields owned by Finnhub
    price: { type: Number, default: null },
    previousClose: { type: Number, default: null },
    open: { type: Number, default: null },
    high: { type: Number, default: null },
    low: { type: Number, default: null },
    volume: { type: Number, default: null },
    change: { type: Number, default: null },
    changePct: { type: Number, default: null },
    priceUpdatedAt: { type: Date, default: null },

    // Intraday price history — array of [timestamp, price] tuples
    // Updated by Finnhub queue during market hours only
    // Max 78 entries (26 per trading day × 3 trading days)
    priceHistory: { type: [[Number]], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Stock", StockSchema);