/**
 * Price Queue System
 *
 * Two queue system for managing stock price updates and trade execution.
 *
 * Key behaviours:
 * - Stock price updates only run during market hours on 15 minute ET windows
 * - Trade execution runs 24/7 regardless of market hours
 * - Even seconds: update next stock (market hours only)
 * - Odd seconds: execute next pending trade if any, otherwise update next stock
 * - 1 Finnhub call per second — never exceeds free tier limits
 * - Price history stored in priceHistory during market hours only
 * - Waits for next 15 minute mark on server start — never jumps mid-window
 *
 * Usage:
 *   const { startPriceQueue } = require('./utils/priceQueue');
 *   startPriceQueue(); // called once in server.js after DB connects
 */

const Stock = require("../models/Stock");
const TradeQueue = require("../models/TradeQueue");
const { executeTrade } = require("./executeTrade");
const { isMarketOpen, isEasternDST } = require("./marketHours");

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
const FINNHUB_BASE = "https://finnhub.io/api/v1";
const MAX_PRICE_HISTORY = 78; // 26 per trading day × 3 trading days

// ─── State ────────────────────────────────────────────────────────────────────

let stockList = [];    // all stock symbols loaded from DB
let stockPointer = 0;  // current position in circular stock queue
let isRunning = false; // prevents overlapping price update cycles

// ─── Finnhub ──────────────────────────────────────────────────────────────────

/**
 * Fetches current quote for a symbol from Finnhub.
 * Returns null on failure — never throws.
 */
