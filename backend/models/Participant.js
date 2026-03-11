/**
 * Participant Model
 *
 * Mongoose schema representing a user's participation in a tournament.
 *
 * Key behaviours:
 * - Links user to tournament with cash balance tracking
 * - Holdings array updated directly on every buy/sell trade
 * - amount_invested per symbol tracks exact dollars spent (not EOD estimate)
 * - Enforces unique constraint preventing duplicate joins
 * - Auto-generated timestamps for creation/update tracking
 */

const mongoose = require("mongoose");

const HoldingSchema = new mongoose.Schema(
  {
    symbol: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    shares: {
      type: Number,
      required: true,
    },
    amount_invested: {
      type: Number,
      required: true,
    },
  },
  { _id: false } // no need for individual IDs on subdocuments
);

const ParticipantSchema = new mongoose.Schema(
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
    cash_balance: {
      type: Number,
      required: true,
    },
    holdings: {
      type: [HoldingSchema],
      default: [],
    },
  },
  { timestamps: true }
);

// Prevent duplicate participation (one entry per user per tournament)
ParticipantSchema.index({ tournament: 1, user: 1 }, { unique: true });

module.exports = mongoose.model("Participant", ParticipantSchema);