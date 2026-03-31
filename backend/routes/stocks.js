/**
 * Stock Routes
 *
 * Express router for stock data. Volume is fetched from Polygon once daily
 * at 6am ET and stored in MongoDB. All other price data is owned by Finnhub.
 *
 * Key behaviours:
 * - GET /api/stocks           → returns all stocks with cached prices from DB (excludes priceHistory)
 * - GET /api/stocks/:symbol   → returns single stock with full priceHistory for detail page
 * - Volume refresh job runs on server start then daily at 6am ET
 * - Sequential fetching with 13s delay between calls (5 req/min free tier)
 * - Frontend reads from DB — always instant, never waits for Polygon
 */

const express = require("express");
const router = express.Router();
const Stock = require("../models/Stock");
const { isEasternDST } = require("../utils/marketHours");

const POLYGON_API_KEY = process.env.POLYGON_API_KEY;
const POLYGON_BASE = "https://api.polygon.io";
const DELAY_MS = 13000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Polygon Volume Job ───────────────────────────────────────────────────────

/**
 * Fetches previous day's volume for one symbol from Polygon.
 */
async function fetchVolume(symbol) {
  try {
    const url = `${POLYGON_BASE}/v2/aggs/ticker/${symbol}/prev?adjusted=true&apiKey=${POLYGON_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!res.ok || !data.results || data.results.length === 0) {
      console.log(`[VolumeJob] No data for ${symbol} (status ${res.status})`);
      return null;
    }

    return data.results[0].v || null;
  } catch (err) {
    console.error(`[VolumeJob] Error fetching ${symbol}:`, err.message);
    return null;
  }
}

let isRefreshing = false;

/**
 * Fetches and stores previous day volume for all stocks sequentially.
 * Takes ~4 minutes due to rate limiting.
 */
async function refreshAllVolumes() {
  if (isRefreshing) {
    console.log("[VolumeJob] Already running, skipping");
    return;
  }

  isRefreshing = true;
  console.log("[VolumeJob] Starting volume refresh...");

  try {
    const stocks = await Stock.find({}, "symbol");

    for (let i = 0; i < stocks.length; i++) {
      const { symbol } = stocks[i];
      const volume = await fetchVolume(symbol);

      if (volume !== null) {
        await Stock.findOneAndUpdate({ symbol }, { $set: { volume } });
        console.log(`[VolumeJob] ✓ ${symbol} volume = ${volume}`);
      }

      if (i < stocks.length - 1) await sleep(DELAY_MS);
    }

    console.log("[VolumeJob] ✅ Volume refresh complete");
  } catch (err) {
    console.error("[VolumeJob] ❌ Error:", err.message);
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

  // Target: next 6am ET
  const target = new Date(etNow);
  target.setUTCHours(6, 0, 0, 0);

  // If 6am already passed today, schedule for tomorrow
  if (etNow.getUTCHours() >= 6) {
    target.setUTCDate(target.getUTCDate() + 1);
  }

  // Convert back to UTC
  const targetUTC = new Date(target.getTime() - offsetMs);
  return targetUTC.getTime() - now.getTime();
}

/**
 * Schedules volume refresh to run daily at 6am ET.
 */
function scheduleVolumeRefresh() {
  const ms = msUntil6amET();
  const hours = Math.round(ms / 1000 / 60 / 60);
  console.log(`[VolumeJob] Next refresh in ~${hours}h (6am ET)`);

  setTimeout(() => {
    refreshAllVolumes();
    // Schedule next day
    setInterval(refreshAllVolumes, 24 * 60 * 60 * 1000);
  }, ms);
}

/**
 * Starts the volume job — runs immediately on server start
 * then schedules daily at 6am ET.
 */
function startVolumeJob() {
  refreshAllVolumes();
  scheduleVolumeRefresh();
}

module.exports.startVolumeJob = startVolumeJob;

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET all stocks with cached prices from DB (excludes priceHistory for performance)
router.get("/", async (req, res) => {
  try {
    const stocks = await Stock.find().sort({ symbol: 1 }).select("-priceHistory");
    res.json(stocks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single stock by symbol with full priceHistory for detail page
router.get("/:symbol", async (req, res) => {
  try {
    const stock = await Stock.findOne({ symbol: req.params.symbol.toUpperCase() });
    if (!stock) {
      return res.status(404).json({ message: `Stock ${req.params.symbol.toUpperCase()} not found` });
    }
    res.json(stock);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.startVolumeJob = startVolumeJob;
module.exports = router;