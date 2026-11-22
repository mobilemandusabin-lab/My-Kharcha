const { getCurrentBS, getBSMonthUtcRange, getBSDayUtcRange, getNepalTodayUtcRange, adToBS } = require('../utils/nepalDate');

function parseBSMonthQuery(query) {
  const current = getCurrentBS();
  const year = Number(query.bsYear || query.year || current.year);
  const month = Number(query.bsMonth || query.month || current.month);
  if (!year || !month || month < 1 || month > 12) throw Object.assign(new Error('Invalid BS month'), { status: 400 });
  return { year, month, ...getBSMonthUtcRange(year, month) };
}

function getTodayRange() { return getNepalTodayUtcRange(); }

module.exports = { parseBSMonthQuery, getTodayRange, getCurrentBS, adToBS };
