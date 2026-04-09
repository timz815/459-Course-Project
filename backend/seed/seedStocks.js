/**
 * Seed Script — Stocks
 *
 * Run once to populate the database with stocks.
 * Usage: node seed/seedStocks.js
 *
 * Safe to re-run — uses upsert so it won't duplicate entries.
 */

require("dotenv").config({ path: "./.env" });
const mongoose = require("mongoose");
const Stock = require("../models/Stock");

const stocks = [
  // ── Technology ───────────────────────────────────────────────────────────────
  { symbol: "NVDA",  name: "NVIDIA Corporation",                   sector: "Technology",             industry: "Semiconductors",                      exchange: "NASDAQ" },
  { symbol: "AAPL",  name: "Apple Inc.",                           sector: "Technology",             industry: "Consumer Electronics",                exchange: "NASDAQ" },
  { symbol: "GOOGL", name: "Alphabet Inc. (Class A)",              sector: "Technology",             industry: "Internet Content & Information",       exchange: "NASDAQ" },
  { symbol: "MSFT",  name: "Microsoft Corporation",                sector: "Technology",             industry: "Software - Infrastructure",           exchange: "NASDAQ" },
  { symbol: "AVGO",  name: "Broadcom Inc.",                        sector: "Technology",             industry: "Semiconductors",                      exchange: "NASDAQ" },
  { symbol: "TSM",   name: "Taiwan Semiconductor Manufacturing",   sector: "Technology",             industry: "Semiconductors",                      exchange: "NYSE"   },
  { symbol: "META",  name: "Meta Platforms Inc.",                  sector: "Technology",             industry: "Internet Content & Information",       exchange: "NASDAQ" },
  { symbol: "ASML",  name: "ASML Holding N.V.",                    sector: "Technology",             industry: "Semiconductor Equipment",             exchange: "NASDAQ" },
  { symbol: "MU",    name: "Micron Technology Inc.",               sector: "Technology",             industry: "Semiconductors",                      exchange: "NASDAQ" },
  { symbol: "ORCL",  name: "Oracle Corporation",                   sector: "Technology",             industry: "Software - Infrastructure",           exchange: "NYSE"   },
  { symbol: "AMD",   name: "Advanced Micro Devices Inc.",          sector: "Technology",             industry: "Semiconductors",                      exchange: "NASDAQ" },
  { symbol: "PLTR",  name: "Palantir Technologies Inc.",           sector: "Technology",             industry: "Software - Infrastructure",           exchange: "NYSE"   },
  { symbol: "CSCO",  name: "Cisco Systems Inc.",                   sector: "Technology",             industry: "Communication Equipment",             exchange: "NASDAQ" },
  { symbol: "ACN",   name: "Accenture plc",                       sector: "Technology",             industry: "Information Technology Services",     exchange: "NYSE"   },
  { symbol: "ADBE",  name: "Adobe Inc.",                           sector: "Technology",             industry: "Software - Infrastructure",           exchange: "NASDAQ" },
  { symbol: "CRM",   name: "Salesforce Inc.",                      sector: "Technology",             industry: "Software - Application",              exchange: "NYSE"   },
  { symbol: "INTC",  name: "Intel Corporation",                    sector: "Technology",             industry: "Semiconductors",                      exchange: "NASDAQ" },
  { symbol: "DHR",   name: "Danaher Corporation",                  sector: "Healthcare",             industry: "Diagnostics & Research",              exchange: "NYSE"   },
  { symbol: "TXN",   name: "Texas Instruments Incorporated",      sector: "Technology",             industry: "Semiconductors",                      exchange: "NASDAQ" },
  { symbol: "QCOM",  name: "Qualcomm Incorporated",               sector: "Technology",             industry: "Semiconductors",                      exchange: "NASDAQ" },
  { symbol: "HON",   name: "Honeywell International Inc.",         sector: "Industrials",            industry: "Conglomerates",                       exchange: "NASDAQ" },
  { symbol: "IBM",   name: "International Business Machines",      sector: "Technology",             industry: "Information Technology Services",     exchange: "NYSE"   },
  { symbol: "AMAT",  name: "Applied Materials Inc.",               sector: "Technology",             industry: "Semiconductor Equipment",             exchange: "NASDAQ" },
  { symbol: "INTU",  name: "Intuit Inc.",                          sector: "Technology",             industry: "Software - Application",              exchange: "NASDAQ" },
  { symbol: "SPGI",  name: "S&P Global Inc.",                      sector: "Financial Services",     industry: "Financial Data & Stock Exchanges",    exchange: "NYSE"   },
  { symbol: "NOW",   name: "ServiceNow Inc.",                      sector: "Technology",             industry: "Software - Application",              exchange: "NYSE"   },
  { symbol: "ADP",   name: "Automatic Data Processing Inc.",       sector: "Technology",             industry: "Information Technology Services",     exchange: "NASDAQ" },
  { symbol: "ROP",   name: "Roper Technologies Inc.",              sector: "Technology",             industry: "Software - Application",              exchange: "NASDAQ" },
  { symbol: "CDNS",  name: "Cadence Design Systems Inc.",          sector: "Technology",             industry: "Software - Application",              exchange: "NASDAQ" },
  { symbol: "PAYX",  name: "Paychex Inc.",                         sector: "Technology",             industry: "Information Technology Services",     exchange: "NASDAQ" },
  { symbol: "PAYC",  name: "Paycom Software Inc.",                 sector: "Technology",             industry: "Software - Application",              exchange: "NYSE"   },
  { symbol: "ZBRA",  name: "Zebra Technologies Corporation",       sector: "Technology",             industry: "Computer Hardware",                   exchange: "NASDAQ" },
  { symbol: "CTSH",  name: "Cognizant Technology Solutions",       sector: "Technology",             industry: "Information Technology Services",     exchange: "NASDAQ" },
  { symbol: "ANET",  name: "Arista Networks Inc.",                 sector: "Technology",             industry: "Computer Hardware",                   exchange: "NYSE"   },
  { symbol: "FTNT",  name: "Fortinet Inc.",                        sector: "Technology",             industry: "Software - Infrastructure",           exchange: "NASDAQ" },
  { symbol: "DDOG",  name: "Datadog Inc.",                         sector: "Technology",             industry: "Software - Application",              exchange: "NASDAQ" },
  { symbol: "NET",   name: "Cloudflare Inc.",                      sector: "Technology",             industry: "Software - Infrastructure",           exchange: "NYSE"   },
  { symbol: "TEAM",  name: "Atlassian Corporation",                sector: "Technology",             industry: "Software - Application",              exchange: "NASDAQ" },
  { symbol: "SNOW",  name: "Snowflake Inc.",                       sector: "Technology",             industry: "Software - Application",              exchange: "NYSE"   },
  { symbol: "HUBS",  name: "HubSpot Inc.",                         sector: "Technology",             industry: "Software - Application",              exchange: "NYSE"   },
  { symbol: "OKTA",  name: "Okta Inc.",                            sector: "Technology",             industry: "Software - Infrastructure",           exchange: "NASDAQ" },
  { symbol: "MDB",   name: "MongoDB Inc.",                         sector: "Technology",             industry: "Software - Infrastructure",           exchange: "NASDAQ" },
  { symbol: "PANW",  name: "Palo Alto Networks Inc.",              sector: "Technology",             industry: "Software - Infrastructure",           exchange: "NASDAQ" },
  { symbol: "CRWD",  name: "CrowdStrike Holdings Inc.",            sector: "Technology",             industry: "Software - Infrastructure",           exchange: "NASDAQ" },
  { symbol: "SHOP",  name: "Shopify Inc.",                         sector: "Technology",             industry: "Software - Application",              exchange: "NYSE"   },
  { symbol: "SQ",    name: "Block Inc.",                           sector: "Technology",             industry: "Software - Infrastructure",           exchange: "NYSE"   },
  { symbol: "COIN",  name: "Coinbase Global Inc.",                 sector: "Technology",             industry: "Software - Infrastructure",           exchange: "NASDAQ" },
  { symbol: "UBER",  name: "Uber Technologies Inc.",               sector: "Technology",             industry: "Software - Application",              exchange: "NYSE"   },
  { symbol: "FIS",   name: "Fidelity National Information Services", sector: "Technology",           industry: "Information Technology Services",     exchange: "NYSE"   },

  // ── Consumer Cyclical ─────────────────────────────────────────────────────────
  { symbol: "AMZN",  name: "Amazon.com Inc.",                      sector: "Consumer Cyclical",      industry: "Internet Retail",                     exchange: "NASDAQ" },
  { symbol: "TSLA",  name: "Tesla Inc.",                           sector: "Consumer Cyclical",      industry: "Auto Manufacturers",                  exchange: "NASDAQ" },
  { symbol: "HD",    name: "The Home Depot Inc.",                  sector: "Consumer Cyclical",      industry: "Home Improvement Retail",             exchange: "NYSE"   },
  { symbol: "MCD",   name: "McDonald's Corporation",               sector: "Consumer Cyclical",      industry: "Restaurants",                         exchange: "NYSE"   },
  { symbol: "LOW",   name: "Lowe's Companies Inc.",                sector: "Consumer Cyclical",      industry: "Home Improvement Retail",             exchange: "NYSE"   },
  { symbol: "BKNG",  name: "Booking Holdings Inc.",                sector: "Consumer Cyclical",      industry: "Travel Services",                     exchange: "NASDAQ" },
  { symbol: "TJX",   name: "The TJX Companies Inc.",               sector: "Consumer Cyclical",      industry: "Apparel Retail",                      exchange: "NYSE"   },
  { symbol: "SBUX",  name: "Starbucks Corporation",                sector: "Consumer Cyclical",      industry: "Restaurants",                         exchange: "NASDAQ" },
  { symbol: "GM",    name: "General Motors Company",               sector: "Consumer Cyclical",      industry: "Auto Manufacturers",                  exchange: "NYSE"   },
  { symbol: "F",     name: "Ford Motor Company",                   sector: "Consumer Cyclical",      industry: "Auto Manufacturers",                  exchange: "NYSE"   },
  { symbol: "ROST",  name: "Ross Stores Inc.",                     sector: "Consumer Cyclical",      industry: "Apparel Retail",                      exchange: "NASDAQ" },
  { symbol: "ORLY",  name: "O'Reilly Automotive Inc.",             sector: "Consumer Cyclical",      industry: "Specialty Retail",                    exchange: "NASDAQ" },
  { symbol: "MAR",   name: "Marriott International Inc.",          sector: "Consumer Cyclical",      industry: "Lodging",                             exchange: "NASDAQ" },
  { symbol: "AZO",   name: "AutoZone Inc.",                        sector: "Consumer Cyclical",      industry: "Specialty Retail",                    exchange: "NYSE"   },
  { symbol: "HLT",   name: "Hilton Worldwide Holdings Inc.",       sector: "Consumer Cyclical",      industry: "Lodging",                             exchange: "NYSE"   },
  { symbol: "CMG",   name: "Chipotle Mexican Grill Inc.",          sector: "Consumer Cyclical",      industry: "Restaurants",                         exchange: "NYSE"   },
  { symbol: "YUM",   name: "Yum! Brands Inc.",                     sector: "Consumer Cyclical",      industry: "Restaurants",                         exchange: "NYSE"   },
  { symbol: "EBAY",  name: "eBay Inc.",                            sector: "Consumer Cyclical",      industry: "Internet Retail",                     exchange: "NASDAQ" },
  { symbol: "LEN",   name: "Lennar Corporation",                   sector: "Consumer Cyclical",      industry: "Residential Construction",            exchange: "NYSE"   },
  { symbol: "DHI",   name: "D.R. Horton Inc.",                     sector: "Consumer Cyclical",      industry: "Residential Construction",            exchange: "NYSE"   },
  { symbol: "CPRT",  name: "Copart Inc.",                          sector: "Consumer Cyclical",      industry: "Auto & Truck Dealerships",            exchange: "NASDAQ" },
  { symbol: "RIVN",  name: "Rivian Automotive Inc.",               sector: "Consumer Cyclical",      industry: "Auto Manufacturers",                  exchange: "NASDAQ" },
  { symbol: "LCID",  name: "Lucid Group Inc.",                     sector: "Consumer Cyclical",      industry: "Auto Manufacturers",                  exchange: "NASDAQ" },

  // ── Consumer Defensive ────────────────────────────────────────────────────────
  { symbol: "WMT",   name: "Walmart Inc.",                         sector: "Consumer Defensive",     industry: "Discount Stores",                     exchange: "NYSE"   },
  { symbol: "COST",  name: "Costco Wholesale Corporation",         sector: "Consumer Defensive",     industry: "Discount Stores",                     exchange: "NASDAQ" },
  { symbol: "PG",    name: "The Procter & Gamble Company",         sector: "Consumer Defensive",     industry: "Household & Personal Products",       exchange: "NYSE"   },
  { symbol: "KO",    name: "The Coca-Cola Company",                sector: "Consumer Defensive",     industry: "Beverages - Non-Alcoholic",           exchange: "NYSE"   },
  { symbol: "PEP",   name: "PepsiCo Inc.",                         sector: "Consumer Defensive",     industry: "Beverages - Non-Alcoholic",           exchange: "NASDAQ" },
  { symbol: "MO",    name: "Altria Group Inc.",                    sector: "Consumer Defensive",     industry: "Tobacco",                             exchange: "NYSE"   },
  { symbol: "CL",    name: "Colgate-Palmolive Company",            sector: "Consumer Defensive",     industry: "Household & Personal Products",       exchange: "NYSE"   },
  { symbol: "KHC",   name: "The Kraft Heinz Company",              sector: "Consumer Defensive",     industry: "Packaged Foods",                      exchange: "NASDAQ" },
  { symbol: "KR",    name: "The Kroger Co.",                       sector: "Consumer Defensive",     industry: "Grocery Stores",                      exchange: "NYSE"   },
  { symbol: "GIS",   name: "General Mills Inc.",                   sector: "Consumer Defensive",     industry: "Packaged Foods",                      exchange: "NYSE"   },
  { symbol: "KMB",   name: "Kimberly-Clark Corporation",           sector: "Consumer Defensive",     industry: "Household & Personal Products",       exchange: "NYSE"   },
  { symbol: "HSY",   name: "The Hershey Company",                  sector: "Consumer Defensive",     industry: "Confectioners",                       exchange: "NYSE"   },
  { symbol: "MKC",   name: "McCormick & Company",                  sector: "Consumer Defensive",     industry: "Packaged Foods",                      exchange: "NYSE"   },
  { symbol: "MNST",  name: "Monster Beverage Corporation",         sector: "Consumer Defensive",     industry: "Beverages - Non-Alcoholic",           exchange: "NASDAQ" },
  { symbol: "ADM",   name: "Archer-Daniels-Midland Company",       sector: "Consumer Defensive",     industry: "Farm Products",                       exchange: "NYSE"   },
  { symbol: "WBA",   name: "Walgreens Boots Alliance Inc.",        sector: "Consumer Defensive",     industry: "Pharmaceutical Retailers",            exchange: "NASDAQ" },
  { symbol: "DLTR",  name: "Dollar Tree Inc.",                     sector: "Consumer Defensive",     industry: "Discount Stores",                     exchange: "NASDAQ" },
  { symbol: "STZ",   name: "Constellation Brands Inc.",            sector: "Consumer Defensive",     industry: "Beverages - Alcoholic",               exchange: "NYSE"   },

  // ── Financial Services ────────────────────────────────────────────────────────
  { symbol: "BRK.B", name: "Berkshire Hathaway Inc. (Class B)",    sector: "Financial Services",     industry: "Insurance - Diversified",             exchange: "NYSE"   },
  { symbol: "JPM",   name: "JPMorgan Chase & Co.",                 sector: "Financial Services",     industry: "Banks - Diversified",                 exchange: "NYSE"   },
  { symbol: "V",     name: "Visa Inc.",                            sector: "Financial Services",     industry: "Credit Services",                     exchange: "NYSE"   },
  { symbol: "MA",    name: "Mastercard Incorporated",              sector: "Financial Services",     industry: "Credit Services",                     exchange: "NYSE"   },
  { symbol: "BAC",   name: "Bank of America Corporation",          sector: "Financial Services",     industry: "Banks - Diversified",                 exchange: "NYSE"   },
  { symbol: "BLK",   name: "BlackRock Inc.",                       sector: "Financial Services",     industry: "Asset Management",                    exchange: "NYSE"   },
  { symbol: "CB",    name: "Chubb Limited",                        sector: "Financial Services",     industry: "Insurance - Property & Casualty",     exchange: "NYSE"   },
  { symbol: "MMC",   name: "Marsh & McLennan Companies Inc.",      sector: "Financial Services",     industry: "Insurance Brokers",                   exchange: "NYSE"   },
  { symbol: "CME",   name: "CME Group Inc.",                       sector: "Financial Services",     industry: "Financial Data & Stock Exchanges",    exchange: "NASDAQ" },
  { symbol: "C",     name: "Citigroup Inc.",                       sector: "Financial Services",     industry: "Banks - Diversified",                 exchange: "NYSE"   },
  { symbol: "SCHW",  name: "The Charles Schwab Corporation",       sector: "Financial Services",     industry: "Capital Markets",                     exchange: "NYSE"   },
  { symbol: "CI",    name: "The Cigna Group",                      sector: "Financial Services",     industry: "Healthcare Plans",                    exchange: "NYSE"   },
  { symbol: "AXP",   name: "American Express Company",             sector: "Financial Services",     industry: "Credit Services",                     exchange: "NYSE"   },
  { symbol: "PGR",   name: "The Progressive Corporation",          sector: "Financial Services",     industry: "Insurance - Property & Casualty",     exchange: "NYSE"   },
  { symbol: "USB",   name: "U.S. Bancorp",                         sector: "Financial Services",     industry: "Banks - Diversified",                 exchange: "NYSE"   },
  { symbol: "MCO",   name: "Moody's Corporation",                  sector: "Financial Services",     industry: "Financial Data & Stock Exchanges",    exchange: "NYSE"   },
  { symbol: "MET",   name: "MetLife Inc.",                         sector: "Financial Services",     industry: "Insurance - Life",                    exchange: "NYSE"   },
  { symbol: "RSG",   name: "Republic Services Inc.",               sector: "Industrials",            industry: "Waste Management",                    exchange: "NYSE"   },
  { symbol: "MSCI",  name: "MSCI Inc.",                            sector: "Financial Services",     industry: "Financial Data & Stock Exchanges",    exchange: "NYSE"   },
  { symbol: "AFL",   name: "Aflac Incorporated",                   sector: "Financial Services",     industry: "Insurance - Life",                    exchange: "NYSE"   },
  { symbol: "COF",   name: "Capital One Financial Corporation",    sector: "Financial Services",     industry: "Banks - Diversified",                 exchange: "NYSE"   },
  { symbol: "AIG",   name: "American International Group Inc.",    sector: "Financial Services",     industry: "Insurance - Diversified",             exchange: "NYSE"   },
  { symbol: "PRU",   name: "Prudential Financial Inc.",            sector: "Financial Services",     industry: "Insurance - Life",                    exchange: "NYSE"   },
  { symbol: "TRV",   name: "The Travelers Companies Inc.",         sector: "Financial Services",     industry: "Insurance - Property & Casualty",     exchange: "NYSE"   },
  { symbol: "AON",   name: "Aon plc",                              sector: "Financial Services",     industry: "Insurance Brokers",                   exchange: "NYSE"   },
  { symbol: "AMP",   name: "Ameriprise Financial Inc.",            sector: "Financial Services",     industry: "Asset Management",                    exchange: "NYSE"   },
  { symbol: "HIG",   name: "The Hartford Financial Services Group", sector: "Financial Services",    industry: "Insurance - Property & Casualty",     exchange: "NYSE"   },
  { symbol: "FITB",  name: "Fifth Third Bancorp",                  sector: "Financial Services",     industry: "Banks - Regional",                    exchange: "NASDAQ" },
  { symbol: "HBAN",  name: "Huntington Bancshares Incorporated",   sector: "Financial Services",     industry: "Banks - Regional",                    exchange: "NASDAQ" },
  { symbol: "RF",    name: "Regions Financial Corporation",        sector: "Financial Services",     industry: "Banks - Regional",                    exchange: "NYSE"   },
  { symbol: "CFG",   name: "Citizens Financial Group Inc.",        sector: "Financial Services",     industry: "Banks - Regional",                    exchange: "NYSE"   },
  { symbol: "KEY",   name: "KeyCorp",                              sector: "Financial Services",     industry: "Banks - Regional",                    exchange: "NYSE"   },
  { symbol: "MTB",   name: "M&T Bank Corporation",                 sector: "Financial Services",     industry: "Banks - Regional",                    exchange: "NYSE"   },

  // ── Healthcare ────────────────────────────────────────────────────────────────
  { symbol: "LLY",   name: "Eli Lilly and Company",                sector: "Healthcare",             industry: "Drug Manufacturers",                  exchange: "NYSE"   },
  { symbol: "JNJ",   name: "Johnson & Johnson",                    sector: "Healthcare",             industry: "Drug Manufacturers",                  exchange: "NYSE"   },
  { symbol: "ABBV",  name: "AbbVie Inc.",                          sector: "Healthcare",             industry: "Drug Manufacturers",                  exchange: "NYSE"   },
  { symbol: "MRK",   name: "Merck & Co. Inc.",                     sector: "Healthcare",             industry: "Drug Manufacturers",                  exchange: "NYSE"   },
  { symbol: "UNH",   name: "UnitedHealth Group Incorporated",      sector: "Healthcare",             industry: "Healthcare Plans",                    exchange: "NYSE"   },
  { symbol: "AZN",   name: "AstraZeneca PLC",                      sector: "Healthcare",             industry: "Drug Manufacturers",                  exchange: "NASDAQ" },
  { symbol: "NVO",   name: "Novo Nordisk A/S",                     sector: "Healthcare",             industry: "Drug Manufacturers",                  exchange: "NYSE"   },
  { symbol: "TMO",   name: "Thermo Fisher Scientific Inc.",        sector: "Healthcare",             industry: "Diagnostics & Research",              exchange: "NYSE"   },
  { symbol: "AMGN",  name: "Amgen Inc.",                           sector: "Healthcare",             industry: "Drug Manufacturers",                  exchange: "NASDAQ" },
  { symbol: "ISRG",  name: "Intuitive Surgical Inc.",              sector: "Healthcare",             industry: "Medical Instruments",                 exchange: "NASDAQ" },
  { symbol: "GILD",  name: "Gilead Sciences Inc.",                 sector: "Healthcare",             industry: "Drug Manufacturers",                  exchange: "NASDAQ" },
  { symbol: "REGN",  name: "Regeneron Pharmaceuticals Inc.",       sector: "Healthcare",             industry: "Drug Manufacturers",                  exchange: "NASDAQ" },
  { symbol: "MDT",   name: "Medtronic plc",                        sector: "Healthcare",             industry: "Medical Devices",                     exchange: "NYSE"   },
  { symbol: "SYK",   name: "Stryker Corporation",                  sector: "Healthcare",             industry: "Medical Devices",                     exchange: "NYSE"   },
  { symbol: "ZTS",   name: "Zoetis Inc.",                          sector: "Healthcare",             industry: "Drug Manufacturers",                  exchange: "NYSE"   },
  { symbol: "ELV",   name: "Elevance Health Inc.",                 sector: "Healthcare",             industry: "Healthcare Plans",                    exchange: "NYSE"   },
  { symbol: "HUM",   name: "Humana Inc.",                          sector: "Healthcare",             industry: "Healthcare Plans",                    exchange: "NYSE"   },
  { symbol: "BSX",   name: "Boston Scientific Corporation",        sector: "Healthcare",             industry: "Medical Devices",                     exchange: "NYSE"   },
  { symbol: "HCA",   name: "HCA Healthcare Inc.",                  sector: "Healthcare",             industry: "Medical Care Facilities",             exchange: "NYSE"   },
  { symbol: "IDXX",  name: "IDEXX Laboratories Inc.",              sector: "Healthcare",             industry: "Diagnostics & Research",              exchange: "NASDAQ" },
  { symbol: "BDX",   name: "Becton, Dickinson and Company",        sector: "Healthcare",             industry: "Medical Instruments",                 exchange: "NYSE"   },
  { symbol: "IQV",   name: "IQVIA Holdings Inc.",                  sector: "Healthcare",             industry: "Diagnostics & Research",              exchange: "NYSE"   },
  { symbol: "MCK",   name: "McKesson Corporation",                 sector: "Healthcare",             industry: "Medical Distribution",                exchange: "NYSE"   },
  { symbol: "DXCM",  name: "DexCom Inc.",                          sector: "Healthcare",             industry: "Medical Devices",                     exchange: "NASDAQ" },

  // ── Industrials ───────────────────────────────────────────────────────────────
  { symbol: "GE",    name: "GE Aerospace",                         sector: "Industrials",            industry: "Aerospace & Defense",                 exchange: "NYSE"   },
  { symbol: "CAT",   name: "Caterpillar Inc.",                     sector: "Industrials",            industry: "Farm & Heavy Construction Machinery", exchange: "NYSE"   },
  { symbol: "RTX",   name: "RTX Corporation",                      sector: "Industrials",            industry: "Aerospace & Defense",                 exchange: "NYSE"   },
  { symbol: "UPS",   name: "United Parcel Service Inc.",           sector: "Industrials",            industry: "Integrated Freight & Logistics",      exchange: "NYSE"   },
  { symbol: "LMT",   name: "Lockheed Martin Corporation",          sector: "Industrials",            industry: "Aerospace & Defense",                 exchange: "NYSE"   },
  { symbol: "DE",    name: "Deere & Company",                      sector: "Industrials",            industry: "Farm & Heavy Construction Machinery", exchange: "NYSE"   },
  { symbol: "FDX",   name: "FedEx Corporation",                    sector: "Industrials",            industry: "Integrated Freight & Logistics",      exchange: "NYSE"   },
  { symbol: "GD",    name: "General Dynamics Corporation",         sector: "Industrials",            industry: "Aerospace & Defense",                 exchange: "NYSE"   },
  { symbol: "NOC",   name: "Northrop Grumman Corporation",         sector: "Industrials",            industry: "Aerospace & Defense",                 exchange: "NYSE"   },
  { symbol: "ETN",   name: "Eaton Corporation plc",                sector: "Industrials",            industry: "Specialty Industrial Machinery",      exchange: "NYSE"   },
  { symbol: "ITW",   name: "Illinois Tool Works Inc.",             sector: "Industrials",            industry: "Specialty Industrial Machinery",      exchange: "NYSE"   },
  { symbol: "NSC",   name: "Norfolk Southern Corporation",         sector: "Industrials",            industry: "Railroads",                           exchange: "NYSE"   },
  { symbol: "WM",    name: "Waste Management Inc.",                sector: "Industrials",            industry: "Waste Management",                    exchange: "NYSE"   },
  { symbol: "EMR",   name: "Emerson Electric Co.",                 sector: "Industrials",            industry: "Specialty Industrial Machinery",      exchange: "NYSE"   },
  { symbol: "PCAR",  name: "PACCAR Inc.",                          sector: "Industrials",            industry: "Farm & Heavy Construction Machinery", exchange: "NASDAQ" },
  { symbol: "ROK",   name: "Rockwell Automation Inc.",             sector: "Industrials",            industry: "Specialty Industrial Machinery",      exchange: "NYSE"   },
  { symbol: "CARR",  name: "Carrier Global Corporation",           sector: "Industrials",            industry: "Building Products & Equipment",       exchange: "NYSE"   },
  { symbol: "LHX",   name: "L3Harris Technologies Inc.",           sector: "Industrials",            industry: "Aerospace & Defense",                 exchange: "NYSE"   },
  { symbol: "CTAS",  name: "Cintas Corporation",                   sector: "Industrials",            industry: "Staffing & Employment Services",      exchange: "NASDAQ" },
  { symbol: "TT",    name: "Trane Technologies plc",               sector: "Industrials",            industry: "Building Products & Equipment",       exchange: "NYSE"   },
  { symbol: "OTIS",  name: "Otis Worldwide Corporation",           sector: "Industrials",            industry: "Specialty Industrial Machinery",      exchange: "NYSE"   },
  { symbol: "FAST",  name: "Fastenal Company",                     sector: "Industrials",            industry: "Industrial Distribution",             exchange: "NASDAQ" },
  { symbol: "VRSK",  name: "Verisk Analytics Inc.",                sector: "Industrials",            industry: "Consulting Services",                 exchange: "NASDAQ" },
  { symbol: "CMI",   name: "Cummins Inc.",                         sector: "Industrials",            industry: "Specialty Industrial Machinery",      exchange: "NYSE"   },

  // ── Energy ────────────────────────────────────────────────────────────────────
  { symbol: "XOM",   name: "Exxon Mobil Corporation",              sector: "Energy",                 industry: "Oil & Gas Integrated",                exchange: "NYSE"   },
  { symbol: "CVX",   name: "Chevron Corporation",                  sector: "Energy",                 industry: "Oil & Gas Integrated",                exchange: "NYSE"   },
  { symbol: "EOG",   name: "EOG Resources Inc.",                   sector: "Energy",                 industry: "Oil & Gas E&P",                       exchange: "NYSE"   },
  { symbol: "SLB",   name: "Schlumberger Limited",                 sector: "Energy",                 industry: "Oil & Gas Equipment & Services",      exchange: "NYSE"   },
  { symbol: "OXY",   name: "Occidental Petroleum Corporation",     sector: "Energy",                 industry: "Oil & Gas E&P",                       exchange: "NYSE"   },
  { symbol: "PSX",   name: "Phillips 66",                          sector: "Energy",                 industry: "Oil & Gas Refining & Marketing",      exchange: "NYSE"   },
  { symbol: "WMB",   name: "The Williams Companies Inc.",          sector: "Energy",                 industry: "Oil & Gas Midstream",                 exchange: "NYSE"   },
  { symbol: "VLO",   name: "Valero Energy Corporation",            sector: "Energy",                 industry: "Oil & Gas Refining & Marketing",      exchange: "NYSE"   },

  // ── Basic Materials ───────────────────────────────────────────────────────────
  { symbol: "LIN",   name: "Linde plc",                            sector: "Basic Materials",        industry: "Specialty Chemicals",                 exchange: "NASDAQ" },
  { symbol: "APD",   name: "Air Products and Chemicals Inc.",      sector: "Basic Materials",        industry: "Specialty Chemicals",                 exchange: "NYSE"   },
  { symbol: "FCX",   name: "Freeport-McMoRan Inc.",                sector: "Basic Materials",        industry: "Copper",                              exchange: "NYSE"   },
  { symbol: "SHW",   name: "The Sherwin-Williams Company",         sector: "Basic Materials",        industry: "Specialty Chemicals",                 exchange: "NYSE"   },
  { symbol: "ECL",   name: "Ecolab Inc.",                          sector: "Basic Materials",        industry: "Specialty Chemicals",                 exchange: "NYSE"   },
  { symbol: "DOW",   name: "Dow Inc.",                             sector: "Basic Materials",        industry: "Chemicals",                           exchange: "NYSE"   },

  // ── Communication Services ────────────────────────────────────────────────────
  { symbol: "NFLX",  name: "Netflix Inc.",                         sector: "Communication Services", industry: "Entertainment",                        exchange: "NASDAQ" },
  { symbol: "T",     name: "AT&T Inc.",                            sector: "Communication Services", industry: "Telecom Services",                     exchange: "NYSE"   },
  { symbol: "EA",    name: "Electronic Arts Inc.",                 sector: "Communication Services", industry: "Electronic Gaming & Multimedia",        exchange: "NASDAQ" },
  { symbol: "OMC",   name: "Omnicom Group Inc.",                   sector: "Communication Services", industry: "Advertising Agencies",                 exchange: "NYSE"   },
  { symbol: "CHTR",  name: "Charter Communications Inc.",          sector: "Communication Services", industry: "Telecom Services",                     exchange: "NASDAQ" },

  // ── Utilities ─────────────────────────────────────────────────────────────────
  { symbol: "NEE",   name: "NextEra Energy Inc.",                  sector: "Utilities",              industry: "Utilities - Regulated Electric",       exchange: "NYSE"   },
  { symbol: "SO",    name: "The Southern Company",                 sector: "Utilities",              industry: "Utilities - Regulated Electric",       exchange: "NYSE"   },
  { symbol: "D",     name: "Dominion Energy Inc.",                 sector: "Utilities",              industry: "Utilities - Regulated Electric",       exchange: "NYSE"   },
  { symbol: "DUK",   name: "Duke Energy Corporation",              sector: "Utilities",              industry: "Utilities - Regulated Electric",       exchange: "NYSE"   },
  { symbol: "AEP",   name: "American Electric Power Company",      sector: "Utilities",              industry: "Utilities - Regulated Electric",       exchange: "NASDAQ" },
  { symbol: "SRE",   name: "Sempra",                               sector: "Utilities",              industry: "Utilities - Diversified",              exchange: "NYSE"   },
  { symbol: "EXC",   name: "Exelon Corporation",                   sector: "Utilities",              industry: "Utilities - Regulated Electric",       exchange: "NASDAQ" },
  { symbol: "ED",    name: "Consolidated Edison Inc.",             sector: "Utilities",              industry: "Utilities - Regulated Electric",       exchange: "NYSE"   },
  { symbol: "ETR",   name: "Entergy Corporation",                  sector: "Utilities",              industry: "Utilities - Regulated Electric",       exchange: "NYSE"   },
  { symbol: "WEC",   name: "WEC Energy Group Inc.",                sector: "Utilities",              industry: "Utilities - Regulated Electric",       exchange: "NYSE"   },
  { symbol: "PPL",   name: "PPL Corporation",                      sector: "Utilities",              industry: "Utilities - Regulated Electric",       exchange: "NYSE"   },
  { symbol: "AWK",   name: "American Water Works Company Inc.",    sector: "Utilities",              industry: "Utilities - Regulated Water",          exchange: "NYSE"   },
  { symbol: "ALL",   name: "The Allstate Corporation",             sector: "Financial Services",     industry: "Insurance - Property & Casualty",      exchange: "NYSE"   },

  // ── Real Estate ───────────────────────────────────────────────────────────────
  { symbol: "EQIX",  name: "Equinix Inc.",                         sector: "Real Estate",            industry: "REIT - Specialty",                    exchange: "NASDAQ" },
  { symbol: "O",     name: "Realty Income Corporation",            sector: "Real Estate",            industry: "REIT - Retail",                       exchange: "NYSE"   },
  { symbol: "PSA",   name: "Public Storage",                       sector: "Real Estate",            industry: "REIT - Industrial",                   exchange: "NYSE"   },
  { symbol: "VICI",  name: "VICI Properties Inc.",                 sector: "Real Estate",            industry: "REIT - Diversified",                  exchange: "NYSE"   },
  { symbol: "WELL",  name: "Welltower Inc.",                       sector: "Real Estate",            industry: "REIT - Healthcare Facilities",         exchange: "NYSE"   },
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

    console.log(`\n✅ Seeding complete — ${stocks.length} stocks in database`);
  } catch (err) {
    console.error("❌ Seed failed:", err);
  } finally {
    await mongoose.disconnect();
  }
}

seed();
