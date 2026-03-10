/**
 * Participant Model
 *
 * Mongoose schema representing a user's participation in a tournament.
 *
 * Key behaviours:
 * - Links user to tournament with cash balance tracking
 * - Enforces unique constraint preventing duplicate joins
 * - Auto-generated timestamps for creation/update tracking
 * - Referenced fields enable population of tournament and user details
 */

const mongoose = require("mongoose");

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
  },
  { timestamps: true }
);

// Prevent duplicate participation (one entry per user per tournament)
ParticipantSchema.index({ tournament: 1, user: 1 }, { unique: true });

module.exports = mongoose.model("Participant", ParticipantSchema);