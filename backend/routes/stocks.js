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
 * - On server start: checks last candle date — backfills any missed trading days automatically
 * - For normal daily updates: fetches /prev from Polygon per symbol
 * - For backfill: fetches date range from Polygon covering all missed days
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
 * Fetches daily candles for a symbol from Polygon over a date range.
 * fromDate / toDate are "YYYY-MM-DD" strings (inclusive).
 * Returns array of { timestamp, close, volume } or null on failure.
 */
async function fetchDailyRange(symbol, fromDate, toDate) {
  try {
    const url = `${POLYGON_BASE}/v2/aggs/ticker/${symbol}/range/1/day/${fromDate}/${toDate}?adjusted=true&sort=asc&limit=100&apiKey=${POLYGON_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!res.ok || !data.results || data.results.length === 0) {
      console.log(`[DailyJob] No data for ${symbol} ${fromDate}→${toDate} (status ${res.status})`);
      return null;
    }

    return data.results.map((r) => ({
      timestamp: r.t ?? null,
      close: r.c ?? null,
      volume: r.v ?? null,
    }));
  } catch (err) {
    console.error(`[DailyJob] Error fetching ${symbol}:`, err.message);
    return null;
  }
}

/**
 * Returns a YYYY-MM-DD date string offset by `days` from today (ET).
 */
function getETDateString(offsetDays = 0) {
  const now = new Date();
  const offsetMs = (isEasternDST(now) ? -4 : -5) * 60 * 60 * 1000;
  const etNow = new Date(now.getTime() + offsetMs);
  etNow.setUTCDate(etNow.getUTCDate() + offsetDays);
  return etNow.toISOString().slice(0, 10);
}

let isRefreshing = false;

/**
 * Fetches and stores missing daily candles for all stocks sequentially.
 * On server start: checks last candle date and backfills any missed trading days.
 * For normal daily updates (run at 6am ET): adds yesterday's candle.
 * Appends new candles to history3M, trims to MAX_HISTORY_CANDLES, updates volume.
 * Takes ~4 minutes due to rate limiting (13s between calls).
 */
async function refreshAllDailyData() {
  if (isRefreshing) {
    console.log("[DailyJob] Already running, skipping");
    return;
  }

  isRefreshing = true;
  console.log("[DailyJob] Starting daily refresh (volume + history)...");

  const yesterday = getETDateString(-1);

  try {
    const stocks = await Stock.find({}, "symbol history3M");

    for (let i = 0; i < stocks.length; i++) {
      const { symbol, history3M = [] } = stocks[i];

      // Determine from-date: day after the last candle we have, or 90 days ago
      let fromDate;
      if (history3M.length > 0) {
        const lastTs = history3M[history3M.length - 1][0];
        const lastDate = new Date(lastTs);
        lastDate.setUTCDate(lastDate.getUTCDate() + 1);
        fromDate = lastDate.toISOString().slice(0, 10);
      } else {
        fromDate = getETDateString(-90);
      }

      // Already up to date — nothing to fetch
      if (fromDate > yesterday) {
        console.log(`[DailyJob] ✓ ${symbol} — already up to date`);
        if (i < stocks.length - 1) await sleep(DELAY_MS);
        continue;
      }

      const candles = await fetchDailyRange(symbol, fromDate, yesterday);

      if (candles && candles.length > 0) {
        const existingTs = new Set(history3M.map(([ts]) => ts));
        let updatedHistory = [...history3M];

        for (const { timestamp, close } of candles) {
          if (timestamp !== null && close !== null && !existingTs.has(timestamp)) {
            updatedHistory.push([timestamp, close]);
            existingTs.add(timestamp);
          }
        }

        // Trim to keep only the most recent MAX_HISTORY_CANDLES entries
        if (updatedHistory.length > MAX_HISTORY_CANDLES) {
          updatedHistory = updatedHistory.slice(-MAX_HISTORY_CANDLES);
        }

        // Use most recent candle's volume
        const latestVolume = candles[candles.length - 1].volume;

        await Stock.findOneAndUpdate(
          { symbol },
          {
            $set: {
              volume: latestVolume,
              history3M: updatedHistory,
              historyUpdatedAt: new Date(),
            },
          },
        );

        const added = updatedHistory.length - history3M.length;
        console.log(
          `[DailyJob] ✓ ${symbol} — +${added} candle(s), total: ${updatedHistory.length}`,
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

// ─── Admin Stock Search (Polygon) ────────────────────────────────────────────

const EXCHANGE_MAP = {
  XNAS: "NASDAQ",
  XNYS: "NYSE",
  XASE: "NYSE",   // NYSE American (AMEX)
};

// SIC division → sector (matches seed conventions)
const SIC_SECTOR_MAP = {
  "01-09": "Agriculture",
  10: "Energy",
  12: "Energy",
  13: "Energy",
  14: "Basic Materials",
  15: "Industrials",
  16: "Industrials",
  17: "Industrials",
  20: "Consumer Defensive",
  21: "Consumer Defensive",
  22: "Consumer Cyclical",
  23: "Consumer Cyclical",
  24: "Basic Materials",
  25: "Consumer Cyclical",
  26: "Basic Materials",
  27: "Communication Services",
  28: "Healthcare",
  29: "Energy",
  30: "Industrials",
  31: "Consumer Cyclical",
  32: "Industrials",
  33: "Basic Materials",
  34: "Industrials",
  35: "Technology",
  36: "Technology",
  37: "Industrials",
  38: "Technology",
  39: "Consumer Cyclical",
  40: "Industrials",
  41: "Industrials",
  42: "Industrials",
  43: "Communication Services",
  44: "Industrials",
  45: "Industrials",
  46: "Industrials",
  47: "Industrials",
  48: "Communication Services",
  49: "Utilities",
  50: "Consumer Cyclical",
  51: "Consumer Cyclical",
  52: "Consumer Cyclical",
  53: "Consumer Defensive",
  54: "Consumer Defensive",
  55: "Consumer Cyclical",
  56: "Consumer Cyclical",
  57: "Consumer Cyclical",
  58: "Consumer Cyclical",
  59: "Consumer Cyclical",
  60: "Financial Services",
  61: "Financial Services",
  62: "Financial Services",
  63: "Financial Services",
  64: "Financial Services",
  65: "Real Estate",
  67: "Financial Services",
  70: "Consumer Cyclical",
  72: "Consumer Cyclical",
  73: "Technology",
  75: "Consumer Cyclical",
  76: "Industrials",
  78: "Communication Services",
  79: "Communication Services",
  80: "Healthcare",
  81: "Technology",
  82: "Consumer Cyclical",
  83: "Consumer Cyclical",
  84: "Consumer Cyclical",
  86: "Consumer Cyclical",
  87: "Technology",
  89: "Technology",
};

function sicToSector(sicCode) {
  if (!sicCode) return "";
  const prefix = String(sicCode).slice(0, 2);
  return SIC_SECTOR_MAP[prefix] || "";
}

// GET /api/stocks/admin/search?q=... — search Polygon tickers
router.get("/admin/search", verifyAdmin, async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    if (q.length < 1) return res.json([]);

    const url = `${POLYGON_BASE}/v3/reference/tickers?search=${encodeURIComponent(q)}&type=CS&market=stocks&active=true&limit=8&apiKey=${POLYGON_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok || !data.results) {
      return res.json([]);
    }

    const results = data.results
      .filter((t) => EXCHANGE_MAP[t.primary_exchange])
      .map((t) => ({
        symbol: t.ticker,
        name: t.name,
        exchange: EXCHANGE_MAP[t.primary_exchange] || t.primary_exchange,
      }));

    res.json(results);
  } catch (err) {
    console.error("[StockSearch] Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stocks/admin/lookup/:symbol — get full ticker details from Polygon
router.get("/admin/lookup/:symbol", verifyAdmin, async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const url = `${POLYGON_BASE}/v3/reference/tickers/${symbol}?apiKey=${POLYGON_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok || !data.results) {
      return res.status(404).json({ message: `Ticker ${symbol} not found on Polygon` });
    }

    const t = data.results;
    const exchange = EXCHANGE_MAP[t.primary_exchange] || "";
    const sector = sicToSector(t.sic_code);
    const industry = t.sic_description || "";

    res.json({
      symbol: t.ticker,
      name: t.name || "",
      sector,
      industry,
      exchange,
    });
  } catch (err) {
    console.error("[StockLookup] Error:", err.message);
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

    // Seed ~3 months of daily history from Polygon in the background
    const from = getETDateString(-90);
    const to = getETDateString(-1);
    fetchDailyRange(stock.symbol, from, to)
      .then(async (candles) => {
        if (candles && candles.length > 0) {
          const history3M = candles
            .filter((c) => c.timestamp !== null && c.close !== null)
            .map((c) => [c.timestamp, c.close])
            .slice(-MAX_HISTORY_CANDLES);

          const latestVolume = candles[candles.length - 1].volume;

          await Stock.findOneAndUpdate(
            { symbol: stock.symbol },
            { $set: { history3M, volume: latestVolume, historyUpdatedAt: new Date() } },
          );
          console.log(`[AddStock] ✓ ${stock.symbol} — ${history3M.length} candles seeded`);
        } else {
          console.log(`[AddStock] ✗ ${stock.symbol} — no history data from Polygon`);
        }
      })
      .catch((err) => {
        console.error(`[AddStock] ✗ ${stock.symbol} history seed failed:`, err.message);
      });

    res.status(201).json({ message: `Stock ${stock.symbol} added. History is loading in the background.`, stock });
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
