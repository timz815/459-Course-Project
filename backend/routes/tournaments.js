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
const verifyToken = require("../middleware/authMiddleware");

// GET all tournaments (public)
router.get("/", async (req, res) => {
  try {
    const tournaments = await Tournament.find().sort({ createdAt: -1 });
    res.json(tournaments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET my tournaments (created by me)
router.get("/my-tournaments", verifyToken, async (req, res) => {
  try {
    const tournaments = await Tournament.find({ owner: req.userId }).sort({ createdAt: -1 });
    res.json(tournaments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single tournament by ID
router.get("/:id", async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id).populate("owner", "username");
    if (!tournament) return res.status(404).json({ message: "Tournament not found" });

    const now = new Date();

    // Auto-activate when start date passes
    if (now > new Date(tournament.start_date) && tournament.status === "open") {
      tournament.status = "active";
      await tournament.save();
    }

    // Auto-end when end date passes
    if (now > new Date(tournament.end_date) && tournament.status !== "ended") {
      tournament.status = "ended";
      await tournament.save();
    }

    res.json(tournament);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET participants for a tournament
router.get("/:id/participants", async (req, res) => {
  try {
    const participants = await Participant.find({ tournament: req.params.id })
      .populate("user", "username")
      .sort({ cash_balance: -1 });
    res.json(participants);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create a new tournament
router.post("/", verifyToken, async (req, res) => {
  try {
    const { start_date, end_date, name, starting_balance, description } = req.body;
    
    // Validate required fields
    if (!name || !start_date || !end_date || starting_balance === undefined) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    
    const now = new Date();
    const start = new Date(start_date);
    const end = new Date(end_date);
    
    // Check if start is in the past
    if (start < now) {
      return res.status(400).json({ message: "Start time cannot be in the past" });
    }
    
    // Check if end is at least 1 minute after start
    const diffMs = end - start;
    if (diffMs < 60000) {
      return res.status(400).json({ message: "End time must be at least 1 minute after start time" });
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

    // Automatically add creator as participant
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

// POST join a tournament
router.post("/:id/join", verifyToken, async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);

    if (!tournament) {
      return res.status(404).json({ message: "Tournament not found" });
    }

    if (tournament.status === "closed" || tournament.status === "ended") {
      return res.status(403).json({ message: "This tournament is no longer accepting players." });
    }

    const existing = await Participant.findOne({
      tournament: req.params.id,
      user: req.userId,
    });
    
    if (existing) {
      return res.status(400).json({ message: "You have already joined this tournament." });
    }

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

// DELETE leave a tournament
router.delete("/:id/leave", verifyToken, async (req, res) => {
  try {
    const participant = await Participant.findOneAndDelete({
      tournament: req.params.id,
      user: req.userId,
    });

    if (!participant) {
      return res.status(404).json({ message: "You are not in this tournament." });
    }

    res.json({ message: "You have left the tournament." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH close/reopen a tournament (owner only)
router.patch("/:id/close", verifyToken, async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);

    if (!tournament) {
      return res.status(404).json({ message: "Tournament not found" });
    }

    if (tournament.owner.toString() !== req.userId) {
      return res.status(403).json({ message: "Only the owner can close this tournament." });
    }

    // Toggle between open and closed
    tournament.status = tournament.status === "closed" ? "open" : "closed";
    await tournament.save();

    res.json(tournament);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE a tournament (owner only)
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);

    if (!tournament) {
      return res.status(404).json({ message: "Tournament not found" });
    }

    if (tournament.owner.toString() !== req.userId) {
      return res.status(403).json({ message: "Forbidden: You do not own this tournament." });
    }

    // Cascade delete participants
    await Participant.deleteMany({ tournament: req.params.id });
    await Tournament.findByIdAndDelete(req.params.id);

    res.json({ message: "Tournament deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;