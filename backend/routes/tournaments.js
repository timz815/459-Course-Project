/**
 * Tournament Routes
 *
 * Express router handling all tournament-related endpoints including CRUD operations,
 * participant management, and owner controls.
 *
 * Key behaviours:
 * - Public read access for tournament listings and details
 * - Authentication required for creation, joining, leaving, and owner operations
 * - Automatic creator participation on tournament creation
 * - Status validation for join operations (open/active only)
 * - Owner verification for close/reopen and delete operations
 * - Cascading delete of participants when tournament is deleted
 */

const express = require("express");
const router = express.Router();
const Tournament = require("../models/Tournament");
const Participant = require("../models/Participant");
const Trade = require("../models/Trade");
const TradeQueue = require("../models/TradeQueue");
const Comment = require("../models/Comment");
const verifyToken = require("../middleware/authMiddleware");
const verifyAdmin = require("../middleware/adminMiddleware");

// GET all tournaments — enriched for admin
router.get("/", async (req, res) => {
  try {
    const token = req.header("Authorization");
    let isAdmin = false;

    if (token) {
      try {
        const jwt = require("jsonwebtoken");
        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET || "fallbackSecret",
        );
        isAdmin = decoded.role === "admin";
      } catch {
        // invalid token, treat as public
      }
    }

    const tournaments = await Tournament.find()
      .populate(isAdmin ? "owner" : "")
      .sort({ createdAt: -1 });

    if (isAdmin) {
      const withCounts = await Promise.all(
        tournaments.map(async (t) => {
          const count = await Participant.countDocuments({ tournament: t._id });
          return { ...t.toObject(), participantCount: count };
        }),
      );
      return res.json(withCounts);
    }

    res.json(tournaments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET my tournaments
router.get("/my-tournaments", verifyToken, async (req, res) => {
  try {
    const tournaments = await Tournament.find({ owner: req.userId }).sort({
      createdAt: -1,
    });
    res.json(tournaments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single tournament
router.get("/:id", async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id).populate(
      "owner",
      "username",
    );
    if (!tournament)
      return res.status(404).json({ message: "Tournament not found" });

    const now = new Date();
    const startDate = new Date(tournament.start_date);
    const endDate = new Date(tournament.end_date);
    let modified = false;

    if (now >= startDate && tournament.status === "open") {
      tournament.status = "active";
      modified = true;
    }

    if (now >= endDate && tournament.status !== "ended") {
      tournament.status = "ended";
      modified = true;
    }

    if (modified) await tournament.save();

    res.json(tournament);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET participants
router.get("/:id/participants", async (req, res) => {
  try {
    const participants = await Participant.find({ tournament: req.params.id })
      .populate("user", "username displayName avatarUrl")
      .sort({ cash_balance: -1 });
    res.json(participants);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create tournament
router.post("/", verifyToken, async (req, res) => {
  try {
    const { start_date, end_date, name, starting_balance, description } =
      req.body;

    if (!name || !start_date || !end_date || starting_balance === undefined) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const now = new Date();
    const start = new Date(start_date);
    const end = new Date(end_date);

    if (start < now) {
      return res
        .status(400)
        .json({ message: "Start time cannot be in the past" });
    }

    if (end - start < 60000) {
      return res.status(400).json({
        message: "End time must be at least 1 minute after start time",
      });
    }

    const tournament = new Tournament({
      owner: req.userId,
      name,
      start_date: start,
      end_date: end,
      starting_balance,
      description,
    });
    await tournament.save();

    const participant = new Participant({
      tournament: tournament._id,
      user: req.userId,
      cash_balance: tournament.starting_balance,
    });
    await participant.save();

    res.status(201).json(tournament);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST join
router.post("/:id/join", verifyToken, async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament)
      return res.status(404).json({ message: "Tournament not found" });

    if (tournament.status === "closed" || tournament.status === "ended") {
      return res
        .status(403)
        .json({ message: "This tournament is no longer accepting players." });
    }

    const existing = await Participant.findOne({
      tournament: req.params.id,
      user: req.userId,
    });
    if (existing)
      return res
        .status(400)
        .json({ message: "You have already joined this tournament." });

    const participant = new Participant({
      tournament: req.params.id,
      user: req.userId,
      cash_balance: tournament.starting_balance,
    });
    await participant.save();

    res.status(201).json(participant);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE leave
router.delete("/:id/leave", verifyToken, async (req, res) => {
  try {
    const participant = await Participant.findOneAndDelete({
      tournament: req.params.id,
      user: req.userId,
    });
    if (!participant)
      return res
        .status(404)
        .json({ message: "You are not in this tournament." });
    res.json({ message: "You have left the tournament." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET comments for a tournament
router.get("/:id/comments", async (req, res) => {
  try {
    const comments = await Comment.find({ tournament: req.params.id })
      .populate("user", "username avatarUrl")
      .sort({ createdAt: -1 });
    res.json(comments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST a comment
router.post("/:id/comments", verifyToken, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ message: "Comment text is required." });
    }
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament)
      return res.status(404).json({ message: "Tournament not found" });

    const comment = new Comment({
      tournament: req.params.id,
      user: req.userId,
      text: text.trim(),
    });
    await comment.save();
    await comment.populate("user", "username avatarUrl");
    res.status(201).json(comment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// TODO(tier-2 tournament-edit): Add PATCH /:id — owner-only edit before tournament starts.
// - Verify the requesting user is the owner.
// - Only allow edits when tournament.status === "open" (not yet started).
// - Accept any subset of: { name, description, start_date, end_date, starting_balance }.
// - Validate that the updated start_date is still in the future and end_date > start_date.
// - Save and return the updated tournament document.

// PATCH close/reopen — owner only
router.patch("/:id/close", verifyToken, async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament)
      return res.status(404).json({ message: "Tournament not found" });

    if (tournament.owner.toString() !== req.userId) {
      return res
        .status(403)
        .json({ message: "Only the owner can close this tournament." });
    }

    tournament.status = tournament.status === "closed" ? "open" : "closed";
    await tournament.save();

    res.json(tournament);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE — owner only
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament)
      return res.status(404).json({ message: "Tournament not found" });

    if (tournament.owner.toString() !== req.userId) {
      return res
        .status(403)
        .json({ message: "Forbidden: You do not own this tournament." });
    }

    await Participant.deleteMany({ tournament: req.params.id });
    await Tournament.findByIdAndDelete(req.params.id);

    res.json({ message: "Tournament deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE — admin force-delete
router.delete("/admin/:id", verifyAdmin, async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament)
      return res.status(404).json({ message: "Tournament not found" });

    await Promise.all([
      Participant.deleteMany({ tournament: req.params.id }),
      Trade.deleteMany({ tournament: req.params.id }),
      TradeQueue.deleteMany({ tournament: req.params.id }),
      Comment.deleteMany({ tournament: req.params.id }),
    ]);

    await Tournament.findByIdAndDelete(req.params.id);

    res.json({ message: `Tournament "${tournament.name}" deleted.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
