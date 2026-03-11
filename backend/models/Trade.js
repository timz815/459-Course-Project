/**
* Trade Mongoose Model
*
* Defines the schema for trade records within a tournament trading system.
*
* Key behaviours:
* - Links trades to tournaments and users via ObjectId references
* - Enforces required fields: symbol, side, shares, price, dollar_amount
* - Normalizes symbol to uppercase and trims whitespace
* - Restricts side to "buy" or "sell" enum values
* - Automatically tracks creation/update timestamps
* - Creates compound index for efficient tournament/user/symbol queries
*/

const mongoose = require("mongoose");

// Define the trade schema with validation rules and references
const TradeSchema = new mongoose.Schema(
 {
   // Reference to the tournament this trade belongs to
   tournament: {
     type: mongoose.Schema.Types.ObjectId,
     ref: "Tournament",
     required: true,
   },
   // Reference to the user who executed the trade
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
   // Trade direction: buy or sell
   side: {
     type: String,
     enum: ["buy", "sell"],
     required: true,
   },
   // Number of shares traded
   shares: {
     type: Number,
     required: true,
   },
   // Execution price per share
   price: {
     type: Number,
     required: true,
   },
   // Total dollar value of the trade (shares * price)
   dollar_amount: {
     type: Number,
     required: true,
   },
 },
 { timestamps: true }
);

// Index for querying trades by tournament, user, and symbol
TradeSchema.index({ tournament: 1, user: 1, symbol: 1 });

// Export the Trade model
module.exports = mongoose.model("Trade", TradeSchema);