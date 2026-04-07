const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Participant = require("../models/Participant");
const Trade = require("../models/Trade");
const TradeQueue = require("../models/TradeQueue");
const Tournament = require("../models/Tournament");
const Comment = require("../models/Comment");
const verifyAdmin = require("../middleware/adminMiddleware");

// GET all users
router.get("/", verifyAdmin, async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ _id: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH role — promote or demote
router.patch("/:id/role", verifyAdmin, async (req, res) => {
  try {
    const { role } = req.body;

    if (!["admin", "user"].includes(role)) {
      return res.status(400).json({ message: "role must be 'admin' or 'user'" });
    }

    if (req.params.id === req.userId) {
      return res.status(400).json({ message: "You cannot change your own role." });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select("-password");

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ message: `Role updated to "${role}" for ${user.username}.`, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE user — cascade participations/trades, reassign owned tournaments to admin
router.delete("/:id", verifyAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (req.params.id === req.userId) {
      return res.status(400).json({ message: "You cannot delete your own account." });
    }

    await Promise.all([
      Participant.deleteMany({ user: req.params.id }),
      Trade.deleteMany({ user: req.params.id }),
      TradeQueue.deleteMany({ user: req.params.id }),
      Comment.deleteMany({ user: req.params.id }),
      Tournament.updateMany(
        { owner: req.params.id },
        { $set: { owner: req.userId } }
      ),
    ]);

    await User.findByIdAndDelete(req.params.id);

    res.json({ message: `User "${user.username}" deleted, tournaments reassigned.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;