async function fetchQuote(symbol) {
  try {
    const url = `${FINNHUB_BASE}/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok || !data.c || data.c === 0) return null;
    return {
      price: data.c,
      change: data.d ?? null,
      changePct: data.dp ?? null,
    };
  } catch (err) {
    console.error(`[PriceQueue] Finnhub error for ${symbol}:`, err.message);
    return null;
  }
}

// ─── Stock Update ─────────────────────────────────────────────────────────────

/**
 * Updates the next stock in the circular queue.
 * Only called during market hours.
 * Advances the pointer regardless of success or failure.
 */
async function updateNextStock() {
  if (stockList.length === 0) return;

  const symbol = stockList[stockPointer];
  stockPointer = (stockPointer + 1) % stockList.length;

  const quote = await fetchQuote(symbol);
  if (!quote) return;

  const updateFields = {
    price: quote.price,
    change: quote.change,
    changePct: quote.changePct,
    priceUpdatedAt: new Date(),
  };

  // Store price history during market hours only
  if (isMarketOpen()) {
    const timestamp = Date.now();
    await Stock.findOneAndUpdate(
      { symbol },
      {
        $set: updateFields,
        $push: {
          priceHistory: {
            $each: [[timestamp, quote.price]],
            $slice: -MAX_PRICE_HISTORY,
          },
        },
      }
    );
  } else {
    await Stock.findOneAndUpdate({ symbol }, { $set: updateFields });
  }

  console.log(`[PriceQueue] ✓ ${symbol} = $${quote.price} (${quote.changePct?.toFixed(2)}%)`);
}

// ─── Trade Execution ──────────────────────────────────────────────────────────

/**
 * Pulls the oldest pending trade from the queue and executes it.
 * Runs 24/7 regardless of market hours.
 * Returns true if a trade was processed, false if queue was empty.
 */
async function executeNextTrade() {
  const queued = await TradeQueue.findOne({ status: "pending" }).sort({ submittedAt: 1 });
  if (!queued) return false;

  console.log(`[PriceQueue] Executing trade ${queued._id} — ${queued.side} $${queued.dollar_amount} of ${queued.symbol}`);

  const result = await executeTrade({
    userId: queued.user,
    tournamentId: queued.tournament,
    symbol: queued.symbol,
    side: queued.side,
    dollar_amount: queued.dollar_amount,
  });

  queued.status = result.success ? "executed" : "failed";
  queued.message = result.message;
  queued.executedAt = new Date();
  if (result.success && result.trade) queued.trade = result.trade._id;
  await queued.save();

  console.log(`[PriceQueue] Trade ${queued._id} ${queued.status}: ${result.message}`);
  return true;
}

// ─── Trade Only Loop ──────────────────────────────────────────────────────────

/**
 * Runs continuously outside market hours processing trades only.
 * Checks every odd second for pending trades.
 * Stops when market opens so the full cycle can take over.
 */
function startTradeOnlyLoop() {
  console.log("[PriceQueue] Market closed — trade-only loop running");

  const interval = setInterval(async () => {
    // Stop when market opens — full cycle takes over
    if (isMarketOpen()) {
      clearInterval(interval);
      console.log("[PriceQueue] Market opened — switching to full cycle");
      scheduleNextCycle();
      return;
    }

    const second = Math.floor(Date.now() / 1000);
    if (second % 2 !== 0) {
      await executeNextTrade();
    }
  }, 1000);
}

// ─── Scheduler ────────────────────────────────────────────────────────────────

/**
 * Returns milliseconds until the next 15 minute ET clock mark.
 * Marks are at :00, :15, :30, :45 of each hour during market hours.
 * If market is closed returns ms until next 9:30am ET.
 */
function msUntilNextWindow() {
  const now = new Date();
  const isDST = isEasternDST(now);
  const offsetMs = (isDST ? -4 : -5) * 60 * 60 * 1000;
  const etNow = new Date(now.getTime() + offsetMs);

  const etHours = etNow.getUTCHours();
  const etMinutes = etNow.getUTCMinutes();
  const etSeconds = etNow.getUTCSeconds();
  const etMs = etNow.getUTCMilliseconds();
  const etDay = etNow.getUTCDay();

  const totalMinutes = etHours * 60 + etMinutes;
  const marketOpenMinutes = 9 * 60 + 30;
  const marketCloseMinutes = 16 * 60;

  // Market is open — find next 15 min mark
  if (etDay >= 1 && etDay <= 5 && totalMinutes >= marketOpenMinutes && totalMinutes < marketCloseMinutes) {
    const minutesIntoCurrentWindow = etMinutes % 15;
    const msUntilNextMark = ((15 - minutesIntoCurrentWindow) * 60 - etSeconds) * 1000 - etMs;
    return msUntilNextMark;
  }

  // Market closed — calculate ms until next 9:30am ET
  let targetDay = new Date(etNow);
  targetDay.setUTCHours(9, 30, 0, 0);

  if (totalMinutes >= marketCloseMinutes) {
    targetDay.setUTCDate(targetDay.getUTCDate() + 1);
  }

  // Skip weekends
  while (targetDay.getUTCDay() === 0 || targetDay.getUTCDay() === 6) {
    targetDay.setUTCDate(targetDay.getUTCDate() + 1);
  }

  const targetUTC = new Date(targetDay.getTime() - offsetMs);
  return targetUTC.getTime() - now.getTime();
}

/**
 * Runs one complete 15 minute window cycle.
 * Even seconds update stocks, odd seconds execute trades
 * (falling back to stock update if no trades pending).
 * Stops when all stocks updated once or market closes.
 */
async function runCycle() {
  if (isRunning) return;
  isRunning = true;

  // Reload stock list fresh each cycle
  const stocks = await Stock.find({}, "symbol");
  stockList = stocks.map((s) => s.symbol);
  const totalStocks = stockList.length;
  let stocksUpdatedThisCycle = 0;

  console.log(`[PriceQueue] ── Starting new cycle, ${totalStocks} stocks ──`);

  return new Promise((resolve) => {
    const interval = setInterval(async () => {
      // Market closed mid-cycle — stop and hand off to trade-only loop
      if (!isMarketOpen()) {
        console.log("[PriceQueue] Market closed mid-cycle — stopping");
        clearInterval(interval);
        isRunning = false;
        resolve();
        startTradeOnlyLoop();
        return;
      }

      // All stocks updated — cycle complete
      if (stocksUpdatedThisCycle >= totalStocks) {
        console.log(`[PriceQueue] ── Cycle complete, ${stocksUpdatedThisCycle} stocks updated ──`);
        clearInterval(interval);
        isRunning = false;
        resolve();
        return;
      }

      const second = Math.floor(Date.now() / 1000);
      const isEven = second % 2 === 0;

      if (isEven) {
        // Even second — always update next stock
        await updateNextStock();
        stocksUpdatedThisCycle++;
      } else {
        // Odd second — trade first, fall back to stock update
        const tradeExecuted = await executeNextTrade();
        if (!tradeExecuted) {
          await updateNextStock();
          stocksUpdatedThisCycle++;
        }
      }
    }, 1000);
  });
}

/**
 * Main scheduler loop.
 * Waits for next 15 minute ET window, runs a cycle, then repeats.
 */
async function scheduleNextCycle() {
  const ms = msUntilNextWindow();
  const seconds = Math.round(ms / 1000);
  console.log(`[PriceQueue] Next cycle in ${seconds}s`);

  setTimeout(async () => {
    if (isMarketOpen()) {
      await runCycle();
      scheduleNextCycle();
    } else {
      startTradeOnlyLoop();
    }
  }, ms);
}

// ─── Entry Point ──────────────────────────────────────────────────────────────

/**
 * Starts the price queue system.
 * Called once in server.js after DB connects.
 */
async function startPriceQueue() {
  console.log("[PriceQueue] Starting...");

  const stocks = await Stock.find({}, "symbol");
  stockList = stocks.map((s) => s.symbol);
  console.log(`[PriceQueue] Loaded ${stockList.length} stocks`);

  if (isMarketOpen()) {
    scheduleNextCycle();
  } else {
    // Market closed — start trade-only loop immediately
    startTradeOnlyLoop();
  }
}

module.exports = { startPriceQueue };