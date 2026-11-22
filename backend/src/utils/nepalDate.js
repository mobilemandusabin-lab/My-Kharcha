const NepaliDateLib = require('nepali-date-converter');
const NepaliDate = NepaliDateLib.default || NepaliDateLib;

const NEPAL_OFFSET_MIN = 5 * 60 + 45; // UTC+5:45
const NEPAL_OFFSET_MS = NEPAL_OFFSET_MIN * 60 * 1000;

function toNepalWallClockDate(dateInput) {
  const d = new Date(dateInput);
  // Represent Nepal wall-clock time as a UTC date with same Y/M/D/H/M/S components
  return new Date(d.getTime() + NEPAL_OFFSET_MS);
}

function fromNepalWallClockToUtc(year, monthIndex, day, hour = 0, minute = 0, second = 0, ms = 0) {
  // monthIndex is 0-based (JS)
  const utcMs = Date.UTC(year, monthIndex, day, hour, minute, second, ms) - NEPAL_OFFSET_MS;
  return new Date(utcMs);
}

function getNepalNow() {
  return toNepalWallClockDate(new Date());
}

function getCurrentBS() {
  const wall = getNepalNow();
  const adY = wall.getUTCFullYear();
  const adM = wall.getUTCMonth();
  const adD = wall.getUTCDate();
  // Use noon UTC of that AD day to avoid DST/local issues, NepaliDate maps AD->BS by date
  const nd = new NepaliDate(new Date(Date.UTC(adY, adM, adD, 12, 0, 0)));
  return { year: nd.getYear(), month: nd.getMonth() + 1, day: nd.getDate() }; // month 1-12
}

function adToBS(dateInput) {
  // Interpret input instant in Nepal timezone and return BS date
  const wall = toNepalWallClockDate(dateInput);
  const nd = new NepaliDate(new Date(Date.UTC(wall.getUTCFullYear(), wall.getUTCMonth(), wall.getUTCDate(), 12, 0, 0)));
  return { year: nd.getYear(), month: nd.getMonth() + 1, day: nd.getDate() };
}

function bsToAdDate(bsYear, bsMonth1, bsDay) {
  const nd = new NepaliDate(bsYear, bsMonth1 - 1, bsDay);
  const js = nd.toJsDate(); // Nepal midnight as UTC instant
  // Convert to Nepal wall-clock AD components
  const wall = toNepalWallClockDate(js);
  return { year: wall.getUTCFullYear(), month: wall.getUTCMonth() + 1, day: wall.getUTCDate() };
}

function getDaysInBSMonth(bsYear, bsMonth1) {
  // probe by rollover
  for (let d = 32; d >= 28; d--) {
    try {
      const nd = new NepaliDate(bsYear, bsMonth1 - 1, d);
      if (nd.getYear() === bsYear && nd.getMonth() === bsMonth1 - 1 && nd.getDate() === d) return d;
    } catch (e) {
      // continue
    }
  }
  // fallback via iteration upward
  let last = 28;
  for (let d = 29; d <= 32; d++) {
    const nd = new NepaliDate(bsYear, bsMonth1 - 1, d);
    if (nd.getYear() === bsYear && nd.getMonth() === bsMonth1 - 1 && nd.getDate() === d) last = d;
    else break;
  }
  return last;
}

function getBSMonthUtcRange(bsYear, bsMonth1) {
  // BS month starts day 1 00:00:00 Nepal, ends last day 23:59:59.999 Nepal
  const startAd = bsToAdDate(bsYear, bsMonth1, 1);
  const days = getDaysInBSMonth(bsYear, bsMonth1);
  const endAd = bsToAdDate(bsYear, bsMonth1, days);
  const startUtc = fromNepalWallClockToUtc(startAd.year, startAd.month - 1, startAd.day, 0, 0, 0, 0);
  const endUtc = fromNepalWallClockToUtc(endAd.year, endAd.month - 1, endAd.day, 23, 59, 59, 999);
  return { startUtc, endUtc, daysInMonth: days };
}

function getBSDayUtcRange(bsYear, bsMonth1, bsDay) {
  const ad = bsToAdDate(bsYear, bsMonth1, bsDay);
  const startUtc = fromNepalWallClockToUtc(ad.year, ad.month - 1, ad.day, 0, 0, 0, 0);
  const endUtc = fromNepalWallClockToUtc(ad.year, ad.month - 1, ad.day, 23, 59, 59, 999);
  return { startUtc, endUtc };
}

const BS_MONTHS_EN = ['Baisakh','Jestha','Asar','Shrawan','Bhadra','Aswin','Kartik','Mangsir','Poush','Magh','Falgun','Chaitra'];
const BS_MONTHS_NP = ['बैशाख','जेठ','असार','श्रावण','भदौ','आश्विन','कार्तिक','मंसिर','पौष','माघ','फाल्गुन','चैत्र'];
const NP_DIGITS = ['०','१','२','३','४','५','६','७','८','९'];

function toNepaliNumerals(num) {
  return String(num).split('').map(ch => (ch >= '0' && ch <= '9' ? NP_DIGITS[Number(ch)] : ch)).join('');
}

function formatBS(bs, { nepaliDigits = true, lang = 'np' } = {}) {
  const mName = lang === 'np' ? BS_MONTHS_NP[bs.month - 1] : BS_MONTHS_EN[bs.month - 1];
  if (nepaliDigits) return `${mName} ${toNepaliNumerals(bs.day)}, ${toNepaliNumerals(bs.year)}`;
  return `${mName} ${bs.day}, ${bs.year}`;
}

function getNepalTodayUtcRange() {
  const wall = getNepalNow();
  const y = wall.getUTCFullYear(), m = wall.getUTCMonth(), d = wall.getUTCDate();
  return {
    startUtc: fromNepalWallClockToUtc(y, m, d, 0, 0, 0, 0),
    endUtc: fromNepalWallClockToUtc(y, m, d, 23, 59, 59, 999),
  };
}

function formatNepalTime(dateInput) {
  const wall = toNepalWallClockDate(dateInput);
  const hh = String(wall.getUTCHours()).padStart(2, '0');
  const mm = String(wall.getUTCMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function formatAD(dateInput) {
  return new Date(dateInput).toLocaleDateString('en-US', { timeZone: 'Asia/Kathmandu', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

module.exports = {
  NEPAL_OFFSET_MIN,
  NEPAL_OFFSET_MS,
  toNepalWallClockDate,
  fromNepalWallClockToUtc,
  getNepalNow,
  getCurrentBS,
  adToBS,
  bsToAdDate,
  getDaysInBSMonth,
  getBSMonthUtcRange,
  getBSDayUtcRange,
  getNepalTodayUtcRange,
  formatBS,
  formatAD,
  formatNepalTime,
  BS_MONTHS_EN,
  BS_MONTHS_NP,
};
