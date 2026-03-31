/**
 * Price Queue System
 *
 * Finnhub-only queue for stock price updates and trade execution.
 *
 * Key behaviours:
 * - Stock price updates run during market hours on 15 minute ET windows
 * - When market closes or server starts outside market hours:
 *   runs one full EOD price snapshot across all stocks, then enters trade-only loop
 * - Trade execution runs 24/5 — weekdays only
 * - isPendingUntilOpen covers Friday after close, weekends,
 *   Monday pre-market, and market holidays — trades stay pending
 * - Even seconds: update next stock (market hours only)
 * - Odd seconds: execute next pending trade if any, otherwise update next stock
 * - 1 Finnhub call per second — never exceeds free tier limits
 * - previousClose (pc) stored from Finnhub quote on every update
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
const { isMarketOpen, isPendingUntilOpen, isEasternDST } = require("./marketHours");

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
const FINNHUB_BASE = "https://finnhub.io/api/v1";
const MAX_PRICE_HISTORY = 78;

// ─── State ────────────────────────────────────────────────────────────────────

let stockList = [];
let stockPointer = 0;
let isRunning = false;
let isSnapshoting = false;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
      previousClose: data.pc ?? null,
      open: data.o ?? null,
      high: data.h ?? null,
      low: data.l ?? null,
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
 * Only writes to priceHistory during market hours.
 */
async function updateNextStock() {
  if (stockList.length === 0) return;

  const symbol = stockList[stockPointer];
  stockPointer = (stockPointer + 1) % stockList.length;

  const quote = await fetchQuote(symbol);
  if (!quote) return;

  const updateFields = {
    price: quote.price,
    previousClose: quote.previousClose,
    open: quote.open,
    high: quote.high,
    low: quote.low,
    change: quote.change,
    changePct: quote.changePct,
    priceUpdatedAt: new Date(),
  };

  // Only write priceHistory during market hours
  if (isMarketOpen()) {
    await Stock.findOneAndUpdate(
      { symbol },
      {
        $set: updateFields,
        $push: {
          priceHistory: {
            $each: [[Date.now(), quote.price]],
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

// ─── EOD Snapshot ─────────────────────────────────────────────────────────────

/**
 * Runs one full pass through all stocks to capture latest prices.
 * Called when market closes or server starts outside market hours.
 * 1 second between calls to stay under Finnhub free tier limits.
 * Guards against concurrent runs with isSnapshoting flag.
 */
async function refreshAllPricesOnce() {
  if (isSnapshoting) {
    console.log("[PriceQueue] Snapshot already running, skipping");
    return;
  }

  isSnapshoting = true;
  console.log("[PriceQueue] Starting EOD price snapshot...");

  try {
    // Reload stock list fresh
    const stocks = await Stock.find({}, "symbol");
    stockList = stocks.map((s) => s.symbol);

    for (let i = 0; i < stockList.length; i++) {
      await updateNextStock();
      // Wait 1s between calls except after the last one
      if (i < stockList.length - 1) await sleep(1000);
    }

    console.log("[PriceQueue] ✅ EOD snapshot complete");
  } catch (err) {
    console.error("[PriceQueue] ❌ Snapshot error:", err.message);
  } finally {
    isSnapshoting = false;
  }
}

// ─── Trade Execution ──────────────────────────────────────────────────────────

/**
 * Pulls the oldest pending trade from the queue and executes it.
 * Returns false if isPendingUntilOpen — trades stay untouched in queue.
 * Returns true if a trade was processed, false if queue was empty.
 */
async function executeNextTrade() {
  // Hold trades pending over weekend, holidays, Friday after close, Monday pre-market
  if (isPendingUntilOpen()) return false;

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

  // Don't mark as failed if trade is pending until market open
  if (result.pending) return false;

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
 * falling back to stock update if no trades pending.
 * Stops when all stocks updated once or market closes.
 */
async function runCycle() {
  if (isRunning) return;
  isRunning = true;

  const stocks = await Stock.find({}, "symbol");
  stockList = stocks.map((s) => s.symbol);
  const totalStocks = stockList.length;
  let stocksUpdatedThisCycle = 0;

  console.log(`[PriceQueue] ── Starting new cycle, ${totalStocks} stocks ──`);

  return new Promise((resolve) => {
    const interval = setInterval(async () => {
      // Market closed mid-cycle — run EOD snapshot then hand off to trade-only loop
      if (!isMarketOpen()) {
        console.log("[PriceQueue] Market closed mid-cycle — running EOD snapshot");
        clearInterval(interval);
        isRunning = false;
        resolve();
        await refreshAllPricesOnce();
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
        await updateNextStock();
        stocksUpdatedThisCycle++;
      } else {
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
      await refreshAllPricesOnce();
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
    // Market open — jump straight into cycle
    scheduleNextCycle();
  } else {
    // Market closed — snapshot prices first, then trade-only loop
    await refreshAllPricesOnce();
    startTradeOnlyLoop();
  }
}

module.exports = { startPriceQueue };