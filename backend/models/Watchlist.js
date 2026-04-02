const mongoose = require("mongoose");

const WatchlistItemSchema = new mongoose.Schema(
  {
    symbol: { type: String, required: true },
    name: { type: String, required: true },
    sector: { type: String, default: "Unknown" },
    exchange: { type: String, default: "--" },
  },
  { _id: false },
);

const WatchlistSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
  items: { type: [WatchlistItemSchema], default: [] },
});

module.exports = mongoose.model("Watchlist", WatchlistSchema);
