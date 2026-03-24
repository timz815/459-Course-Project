/**
 * Price Queue System
 *
 * Two queue system for managing stock price updates and trade execution.
 *
 * Key behaviours:
 * - Runs on fixed 15 minute ET clock-aligned windows (9:30, 9:45, 10:00 ... 3:45)
 * - Even seconds: always update next stock in circular queue
 * - Odd seconds: execute next pending trade if any, otherwise update next stock
 * - 1 Finnhub call per second — never exceeds free tier limits
 * - Stock price updates stored in priceHistory during market hours only
 * - Waits for next 15 minute mark on server start — never jumps mid-window
 * - Both queues pause outside market hours
 * - Trade execution delegated to executeTrade utility
 *
 * Usage:
 *   const { startPriceQueue } = require('./utils/priceQueue');
 *   startPriceQueue(); // called once in server.js after DB connects
 */

const Stock = require("../models/Stock");
const TradeQueue = require("../models/TradeQueue");
const { executeTrade } = require("./executeTrade");
const { isMarketOpen } = require("./marketHours");

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
const FINNHUB_BASE = "https://finnhub.io/api/v1";
const MAX_PRICE_HISTORY = 78; // 26 per trading day × 3 trading days

// ─── State ────────────────────────────────────────────────────────────────────

let stockList = [];       // all stock symbols loaded from DB
let stockPointer = 0;     // current position in circular stock queue
let isRunning = false;    // prevents overlapping cycles

// ─── Finnhub ──────────────────────────────────────────────────────────────────

/**
 * Fetches current quote for a symbol from Finnhub.
 * Returns null on failure — never throws.
 * @param {string} symbol
 * @returns {Promise<{ price, change, changePct }|null>}
 */
async function fetchQuote(symbol) {
  try {
    const url = `${FINNHUB_BASE}/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!res.ok || !data.c || data.c === 0) {
      console.log(`[PriceQueue] No quote data for ${symbol}`);
      return null;
    }

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

  // Only store price history during market hours
  if (isMarketOpen()) {
    const timestamp = Date.now();
    await Stock.findOneAndUpdate(
      { symbol },
      {
        $set: updateFields,
        $push: {
          priceHistory: {
            $each: [[timestamp, quote.price]],
            $slice: -MAX_PRICE_HISTORY, // keep only most recent 78 entries
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
 * Updates the TradeQueue document with the result.
 * Returns true if a trade was processed, false if queue was empty.
 * @returns {Promise<boolean>}
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

  // Update queue document with result
  queued.status = result.success ? "executed" : "failed";
  queued.message = result.message;
  queued.executedAt = new Date();
  if (result.success && result.trade) {
    queued.trade = result.trade._id;
  }
  await queued.save();

  console.log(`[PriceQueue] Trade ${queued._id} ${queued.status}: ${result.message}`);
  return true;
}

// ─── Scheduler ────────────────────────────────────────────────────────────────

/**
 * Returns milliseconds until the next 15 minute ET clock mark.
 * Marks are at :00, :15, :30, :45 of each hour.
 * If outside market hours, returns ms until next market open (9:30am ET).
 * @returns {number}
 */
function msUntilNextWindow() {
  const now = new Date();

  // Convert to ET
  const isDST = isEasternDST(now);
  const offsetMs = (isDST ? -4 : -5) * 60 * 60 * 1000;
  const etNow = new Date(now.getTime() + offsetMs);

  const etHours = etNow.getUTCHours();
  const etMinutes = etNow.getUTCMinutes();
  const etSeconds = etNow.getUTCSeconds();
  const etMs = etNow.getUTCMilliseconds();
  const etDay = etNow.getUTCDay();

  const totalMinutes = etHours * 60 + etMinutes;
  const marketOpenMinutes = 9 * 60 + 30;   // 570
  const marketCloseMinutes = 16 * 60;       // 960

  // If market is open, find next 15 min mark
  if (etDay >= 1 && etDay <= 5 && totalMinutes >= marketOpenMinutes && totalMinutes < marketCloseMinutes) {
    const minutesIntoCurrentWindow = etMinutes % 15;
    const secondsIntoCurrentMinute = etSeconds + etMs / 1000;
    const msUntilNextMark =
      ((15 - minutesIntoCurrentWindow) * 60 - etSeconds) * 1000 - etMs;
    return msUntilNextMark;
  }

  // Market is closed — calculate ms until next 9:30am ET
  // Start from tomorrow if past 4pm, or today if before 9:30am
  let targetDay = new Date(etNow);
  targetDay.setUTCHours(9, 30, 0, 0);

  if (totalMinutes >= marketCloseMinutes) {
    // Past close — target tomorrow
    targetDay.setUTCDate(targetDay.getUTCDate() + 1);
  }

  // Skip weekends
  while (targetDay.getUTCDay() === 0 || targetDay.getUTCDay() === 6) {
    targetDay.setUTCDate(targetDay.getUTCDate() + 1);
  }

  // Convert target back to UTC and get difference
  const targetUTC = new Date(targetDay.getTime() - offsetMs);
  return targetUTC.getTime() - now.getTime();
}

/**
 * Runs one complete 15 minute window cycle.
 * Ticks every second — even seconds update stocks, odd seconds execute trades
 * (falling back to stock update if no trades pending).
 * Stops when all stocks have been updated once or market closes.
 */
async function runCycle() {
  if (isRunning) return;
  isRunning = true;

  // Reload stock list fresh each cycle in case stocks were added
  const stocks = await Stock.find({}, "symbol");
  stockList = stocks.map((s) => s.symbol);
  const totalStocks = stockList.length;
  let stocksUpdatedThisCycle = 0;

  console.log(`[PriceQueue] ── Starting new cycle, ${totalStocks} stocks ──`);

  return new Promise((resolve) => {
    const interval = setInterval(async () => {
      // Stop if market closes mid-cycle
      if (!isMarketOpen()) {
        console.log("[PriceQueue] Market closed — pausing cycle");
        clearInterval(interval);
        isRunning = false;
        resolve();
        return;
      }

      // Stop once all stocks updated this cycle
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
    } else {
      console.log("[PriceQueue] Market closed — skipping cycle");
    }
    // Schedule next cycle regardless
    scheduleNextCycle();
  }, ms);
}

// ─── Entry Point ──────────────────────────────────────────────────────────────

/**
 * Starts the price queue system.
 * Called once in server.js after DB connects.
 */
async function startPriceQueue() {
  console.log("[PriceQueue] Starting...");

  // Load initial stock list
  const stocks = await Stock.find({}, "symbol");
  stockList = stocks.map((s) => s.symbol);
  console.log(`[PriceQueue] Loaded ${stockList.length} stocks`);

  scheduleNextCycle();
}

// Need isEasternDST for msUntilNextWindow — import from marketHours
const { isEasternDST } = require("./marketHours");

module.exports = { startPriceQueue };