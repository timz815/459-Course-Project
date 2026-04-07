/**
 * Price Queue System
 *
 * Finnhub-only queue for stock price updates and trade execution.
 *
 * Key behaviours:
 * - Stock price updates run during market hours in a continuous even/odd loop
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
 * - When all stocks in the current pass are updated, reload the stock list
 *   from DB (picks up any new stocks) and start a fresh pass immediately
 *
 * Usage:
 *   const { startPriceQueue } = require('./utils/priceQueue');
 *   startPriceQueue(); // called once in server.js after DB connects
 */

const Stock = require("../models/Stock");
const Participant = require("../models/Participant");
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
let lastSnapshotDate = null;

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

// ─── Day Open Snapshot ────────────────────────────────────────────────────────

/**
 * Snapshots every participant's portfolio value at market open.
 * Runs once per calendar day — guarded by lastSnapshotDate.
 * day_change = current portfolio_value − day_open_value.
 */
async function snapshotDayOpen() {
  const now = new Date();
  const etNow = new Date(now.getTime() + (isEasternDST(now) ? -4 : -5) * 60 * 60 * 1000);
  const today = etNow.toISOString().slice(0, 10);
  if (lastSnapshotDate === today) return;
  lastSnapshotDate = today;

  console.log("[PriceQueue] Snapshotting day-open portfolio values...");

  try {
    const [participants, stocks] = await Promise.all([
      Participant.find({}, "holdings cash_balance"),
      Stock.find({}, "symbol price"),
    ]);

    const priceMap = Object.fromEntries(stocks.map((s) => [s.symbol, s.price]));

    const ops = participants.map((p) => {
      const holdingsValue = p.holdings.reduce((sum, h) => {
        const price = priceMap[h.symbol];
        return sum + (price != null ? h.shares * price : h.amount_invested);
      }, 0);
      return {
        updateOne: {
          filter: { _id: p._id },
          update: { $set: { day_open_value: p.cash_balance + holdingsValue } },
        },
      };
    });

    if (ops.length > 0) await Participant.bulkWrite(ops);
    console.log(`[PriceQueue] ✅ Day-open snapshot complete — ${ops.length} participants`);
  } catch (err) {
    console.error("[PriceQueue] ❌ Day-open snapshot error:", err.message);
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
      console.log("[PriceQueue] Market opened — switching to market hours loop");
      runMarketHoursLoop();
      return;
    }

    const second = Math.floor(Date.now() / 1000);
    if (second % 2 !== 0) {
      await executeNextTrade();
    }
  }, 1000);
}

// ─── Market Hours Loop ────────────────────────────────────────────────────────

/**
 * Runs continuously during market hours.
 * Even seconds: update next stock in the circular list.
 * Odd seconds: execute next pending trade (falls back to stock update if none).
 * When all stocks in the current pass are done, reloads the stock list from DB
 * and starts a fresh pass immediately — no pause between passes.
 * Exits when market closes, then runs EOD snapshot and hands off to trade-only loop.
 */
async function runMarketHoursLoop() {
  if (isRunning) return;
  isRunning = true;

  let stocks = await Stock.find({}, "symbol");
  stockList = stocks.map((s) => s.symbol);
  stockPointer = 0;
  let stocksUpdatedThisPass = 0;

  console.log(`[PriceQueue] ── Market hours loop started, ${stockList.length} stocks ──`);

  await snapshotDayOpen();

  return new Promise((resolve) => {
    const interval = setInterval(async () => {
      // Market closed — run EOD snapshot then hand off to trade-only loop
      if (!isMarketOpen()) {
        console.log("[PriceQueue] Market closed — running EOD snapshot");
        clearInterval(interval);
        isRunning = false;
        resolve();
        await refreshAllPricesOnce();
        startTradeOnlyLoop();
        return;
      }

      // All stocks in this pass updated — reload list and start fresh pass
      if (stocksUpdatedThisPass >= stockList.length) {
        console.log(`[PriceQueue] ── Pass complete (${stocksUpdatedThisPass} stocks) — reloading stock list ──`);
        stocks = await Stock.find({}, "symbol");
        stockList = stocks.map((s) => s.symbol);
        stockPointer = 0;
        stocksUpdatedThisPass = 0;
        return;
      }

      const second = Math.floor(Date.now() / 1000);
      const isEven = second % 2 === 0;

      if (isEven) {
        await updateNextStock();
        stocksUpdatedThisPass++;
      } else {
        const tradeExecuted = await executeNextTrade();
        if (!tradeExecuted) {
          await updateNextStock();
          stocksUpdatedThisPass++;
        }
      }
    }, 1000);
  });
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
    // Market open — start continuous market hours loop
    runMarketHoursLoop();
  } else {
    // Market closed — snapshot prices first, then trade-only loop
    await refreshAllPricesOnce();
    startTradeOnlyLoop();
  }
}

module.exports = { startPriceQueue };