/**
 * User Model
 *
 * Mongoose schema representing an authenticated user account.
 *
 * Key behaviours:
 * - Unique username constraint prevents duplicate accounts
 * - Password stored as hashed string (hashing handled in auth controller)
 * - Referenced by Tournament (as owner) and Participant (as user) models
 */

const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  displayName: {
    type: String,
    default: "",
  },
  email: {
    type: String,
    default: "",
  },
  avatarUrl: {
    type: String,
    default: "",
  },
  accountBalance: {
    type: Number,
    default: 100000,
  },
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
  },
});

module.exports = mongoose.model("User", UserSchema);