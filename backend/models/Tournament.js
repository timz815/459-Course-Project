/**
 * Tournament Model
 *
 * Mongoose schema representing a trading tournament with scheduling and status management.
 *
 * Key behaviours:
 * - Owned by a user who has full control over the tournament
 * - Scheduled with start and end dates for automatic status transitions
 * - Tracks starting balance for all participants
 * - Status enum controls tournament lifecycle (open → active → closed/ended)
 * - Auto-generated timestamps for creation and updates
 */

const mongoose = require("mongoose");

const TournamentSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    start_date: {
      type: Date,
      required: true,
    },
    end_date: {
      type: Date,
      required: true,
    },
    starting_balance: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
    },
    status: {
      type: String,
      enum: ["open", "active", "closed", "ended"],
      default: "open",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Tournament", TournamentSchema);