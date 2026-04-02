/**
 * Stock Routes
 *
 * Express router for stock data. Volume and daily history candle are fetched
 * from Polygon once daily at 6am ET and stored in MongoDB. All other price
 * data is owned by Finnhub.
 *
 * Key behaviours:
 * - GET /api/stocks           → returns all stocks with cached prices from DB (excludes priceHistory, history3M)
 * - GET /api/stocks/:symbol   → returns single stock with full priceHistory and history3M for detail page
 * - Daily job runs on server start then daily at 6am ET
 * - Fetches /prev from Polygon per symbol — stores volume AND appends [timestamp, close] to history3M
 * - history3M trimmed to max 63 entries (≈3 months of trading days) on each append
 * - Sequential fetching with 13s delay between calls (5 req/min free tier)
 * - Frontend reads from DB — always instant, never waits for Polygon
 */

const express = require("express");
const router = express.Router();
const Stock = require("../models/Stock");
const verifyAdmin = require("../middleware/adminMiddleware");
const { isEasternDST } = require("../utils/marketHours");

const POLYGON_API_KEY = process.env.POLYGON_API_KEY;
const POLYGON_BASE = "https://api.polygon.io";
const DELAY_MS = 13000;
const MAX_HISTORY_CANDLES = 63;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Polygon Daily Job ────────────────────────────────────────────────────────

/**
 * Fetches previous day's volume and close price for one symbol from Polygon.
 * Returns { volume, close, timestamp } or null on failure.
 */
