/**
 * Stock Model
 *
 * Mongoose schema representing a stock with both static metadata
 * and cached price data from Polygon.
 *
 * Key behaviours:
 * - Static fields (symbol, name, sector, industry, exchange) seeded once
 * - Price fields updated by background job in stocks route
 * - priceUpdatedAt tracks when prices were last refreshed
 * - Single collection serves both metadata and price queries
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
    // Price fields — updated by background job
    price: { type: Number, default: null },
    open: { type: Number, default: null },
    high: { type: Number, default: null },
    low: { type: Number, default: null },
    volume: { type: Number, default: null },
    change: { type: Number, default: null },
    changePct: { type: Number, default: null },
    priceDate: { type: String, default: null },
    priceUpdatedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Stock", StockSchema);