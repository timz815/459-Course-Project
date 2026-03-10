/**
 * Seed Script — Stocks
 *
 * Run once to populate the database with the initial 20 stocks.
 * Usage: node seed/seedStocks.js
 *
 * Safe to re-run — uses upsert so it won't duplicate entries.
 */

require("dotenv").config({ path: "./.env" });
const mongoose = require("mongoose");
const Stock = require("../models/Stock");

const stocks = [
  { symbol: "NVDA",  name: "NVIDIA Corporation",          sector: "Technology",          industry: "Semiconductors",              exchange: "NASDAQ" },
  { symbol: "AAPL",  name: "Apple Inc.",                   sector: "Technology",          industry: "Consumer Electronics",        exchange: "NASDAQ" },
  { symbol: "GOOG",  name: "Alphabet Inc.",                sector: "Technology",          industry: "Internet Content & Information", exchange: "NASDAQ" },
  { symbol: "MSFT",  name: "Microsoft Corporation",        sector: "Technology",          industry: "Software - Infrastructure",   exchange: "NASDAQ" },
  { symbol: "AMZN",  name: "Amazon.com Inc.",              sector: "Consumer Cyclical",   industry: "Internet Retail",             exchange: "NASDAQ" },
  { symbol: "META",  name: "Meta Platforms Inc.",          sector: "Technology",          industry: "Internet Content & Information", exchange: "NASDAQ" },
  { symbol: "AVGO",  name: "Broadcom Inc.",                sector: "Technology",          industry: "Semiconductors",              exchange: "NASDAQ" },
  { symbol: "TSLA",  name: "Tesla Inc.",                   sector: "Consumer Cyclical",   industry: "Auto Manufacturers",          exchange: "NASDAQ" },
  { symbol: "BRK.A", name: "Berkshire Hathaway Inc.",      sector: "Financial Services",  industry: "Insurance - Diversified",     exchange: "NYSE"   },
  { symbol: "WMT",   name: "Walmart Inc.",                 sector: "Consumer Defensive",  industry: "Discount Stores",             exchange: "NYSE"   },
  { symbol: "LLY",   name: "Eli Lilly and Company",        sector: "Healthcare",          industry: "Drug Manufacturers",          exchange: "NYSE"   },
  { symbol: "JPM",   name: "JPMorgan Chase & Co.",         sector: "Financial Services",  industry: "Banks - Diversified",         exchange: "NYSE"   },
  { symbol: "V",     name: "Visa Inc.",                    sector: "Financial Services",  industry: "Credit Services",             exchange: "NYSE"   },
  { symbol: "JNJ",   name: "Johnson & Johnson",            sector: "Healthcare",          industry: "Drug Manufacturers",          exchange: "NYSE"   },
  { symbol: "MA",    name: "Mastercard Incorporated",      sector: "Financial Services",  industry: "Credit Services",             exchange: "NYSE"   },
  { symbol: "MU",    name: "Micron Technology Inc.",       sector: "Technology",          industry: "Semiconductors",              exchange: "NASDAQ" },
  { symbol: "COST",  name: "Costco Wholesale Corporation", sector: "Consumer Defensive",  industry: "Discount Stores",             exchange: "NASDAQ" },
  { symbol: "ORCL",  name: "Oracle Corporation",           sector: "Technology",          industry: "Software - Infrastructure",   exchange: "NYSE"   },
  { symbol: "NFLX",  name: "Netflix Inc.",                 sector: "Communication Services", industry: "Entertainment",            exchange: "NASDAQ" },
  { symbol: "ABBV",  name: "AbbVie Inc.",                  sector: "Healthcare",          industry: "Drug Manufacturers",          exchange: "NYSE"   },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverApi: { version: "1", strict: true, deprecationErrors: true },
    });
    console.log("✅ Connected to MongoDB");

    for (const stock of stocks) {
      await Stock.findOneAndUpdate(
        { symbol: stock.symbol },
        stock,
        { upsert: true, new: true }
      );
      console.log(`  ↳ Upserted ${stock.symbol} — ${stock.name}`);
    }

    console.log("\n✅ Seeding complete — 20 stocks in database");
  } catch (err) {
    console.error("❌ Seed failed:", err);
  } finally {
    await mongoose.disconnect();
  }
}

seed();