async function fetchPrevDay(symbol) {
  try {
    const url = `${POLYGON_BASE}/v2/aggs/ticker/${symbol}/prev?adjusted=true&apiKey=${POLYGON_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!res.ok || !data.results || data.results.length === 0) {
      console.log(`[DailyJob] No data for ${symbol} (status ${res.status})`);
      return null;
    }

    const result = data.results[0];
    return {
      volume: result.v ?? null,
      close: result.c ?? null,
      timestamp: result.t ?? null, // Unix ms timestamp for start of that day
    };
  } catch (err) {
    console.error(`[DailyJob] Error fetching ${symbol}:`, err.message);
    return null;
  }
}

let isRefreshing = false;

/**
 * Fetches and stores previous day volume + close candle for all stocks sequentially.
 * Appends [timestamp, close] to history3M and trims to MAX_HISTORY_CANDLES.
 * Piggybacks both writes in one DB call per symbol.
 * Takes ~4 minutes due to rate limiting.
 */
async function refreshAllDailyData() {
  if (isRefreshing) {
    console.log("[DailyJob] Already running, skipping");
    return;
  }

  isRefreshing = true;
  console.log("[DailyJob] Starting daily refresh (volume + history)...");

  try {
    const stocks = await Stock.find({}, "symbol history3M");

    for (let i = 0; i < stocks.length; i++) {
      const { symbol, history3M = [] } = stocks[i];
      const prev = await fetchPrevDay(symbol);

      if (prev !== null) {
        const { volume, close, timestamp } = prev;

        // Build the updated history — append new candle and trim to max
        let updatedHistory = [...history3M];
        if (close !== null && timestamp !== null) {
          // Avoid duplicates — don't append if last entry has the same timestamp
          const lastTs =
            updatedHistory.length > 0
              ? updatedHistory[updatedHistory.length - 1][0]
              : null;

          if (lastTs !== timestamp) {
            updatedHistory.push([timestamp, close]);
          }
        }

        // Trim to keep only the most recent MAX_HISTORY_CANDLES entries
        if (updatedHistory.length > MAX_HISTORY_CANDLES) {
          updatedHistory = updatedHistory.slice(-MAX_HISTORY_CANDLES);
        }

        await Stock.findOneAndUpdate(
          { symbol },
          {
            $set: {
              volume,
              history3M: updatedHistory,
              historyUpdatedAt: new Date(),
            },
          },
        );

        console.log(
          `[DailyJob] ✓ ${symbol} — vol: ${volume}, close: $${close}, history: ${updatedHistory.length} candles`,
        );
      }

      if (i < stocks.length - 1) await sleep(DELAY_MS);
    }

    console.log("[DailyJob] ✅ Daily refresh complete");
  } catch (err) {
    console.error("[DailyJob] ❌ Error:", err.message);
  } finally {
    isRefreshing = false;
  }
}

// ─── Scheduler ────────────────────────────────────────────────────────────────

/**
 * Returns milliseconds until next 6am ET.
 */
function msUntil6amET() {
  const now = new Date();
  const isDST = isEasternDST(now);
  const offsetMs = (isDST ? -4 : -5) * 60 * 60 * 1000;
  const etNow = new Date(now.getTime() + offsetMs);

  const target = new Date(etNow);
  target.setUTCHours(6, 0, 0, 0);

  if (etNow.getUTCHours() >= 6) {
    target.setUTCDate(target.getUTCDate() + 1);
  }

  const targetUTC = new Date(target.getTime() - offsetMs);
  return targetUTC.getTime() - now.getTime();
}

/**
 * Schedules daily refresh to run every day at 6am ET.
 */
function scheduleDailyRefresh() {
  const ms = msUntil6amET();
  const hours = Math.round(ms / 1000 / 60 / 60);
  console.log(`[DailyJob] Next refresh in ~${hours}h (6am ET)`);

  setTimeout(() => {
    refreshAllDailyData();
    setInterval(refreshAllDailyData, 24 * 60 * 60 * 1000);
  }, ms);
}

/**
 * Starts the daily job — runs immediately on server start
 * then schedules daily at 6am ET.
 */
function startVolumeJob() {
  refreshAllDailyData();
  scheduleDailyRefresh();
}

module.exports.startVolumeJob = startVolumeJob;

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET all stocks — excludes priceHistory and history3M for performance
router.get("/", async (req, res) => {
  try {
    const stocks = await Stock.find()
      .sort({ symbol: 1 })
      .select("-priceHistory -history3M");
    res.json(stocks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single stock — includes full priceHistory and history3M for detail page
router.get("/:symbol", async (req, res) => {
  try {
    const stock = await Stock.findOne({
      symbol: req.params.symbol.toUpperCase(),
    });
    if (!stock) {
      return res
        .status(404)
        .json({
          message: `Stock ${req.params.symbol.toUpperCase()} not found`,
        });
    }
    res.json(stock);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.startVolumeJob = startVolumeJob;

// ─── Admin Stock Management ───────────────────────────────────────────────────

// POST /api/stocks/admin — add a new stock
router.post("/admin", verifyAdmin, async (req, res) => {
  try {
    const { symbol, name, sector, industry, exchange } = req.body;

    if (!symbol || !name || !sector || !industry || !exchange) {
      return res
        .status(400)
        .json({
          message:
            "All fields required: symbol, name, sector, industry, exchange",
        });
    }

    if (!["NASDAQ", "NYSE"].includes(exchange.toUpperCase())) {
      return res
        .status(400)
        .json({ message: "Exchange must be NASDAQ or NYSE" });
    }

    const existing = await Stock.findOne({ symbol: symbol.toUpperCase() });
    if (existing) {
      return res
        .status(409)
        .json({ message: `Stock ${symbol.toUpperCase()} already exists` });
    }

    const stock = new Stock({
      symbol: symbol.toUpperCase(),
      name,
      sector,
      industry,
      exchange: exchange.toUpperCase(),
    });
    await stock.save();

    res.status(201).json({ message: `Stock ${stock.symbol} added.`, stock });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/stocks/admin/:symbol — edit stock metadata
router.patch("/admin/:symbol", verifyAdmin, async (req, res) => {
  try {
    const { name, sector, industry, exchange } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (sector) updates.sector = sector;
    if (industry) updates.industry = industry;
    if (exchange) {
      if (!["NASDAQ", "NYSE"].includes(exchange.toUpperCase())) {
        return res
          .status(400)
          .json({ message: "Exchange must be NASDAQ or NYSE" });
      }
      updates.exchange = exchange.toUpperCase();
    }

    const stock = await Stock.findOneAndUpdate(
      { symbol: req.params.symbol.toUpperCase() },
      { $set: updates },
      { new: true },
    );

    if (!stock) {
      return res
        .status(404)
        .json({
          message: `Stock ${req.params.symbol.toUpperCase()} not found`,
        });
    }

    res.json({ message: `Stock ${stock.symbol} updated.`, stock });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/stocks/admin/:symbol — remove stock
router.delete("/admin/:symbol", verifyAdmin, async (req, res) => {
  try {
    const stock = await Stock.findOneAndDelete({
      symbol: req.params.symbol.toUpperCase(),
    });

    if (!stock) {
      return res
        .status(404)
        .json({
          message: `Stock ${req.params.symbol.toUpperCase()} not found`,
        });
    }

    res.json({ message: `Stock ${stock.symbol} deleted.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
