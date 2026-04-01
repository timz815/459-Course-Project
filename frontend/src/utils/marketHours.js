/**
 * Market Hours Utility (Frontend)
 *
 * Client-side replica of backend marketHours.js
 * Used to determine market status for UI display and trade warnings.
 * All calculations based on UTC → ET conversion.
 *
 * Exports:
 *   isMarketOpen()      → live trading, show live prices
 *   isPendingUntilOpen() → trades queue until next market open
 */

function getNthWeekday(year, month, weekday, n) {
  if (n > 0) {
    const first = new Date(year, month, 1);
    const firstWeekday = first.getDay();
    let day = 1 + ((weekday - firstWeekday + 7) % 7);
    day += (n - 1) * 7;
    return new Date(year, month, day);
  } else {
    const last = new Date(year, month + 1, 0);
    const lastWeekday = last.getDay();
    let day = last.getDate() - ((lastWeekday - weekday + 7) % 7);
    return new Date(year, month, day);
  }
}

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

function applyWeekendShift(date) {
  const day = date.getDay();
  if (day === 6) return new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1);
  if (day === 0) return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
  return date;
}

function getMarketHolidays(year) {
  const holidays = [];
  holidays.push(new Date(year, 0, 1));
  holidays.push(new Date(year, 5, 19));
  holidays.push(new Date(year, 6, 4));
  holidays.push(new Date(year, 11, 25));
  holidays.push(getNthWeekday(year, 0, 1, 3));
  holidays.push(getNthWeekday(year, 1, 1, 3));
  holidays.push(getNthWeekday(year, 4, 1, -1));
  holidays.push(getNthWeekday(year, 8, 1, 1));
  holidays.push(getNthWeekday(year, 10, 4, 4));
  const easter = getEaster(year);
  const goodFriday = new Date(easter.getFullYear(), easter.getMonth(), easter.getDate() - 2);
  holidays.push(goodFriday);
  const shifted = holidays.map(applyWeekendShift);
  return new Set(shifted.map(toDateString));
}

function toDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isEasternDST(utcDate) {
  const year = utcDate.getUTCFullYear();
  const dstStart = getNthWeekday(year, 2, 0, 2);
  const dstStartUTC = new Date(Date.UTC(year, 2, dstStart.getDate(), 7, 0, 0));
  const dstEnd = getNthWeekday(year, 10, 0, 1);
  const dstEndUTC = new Date(Date.UTC(year, 10, dstEnd.getDate(), 6, 0, 0));
  return utcDate >= dstStartUTC && utcDate < dstEndUTC;
}

function toEasternTime(utcDate) {
  const offsetHours = isEasternDST(utcDate) ? -4 : -5;
  const etMs = utcDate.getTime() + offsetHours * 60 * 60 * 1000;
  const et = new Date(etMs);
  return {
    year: et.getUTCFullYear(),
    month: et.getUTCMonth(),
    day: et.getUTCDate(),
    hours: et.getUTCHours(),
    minutes: et.getUTCMinutes(),
    weekday: et.getUTCDay(),
  };
}

export function isMarketOpen(now = new Date()) {
  const et = toEasternTime(now);
  if (et.weekday === 0 || et.weekday === 6) return false;
  const minutesSinceMidnight = et.hours * 60 + et.minutes;
  const marketOpen = 9 * 60 + 30;
  const marketClose = 16 * 60;
  if (minutesSinceMidnight < marketOpen || minutesSinceMidnight >= marketClose) return false;
  const dateStr = `${et.year}-${String(et.month + 1).padStart(2, "0")}-${String(et.day).padStart(2, "0")}`;
  const holidays = getMarketHolidays(et.year);
  if (holidays.has(dateStr)) return false;
  return true;
}

export function isPendingUntilOpen(now = new Date()) {
  const et = toEasternTime(now);
  const minutesSinceMidnight = et.hours * 60 + et.minutes;
  const marketOpen = 9 * 60 + 30;
  const marketClose = 16 * 60;
  const dateStr = `${et.year}-${String(et.month + 1).padStart(2, "0")}-${String(et.day).padStart(2, "0")}`;
  const holidays = getMarketHolidays(et.year);
  if (holidays.has(dateStr)) return true;
  if (et.weekday === 0 || et.weekday === 6) return true;
  if (et.weekday === 5 && minutesSinceMidnight >= marketClose) return true;
  if (et.weekday === 1 && minutesSinceMidnight < marketOpen) return true;
  return false;
}