const mongoose = require("mongoose");

const TradeSchema = new mongoose.Schema(
  {
    tournament: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tournament",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    symbol: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    side: {
      type: String,
      enum: ["buy", "sell"],
      required: true,
    },
    shares: {
      type: Number,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    dollar_amount: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

TradeSchema.index({ tournament: 1, user: 1, symbol: 1 });

module.exports = mongoose.model("Trade", TradeSchema);