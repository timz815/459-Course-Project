/**
 * Stock Routes
 *
 * Express router for stock data. Prices are fetched from Polygon sequentially
 * (to respect free tier rate limits) and stored in MongoDB.
 *
 * Key behaviours:
 * - GET /api/stocks         → returns all stocks with cached prices from DB
 * - GET /api/stocks/refresh → manually trigger a price refresh (admin use)
 * - Background job runs on server start and every 24 hours after
 * - Sequential fetching with 13s delay between calls (5 req/min free tier)
 * - Frontend reads from DB — always instant, never waits for Polygon
 */

const express = require("express");
const router = express.Router();
const Stock = require("../models/Stock");

const POLYGON_API_KEY = process.env.POLYGON_API_KEY;
const POLYGON_BASE = "https://api.polygon.io";
const DELAY_MS = 13000; // 13s between calls to stay under 5 req/min

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Fetch previous close for one symbol from Polygon
async function fetchPrevClose(symbol) {
  const url = `${POLYGON_BASE}/v2/aggs/ticker/${symbol}/prev?adjusted=true&apiKey=${POLYGON_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();

  if (!res.ok || !data.results || data.results.length === 0) {
    console.log(`[Polygon] No data for ${symbol} (status ${res.status})`);
    return null;
  }

  const result = data.results[0];
  const change = result.c && result.o ? parseFloat((result.c - result.o).toFixed(4)) : null;
  const changePct = result.c && result.o
    ? parseFloat((((result.c - result.o) / result.o) * 100).toFixed(4))
    : null;

  return {
    price: result.c || null,
    open: result.o || null,
    high: result.h || null,
    low: result.l || null,
    volume: result.v || null,
    change,
    changePct,
    priceDate: result.t ? new Date(result.t).toISOString().split("T")[0] : null,
    priceUpdatedAt: new Date(),
  };
}

// Background job — fetches all stock prices sequentially and saves to DB
// Takes ~4 minutes to complete due to rate limiting
let isRefreshing = false;

async function refreshAllPrices() {
  if (isRefreshing) {
    console.log("[PriceJob] Already running, skipping");
    return;
  }

  isRefreshing = true;
  console.log("[PriceJob] Starting price refresh...");

  try {
    const stocks = await Stock.find({}, "symbol");
    const symbols = stocks.map((s) => s.symbol);

    for (let i = 0; i < symbols.length; i++) {
      const symbol = symbols[i];
      const priceData = await fetchPrevClose(symbol);

      if (priceData) {
        await Stock.findOneAndUpdate(
          { symbol },
          { $set: priceData },
          { new: true }
        );
        console.log(`[PriceJob] ✓ ${symbol} = $${priceData.price}`);
      }

      // Wait between calls except after the last one
      if (i < symbols.length - 1) {
        await sleep(DELAY_MS);
      }
    }

    console.log("[PriceJob] ✅ Price refresh complete");
  } catch (err) {
    console.error("[PriceJob] ❌ Error:", err.message);
  } finally {
    isRefreshing = false;
  }
}

// Schedule background job — runs on startup then every 24 hours
function schedulePriceRefresh() {
  // Run immediately on startup
  refreshAllPrices();

  // Then repeat every 24 hours
  setInterval(refreshAllPrices, 24 * 60 * 60 * 1000);
}

// Export so server.js can call it after DB connects
module.exports.schedulePriceRefresh = schedulePriceRefresh;

// GET all stocks with cached prices from DB (public)
router.get("/", async (req, res) => {
  try {
    const stocks = await Stock.find().sort({ symbol: 1 });
    res.json(stocks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET refresh status
router.get("/refresh/status", async (req, res) => {
  const sample = await Stock.findOne({ price: { $ne: null } }, "priceUpdatedAt");
  res.json({
    isRefreshing,
    lastUpdated: sample?.priceUpdatedAt || null,
  });
});

// POST manually trigger a price refresh
router.post("/refresh", async (req, res) => {
  if (isRefreshing) {
    return res.json({ message: "Refresh already in progress" });
  }
  refreshAllPrices(); // fire and forget
  res.json({ message: "Price refresh started — takes ~4 minutes" });
});

router.schedulePriceRefresh = schedulePriceRefresh;
module.exports = router;