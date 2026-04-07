const mongoose = require("mongoose");

const CommentSchema = new mongoose.Schema(
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
    text: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["comment", "trade", "event"],
      default: "comment",
    },
    side: {
      type: String,
      enum: ["buy", "sell", "join", "leave"],
    },
  },
  { timestamps: true }
);

CommentSchema.index({ tournament: 1, createdAt: -1 });

module.exports = mongoose.model("Comment", CommentSchema);
