const express = require("express");
const router = express.Router();
const Watchlist = require("../models/Watchlist");
const verifyToken = require("../middleware/authMiddleware");

// GET /api/watchlist — get current user's watchlist
router.get("/", verifyToken, async (req, res) => {
  try {
    const doc = await Watchlist.findOne({ user: req.userId });
    res.json(doc ? doc.items : []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/watchlist — add a stock to watchlist
router.post("/", verifyToken, async (req, res) => {
  try {
    const { symbol, name, sector, exchange } = req.body;
    if (!symbol || !name) {
      return res.status(400).json({ error: "symbol and name are required" });
    }

    let doc = await Watchlist.findOne({ user: req.userId });
    if (!doc) {
      doc = new Watchlist({ user: req.userId, items: [] });
    }

    if (doc.items.some((item) => item.symbol === symbol)) {
      return res.json(doc.items);
    }

    doc.items.push({
      symbol,
      name,
      sector: sector || "Unknown",
      exchange: exchange || "--",
    });
    await doc.save();
    res.json(doc.items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/watchlist/:symbol — remove a stock from watchlist
router.delete("/:symbol", verifyToken, async (req, res) => {
  try {
    const doc = await Watchlist.findOne({ user: req.userId });
    if (!doc) return res.json([]);

    doc.items = doc.items.filter(
      (item) => item.symbol !== req.params.symbol.toUpperCase(),
    );
    await doc.save();
    res.json(doc.items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
