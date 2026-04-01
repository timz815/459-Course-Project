/**
 * Seed Script — Stock History
 *
 * Fetches ~3 months of daily closing prices from Polygon for every stock
 * currently in the database and stores them as [timestamp, close] tuples
 * in the history3M field.
 *
 * Usage:
 *   node seed/seedHistory.js
 *
 * Run AFTER seedStocks.js. Safe to re-run — overwrites history3M on each stock.
 * Dynamic — queries DB for current stocks rather than hardcoding symbols,
 * so adding new stocks to seedStocks.js and re-running both scripts is all
 * that's needed to get history for new additions.
 *
 * Rate limiting: Polygon free tier allows 5 requests/min.
 * 13 second delay between calls keeps us safely under that limit.
 * 20 stocks takes ~4 minutes to seed.
 */

require("dotenv").config({ path: "./.env" });
const mongoose = require("mongoose");
const Stock = require("../models/Stock");

const POLYGON_API_KEY = process.env.POLYGON_API_KEY;
const POLYGON_BASE = "https://api.polygon.io";
const DELAY_MS = 13000;
const MAX_CANDLES = 63; // ~3 months of trading days

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Returns a YYYY-MM-DD date string offset by `days` from today.
 * Negative values go into the past.
 */
function getDateString(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

/**
 * Fetches daily candles for a symbol from Polygon over the last ~3 months.
 * Returns array of [timestamp, close] tuples sorted ascending, or null on failure.
 */
async function fetchDailyCandles(symbol) {
  try {
    const from = getDateString(-90); // 90 days back covers ~63 trading days
    const to = getDateString(-1);    // up to yesterday — never today

    const url = `${POLYGON_BASE}/v2/aggs/ticker/${symbol}/range/1/day/${from}/${to}?adjusted=true&sort=asc&limit=100&apiKey=${POLYGON_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!res.ok || !data.results || data.results.length === 0) {
      console.log(`[SeedHistory] No data for ${symbol} (status ${res.status})`);
      return null;
    }

    // Store as [timestamp, close] tuples, trimmed to MAX_CANDLES
    const candles = data.results
      .map((r) => [r.t, r.c])
      .slice(-MAX_CANDLES);

    return candles;
  } catch (err) {
    console.error(`[SeedHistory] Error fetching ${symbol}:`, err.message);
    return null;
  }
}

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverApi: { version: "1", strict: true, deprecationErrors: true },
    });
    console.log("✅ Connected to MongoDB");

    // Dynamic — pulls whatever stocks exist in DB right now
    const stocks = await Stock.find({}, "symbol");
    console.log(`\n[SeedHistory] Found ${stocks.length} stocks to seed\n`);

    for (let i = 0; i < stocks.length; i++) {
      const { symbol } = stocks[i];
      const candles = await fetchDailyCandles(symbol);

      if (candles) {
        await Stock.findOneAndUpdate(
          { symbol },
          {
            $set: {
              history3M: candles,
              historyUpdatedAt: new Date(),
            },
          }
        );
        console.log(`  ↳ ✓ ${symbol} — ${candles.length} candles stored`);
      } else {
        console.log(`  ↳ ✗ ${symbol} — skipped (no data)`);
      }

      // Rate limit: wait between calls except after the last one
      if (i < stocks.length - 1) {
        console.log(`     waiting ${DELAY_MS / 1000}s...`);
        await sleep(DELAY_MS);
      }
    }

    console.log("\n✅ History seeding complete");
  } catch (err) {
    console.error("❌ Seed failed:", err);
  } finally {
    await mongoose.disconnect();
  }
}

seed();