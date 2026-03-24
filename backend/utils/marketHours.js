/**
 * Market Hours Utility
 *
 * Determines whether the US stock market is currently open.
 * All calculations are based on UTC time converted to ET (Eastern Time),
 * accounting for DST transitions.
 *
 * Handles:
 * - Weekday check (Mon-Fri only)
 * - Market hours: 9:30am - 4:00pm ET
 * - DST: 2nd Sunday of March (spring forward) / 1st Sunday of November (fall back)
 * - NYSE market holidays including Good Friday via Computus algorithm
 * - Weekend shift rules for holidays falling on Saturday/Sunday
 *
 * Early closures (July 3, Black Friday, Christmas Eve) are intentionally ignored.
 *
 * Usage:
 *   const { isMarketOpen } = require('../utils/marketHours');
 *   if (isMarketOpen()) { ... }
 */

/**
 * Returns the nth occurrence of a given weekday in a given month/year.
 * @param {number} year
 * @param {number} month - 0-indexed (0 = January)
 * @param {number} weekday - 0=Sunday, 1=Monday, ..., 6=Saturday
 * @param {number} n - 1-indexed occurrence (1 = first, 2 = second, -1 = last)
 * @returns {Date}
 */
function getNthWeekday(year, month, weekday, n) {
  if (n > 0) {
    // Find first occurrence of weekday in month
    const first = new Date(year, month, 1);
    const firstWeekday = first.getDay();
    let day = 1 + ((weekday - firstWeekday + 7) % 7);
    day += (n - 1) * 7;
    return new Date(year, month, day);
  } else {
    // Find last occurrence — start from end of month
    const last = new Date(year, month + 1, 0); // last day of month
    const lastWeekday = last.getDay();
    let day = last.getDate() - ((lastWeekday - weekday + 7) % 7);
    return new Date(year, month, day);
  }
}

/**
 * Calculates Easter Sunday for a given year using the Computus algorithm.
 * @param {number} year
 * @returns {Date}
 */
function getEaster(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

/**
 * Applies weekend shift rules:
 * - Saturday holiday → observed Friday
 * - Sunday holiday → observed Monday
 * @param {Date} date
 * @returns {Date}
 */
function applyWeekendShift(date) {
  const day = date.getDay();
  if (day === 6) {
    // Saturday → Friday
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1);
  }
  if (day === 0) {
    // Sunday → Monday
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
  }
  return date;
}

/**
 * Returns a Set of market holiday date strings (YYYY-MM-DD) for a given year.
 * @param {number} year
 * @returns {Set<string>}
 */
function getMarketHolidays(year) {
  const holidays = [];

  // --- Fixed date holidays ---
  holidays.push(new Date(year, 0, 1));   // New Year's Day - Jan 1
  holidays.push(new Date(year, 5, 19));  // Juneteenth - Jun 19
  holidays.push(new Date(year, 6, 4));   // Independence Day - Jul 4
  holidays.push(new Date(year, 11, 25)); // Christmas - Dec 25

  // --- Calculated (nth weekday) holidays ---
  holidays.push(getNthWeekday(year, 0, 1, 3));   // MLK Day - 3rd Monday of January
  holidays.push(getNthWeekday(year, 1, 1, 3));   // Presidents Day - 3rd Monday of February
  holidays.push(getNthWeekday(year, 4, 1, -1));  // Memorial Day - last Monday of May
  holidays.push(getNthWeekday(year, 8, 1, 1));   // Labor Day - 1st Monday of September
  holidays.push(getNthWeekday(year, 10, 4, 4));  // Thanksgiving - 4th Thursday of November

  // --- Dynamic holiday ---
  const easter = getEaster(year);
  const goodFriday = new Date(easter.getFullYear(), easter.getMonth(), easter.getDate() - 2);
  holidays.push(goodFriday);

  // Apply weekend shift rules and convert to YYYY-MM-DD strings
  const shifted = holidays.map(applyWeekendShift);
  return new Set(shifted.map((d) => toDateString(d)));
}

/**
 * Converts a Date to a YYYY-MM-DD string using local date parts.
 * @param {Date} date
 * @returns {string}
 */
function toDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Determines whether DST is currently active in Eastern Time.
 * DST runs from 2nd Sunday of March at 2am to 1st Sunday of November at 2am.
 * @param {Date} utcDate
 * @returns {boolean}
 */
function isEasternDST(utcDate) {
  const year = utcDate.getUTCFullYear();

  // DST starts: 2nd Sunday of March at 2am EST = 7am UTC
  const dstStart = getNthWeekday(year, 2, 0, 2); // 2nd Sunday of March
  const dstStartUTC = new Date(Date.UTC(year, 2, dstStart.getDate(), 7, 0, 0));

  // DST ends: 1st Sunday of November at 2am EDT = 6am UTC
  const dstEnd = getNthWeekday(year, 10, 0, 1); // 1st Sunday of November
  const dstEndUTC = new Date(Date.UTC(year, 10, dstEnd.getDate(), 6, 0, 0));

  return utcDate >= dstStartUTC && utcDate < dstEndUTC;
}

/**
 * Converts a UTC Date to Eastern Time date parts.
 * @param {Date} utcDate
 * @returns {{ year, month, day, hours, minutes, weekday }}
 */
function toEasternTime(utcDate) {
  const offsetHours = isEasternDST(utcDate) ? -4 : -5; // EDT = UTC-4, EST = UTC-5
  const etMs = utcDate.getTime() + offsetHours * 60 * 60 * 1000;
  const et = new Date(etMs);

  return {
    year: et.getUTCFullYear(),
    month: et.getUTCMonth(),
    day: et.getUTCDate(),
    hours: et.getUTCHours(),
    minutes: et.getUTCMinutes(),
    weekday: et.getUTCDay(), // 0=Sunday, 6=Saturday
  };
}

/**
 * Returns true if the US stock market is currently open.
 * Checks weekday, market hours (9:30am–4:00pm ET), and holidays.
 * @param {Date} [now=new Date()] - injectable for testing
 * @returns {boolean}
 */
function isMarketOpen(now = new Date()) {
  const et = toEasternTime(now);

  // Check weekday (Monday=1 through Friday=5)
  if (et.weekday === 0 || et.weekday === 6) return false;

  // Check market hours: 9:30am to 4:00pm ET
  const minutesSinceMidnight = et.hours * 60 + et.minutes;
  const marketOpen = 9 * 60 + 30;  // 570 minutes
  const marketClose = 16 * 60;      // 960 minutes
  if (minutesSinceMidnight < marketOpen || minutesSinceMidnight >= marketClose) return false;

  // Check holidays
  const dateStr = `${et.year}-${String(et.month + 1).padStart(2, "0")}-${String(et.day).padStart(2, "0")}`;
  const holidays = getMarketHolidays(et.year);
  if (holidays.has(dateStr)) return false;

  return true;
}

module.exports = { isMarketOpen, getMarketHolidays, isEasternDST };
