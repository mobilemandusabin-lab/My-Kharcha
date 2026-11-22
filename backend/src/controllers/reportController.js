const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const { requireMembership } = require('../services/familyAccess');
const asyncHandler = require('../utils/asyncHandler');
const { parseBSMonthQuery, getTodayRange } = require('../services/dateRange');
const { toNepalWallClockDate, fromNepalWallClockToUtc, adToBS, getCurrentBS, getBSMonthUtcRange, getDaysInBSMonth } = require('../utils/nepalDate');
const Budget = require('../models/Budget');

async function resolveScopeFilter(req) {
  const scope = req.query.scope || 'personal';
  if (scope === 'family') {
    const familyId = req.query.familyId || req.params.familyId;
    if (!familyId) throw Object.assign(new Error('familyId required'), { status: 400 });
    await requireMembership(familyId, req.user._id);
    return { scope: 'family', familyId: new mongoose.Types.ObjectId(String(familyId)) };
  }
  return { scope: 'personal', userId: req.user._id, familyId: null };
}

function sumBy(items, key) {
  const map = {};
  for (const it of items) { const k = it[key] || 'Unknown'; map[k] = (map[k] || 0) + it.total; }
  return map;
}

async function aggregateTotals(match) {
  const rows = await Transaction.aggregate([
    { $match: match },
    { $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } }
  ]);
  let income = 0, expense = 0, incomeCount = 0, expenseCount = 0;
  for (const r of rows) { if (r._id === 'income') { income = r.total; incomeCount = r.count; } else { expense = r.total; expenseCount = r.count; } }
  return { income, expense, net: income - expense, incomeCount, expenseCount, count: incomeCount + expenseCount };
}

async function aggregateBy(match, field, extraGroup = {}) {
  return Transaction.aggregate([
    { $match: match },
    { $group: { _id: `$${field}`, total: { $sum: '$amount' }, count: { $sum: 1 }, ...extraGroup } },
    { $sort: { total: -1 } }
  ]);
}

function getCurrentWeekRangeNepal() {
  const wall = toNepalWallClockDate(new Date());
  const y = wall.getUTCFullYear(), m = wall.getUTCMonth(), d = wall.getUTCDate();
  // JS getUTCDay on wall-clock-as-UTC gives day of week of Nepal date (0 Sun)
  const dayOfWeek = new Date(Date.UTC(y,m,d)).getUTCDay();
  const startDay = d - dayOfWeek; // Sunday
  const startUtc = fromNepalWallClockToUtc(y, m, startDay, 0,0,0,0);
  const endUtc = fromNepalWallClockToUtc(y, m, startDay + 6, 23,59,59,999);
  return { startUtc, endUtc };
}

exports.summary = asyncHandler(async (req, res) => {
  const base = await resolveScopeFilter(req);
  const { year, month, startUtc, endUtc } = parseBSMonthQuery(req.query);
  const today = getTodayRange();
  const monthMatch = { ...base, transactionAt: { $gte: startUtc, $lte: endUtc } };
  const todayMatch = { ...base, transactionAt: { $gte: today.startUtc, $lte: today.endUtc } };
  const [monthTotals, todayTotals, recent, outstandingAgg, todayCountAgg] = await Promise.all([
    aggregateTotals(monthMatch),
    aggregateTotals(todayMatch),
    Transaction.find(base).sort({ transactionAt: -1 }).limit(10).lean(),
    Transaction.aggregate([{ $match: { ...monthMatch, paymentStatus: 'unpaid' } }, { $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } }]),
    Transaction.countDocuments({ ...todayMatch, type: 'expense' })
  ]);
  let outstanding = { expense: 0, income: 0, count: 0 };
  for (const r of outstandingAgg) { if (r._id === 'expense') { outstanding.expense = r.total; outstanding.count += r.count; } else { outstanding.income = r.total; outstanding.count += r.count; } }
  res.json({ bsMonth: { year, month }, month: monthTotals, today: { ...todayTotals, expenseTransactionCount: todayCountAgg }, outstandingUdhar: outstanding, recent });
});

exports.monthlyReport = asyncHandler(async (req, res) => {
  const base = await resolveScopeFilter(req);
  const { year, month, startUtc, endUtc } = parseBSMonthQuery(req.query);
  const match = { ...base, transactionAt: { $gte: startUtc, $lte: endUtc } };
  const prev90Start = new Date(startUtc.getTime() - 90 * 24 * 60 * 60 * 1000);
  const [totals, byCategory, byIncomeCategory, byPayment, byDayExpense, byDayIncome, recentCatStats] = await Promise.all([
    aggregateTotals(match),
    Transaction.aggregate([{ $match: { ...match, type: 'expense' } }, { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } }, { $sort: { total: -1 } }]),
    Transaction.aggregate([{ $match: { ...match, type: 'income' } }, { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } }, { $sort: { total: -1 } }]),
    Transaction.aggregate([{ $match: { ...match, type: 'expense' } }, { $group: { _id: '$paymentMethod', total: { $sum: '$amount' }, count: { $sum: 1 } } }, { $sort: { total: -1 } }]),
    Transaction.aggregate([
      { $match: { ...match, type: 'expense' } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$transactionAt', timezone: '+05:45' } }, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]),
    Transaction.aggregate([
      { $match: { ...match, type: 'income' } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$transactionAt', timezone: '+05:45' } }, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]),
    Transaction.aggregate([
      { $match: { ...base, type: 'expense', transactionAt: { $gte: prev90Start, $lt: startUtc } } },
      { $group: { _id: '$category', avg: { $avg: '$amount' }, std: { $stdDevPop: '$amount' }, count: { $sum: 1 } } }
    ])
  ]);

  const days = byDayExpense.map(d => ({ date: d._id, total: d.total, count: d.count }));
  const incomeDays = byDayIncome.map(d => ({ date: d._id, total: d.total, count: d.count }));
  const dayMap = new Map();
  for (const d of days) dayMap.set(d.date, { date: d.date, expense: d.total, income: 0, net: -d.total, expenseCount: d.count, incomeCount: 0 });
  for (const d of incomeDays) {
    const ex = dayMap.get(d.date) || { date: d.date, expense: 0, income: 0, net: 0, expenseCount: 0, incomeCount: 0 };
    ex.income = d.total; ex.incomeCount = d.count; ex.net = ex.income - ex.expense; dayMap.set(d.date, ex);
  }
  const cashflowByDay = Array.from(dayMap.values()).sort((a,b) => a.date.localeCompare(b.date));

  const highestDay = days.length ? days.reduce((a,b)=>a.total>=b.total?a:b) : null;
  const lowestDay = days.length ? days.reduce((a,b)=>a.total<=b.total?a:b) : null;
  const avgDaily = days.length ? (totals.expense / days.length) : 0;

  // Simple anomaly detection: unusually high expense transactions vs previous 90 days category baseline
  const catStats = new Map(recentCatStats.map(r => [r._id, r]));
  const monthExpenses = await Transaction.find({ ...match, type: 'expense' }).sort({ amount: -1 }).limit(200).lean();
  const anomalies = [];
  for (const tx of monthExpenses) {
    const st = catStats.get(tx.category);
    if (!st || st.count < 3) continue;
    const threshold = Math.max(st.avg * 2, st.avg + 2 * (st.std || 0));
    if (tx.amount >= threshold && tx.amount >= 500) {
      anomalies.push({
        id: tx._id,
        title: tx.title,
        category: tx.category,
        amount: tx.amount,
        transactionAt: tx.transactionAt,
        reason: `Higher than usual for ${tx.category} (avg रु${Math.round(st.avg).toLocaleString('en-IN')})`,
        severity: tx.amount >= st.avg * 3 ? 'high' : 'medium',
      });
    }
  }
  anomalies.sort((a,b)=>b.amount-a.amount);

  res.json({
    bsMonth: { year, month },
    totals,
    expenseByCategory: byCategory.map(x=>({category:x._id,total:x.total,count:x.count})),
    incomeByCategory: byIncomeCategory.map(x=>({category:x._id,total:x.total,count:x.count})),
    expenseByPayment: byPayment.map(x=>({method:x._id,total:x.total,count:x.count})),
    daily: days,
    cashflowByDay,
    anomalies: anomalies.slice(0, 8),
    highestSpendingDay: highestDay,
    lowestSpendingDay: lowestDay,
    averageDailySpending: avgDaily
  });
});

exports.monthEndSummary = asyncHandler(async (req, res) => {
  const base = await resolveScopeFilter(req);
  const { year, month, startUtc, endUtc } = parseBSMonthQuery(req.query);
  const match = { ...base, transactionAt: { $gte: startUtc, $lte: endUtc } };
  const [totals, incomeByCategory, expenseByCategory, udhar] = await Promise.all([
    aggregateTotals(match),
    Transaction.aggregate([{ $match: { ...match, type: 'income' } }, { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } }, { $sort: { total: -1 } }]),
    Transaction.aggregate([{ $match: { ...match, type: 'expense' } }, { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } }, { $sort: { total: -1 } }]),
    Transaction.aggregate([{ $match: { ...match, paymentStatus: 'unpaid' } }, { $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } }])
  ]);
  const outstanding = { expense:0,income:0,count:0 };
  for (const r of udhar) { if (r._id==='expense'){outstanding.expense=r.total; outstanding.count+=r.count;} else {outstanding.income=r.total; outstanding.count+=r.count;} }
  res.json({
    bsMonth: { year, month },
    income: { total: totals.income, count: totals.incomeCount, byCategory: incomeByCategory.map(x=>({category:x._id,total:x.total,count:x.count})) },
    expenses: { total: totals.expense, count: totals.expenseCount, byCategory: expenseByCategory.map(x=>({category:x._id,total:x.total,count:x.count})) },
    net: totals.net,
    outstandingUdhar: outstanding,
  });
});

exports.categoryReport = asyncHandler(async (req, res) => {
  const base = await resolveScopeFilter(req);
  const { year, month, startUtc, endUtc } = parseBSMonthQuery(req.query);
  const match = { ...base, transactionAt: { $gte: startUtc, $lte: endUtc }, type: 'expense' };
  const rows = await Transaction.aggregate([{ $match: match }, { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } }, { $sort: { total: -1 } }]);
  res.json({ bsMonth: { year, month }, categories: rows.map(r=>({category:r._id,total:r.total,count:r.count})) });
});

exports.memberReport = asyncHandler(async (req, res) => {
  const base = await resolveScopeFilter(req);
  if (base.scope !== 'family') return res.status(400).json({ message: 'Family scope required' });
  const { year, month, startUtc, endUtc } = parseBSMonthQuery(req.query);
  const match = { ...base, transactionAt: { $gte: startUtc, $lte: endUtc }, type: 'expense' };
  const rows = await Transaction.aggregate([
    { $match: match },
    { $group: { _id: '$paidBy', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    { $sort: { total: -1 } },
    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
    { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
  ]);
  const total = rows.reduce((s,r)=>s+r.total,0);
  res.json({ bsMonth: { year, month }, total, members: rows.map(r=>({ userId: r._id, name: r.user ? r.user.name : 'Unknown', total: r.total, count: r.count, percentage: total ? (r.total/total*100) : 0 })) });
});

exports.dailyReport = asyncHandler(async (req, res) => {
  const base = await resolveScopeFilter(req);
  const { startUtc, endUtc } = getTodayRange();
  const match = { ...base, transactionAt: { $gte: startUtc, $lte: endUtc } };
  const totals = await aggregateTotals(match);
  const expenses = await Transaction.find({ ...match, type: 'expense' }).lean();
  const highest = expenses.length ? expenses.reduce((a,b)=>a.amount>=b.amount?a:b) : null;
  const avg = expenses.length ? totals.expense / expenses.length : 0;
  res.json({ totals, averageExpense: avg, highestExpense: highest, transactionCount: totals.count });
});

exports.weeklyReport = asyncHandler(async (req, res) => {
  const base = await resolveScopeFilter(req);
  const { startUtc, endUtc } = getCurrentWeekRangeNepal();
  const match = { ...base, transactionAt: { $gte: startUtc, $lte: endUtc } };
  const [totals, byDay, byCategory] = await Promise.all([
    aggregateTotals(match),
    Transaction.aggregate([
      { $match: { ...match, type: 'expense' } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$transactionAt', timezone: '+05:45' } }, total: { $sum: '$amount' } } },
      { $sort: { _id: 1 } }
    ]),
    Transaction.aggregate([{ $match: { ...match, type: 'expense' } }, { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } }, { $sort: { total: -1 } }])
  ]);
  const daily = byDay.map(d => {
    const dt = new Date(d._id + 'T00:00:00+05:45');
    const day = dt.getDay(); // 0 Sun local? dt created with offset but getDay uses local runtime; better compute by Nepal
    // mark Saturday as holiday (6)
    const isSaturday = new Date(d._id + 'T12:00:00+05:45').getUTCDay ? null : null;
    return { date: d._id, total: d.total };
  });
  // compute saturday flag by parsing date in Nepal
  const dailyMarked = daily.map(d => {
    const nd = new Date(d.date + 'T00:00:00+05:45');
    // get day of week in Nepal: convert to Nepal wall clock conceptually - easier: use known offset date string weekday via UTC of that instant +5:45? simpler compute
    const js = new Date(d.date + 'T12:00:00+05:45');
    const nepalDay = new Date(js.getTime() + 0).getUTCDay(); // js is instant representing noon Nepal; adding 0 and getting UTC day of (instant+5:45?) not right. Better: derive from date string with offset using Intl
    return d;
  });
  // simpler: mark saturday based on Date parsed as Nepal
  const dailyFinal = byDay.map(d => {
    const parts = d._id.split('-').map(Number);
    const utc = Date.UTC(parts[0], parts[1]-1, parts[2], 12,0,0) - (5*60+45)*60*1000; // noon Nepal
    const w = new Date(utc + (5*60+45)*60*1000).getUTCDay();
    return { date: d._id, total: d.total, isHoliday: w === 6, dayOfWeek: w };
  });
  res.json({ range: { startUtc, endUtc }, week: 'Sunday–Saturday (Saturday holiday)', totals, daily: dailyFinal, expenseByCategory: byCategory.map(x=>({category:x._id,total:x.total,count:x.count})) });
});


function prevBS(year, month, n = 1) {
  let y = year, m = month;
  for (let i = 0; i < n; i++) { m--; if (m < 1) { m = 12; y--; } }
  return { year: y, month: m };
}

exports.monthlyComparison = asyncHandler(async (req, res) => {
  const base = await resolveScopeFilter(req);
  const monthsCount = Math.min(Math.max(Number(req.query.months || 6), 1), 12);
  const current = getCurrentBS();
  const endYear = Number(req.query.bsYear || current.year);
  const endMonth = Number(req.query.bsMonth || current.month);

  const months = [];
  for (let i = monthsCount - 1; i >= 0; i--) {
    months.push(prevBS(endYear, endMonth, i));
  }

  const results = [];
  for (const m of months) {
    const { startUtc, endUtc } = getBSMonthUtcRange(m.year, m.month);
    const match = { ...base, transactionAt: { $gte: startUtc, $lte: endUtc } };
    const [totals, byExpenseCat, byIncomeCat, budget] = await Promise.all([
      aggregateTotals(match),
      Transaction.aggregate([
        { $match: { ...match, type: 'expense' } },
        { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { total: -1 } },
        { $limit: 8 }
      ]),
      Transaction.aggregate([
        { $match: { ...match, type: 'income' } },
        { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { total: -1 } },
        { $limit: 8 }
      ]),
      (() => {
        const q = { scope: base.scope, year: m.year, month: m.month };
        if (base.scope === 'family') { q.familyId = base.familyId; q.userId = null; }
        else { q.userId = base.userId; q.familyId = null; }
        return Budget.findOne(q).lean();
      })()
    ]);
    const budgetTotal = budget?.totalBudget || 0;
    const spent = totals.expense || 0;
    const daysInMonth = getDaysInBSMonth(m.year, m.month);
    results.push({
      bsYear: m.year,
      bsMonth: m.month,
      label: `${m.year}-${String(m.month).padStart(2, '0')}`,
      daysInMonth,
      income: totals.income,
      expense: totals.expense,
      net: totals.net,
      incomeCount: totals.incomeCount,
      expenseCount: totals.expenseCount,
      savingsRate: totals.income > 0 ? (totals.net / totals.income) * 100 : null,
      expenseToIncomeRatio: totals.income > 0 ? (totals.expense / totals.income) * 100 : null,
      budgetTotal,
      budgetRemaining: budgetTotal ? (budgetTotal - spent) : null,
      budgetUsedPercent: budgetTotal ? (spent / budgetTotal) * 100 : null,
      topExpenseCategories: byExpenseCat.map(x => ({ category: x._id, total: x.total, count: x.count })),
      topIncomeCategories: byIncomeCat.map(x => ({ category: x._id, total: x.total, count: x.count })),
    });
  }

  // MoM changes (compare to previous in array)
  const withChanges = results.map((cur, idx) => {
    const prev = idx > 0 ? results[idx - 1] : null;
    function delta(currVal, prevVal) {
      if (prevVal == null) return null;
      const amount = currVal - prevVal;
      const percent = prevVal !== 0 ? (amount / Math.abs(prevVal)) * 100 : null;
      return { amount, percent };
    }
    return {
      ...cur,
      mom: prev ? {
        income: delta(cur.income, prev.income),
        expense: delta(cur.expense, prev.expense),
        net: delta(cur.net, prev.net),
      } : null,
    };
  });

  const totals = withChanges.reduce((acc, m) => {
    acc.income += m.income; acc.expense += m.expense; acc.net += m.net;
    return acc;
  }, { income: 0, expense: 0, net: 0 });
  const avg = {
    income: withChanges.length ? totals.income / withChanges.length : 0,
    expense: withChanges.length ? totals.expense / withChanges.length : 0,
    net: withChanges.length ? totals.net / withChanges.length : 0,
  };

  // Category MoM trends (top expense categories across period)
  const catTotals = new Map();
  for (const m of withChanges) for (const c of (m.topExpenseCategories || [])) catTotals.set(c.category, (catTotals.get(c.category) || 0) + c.total);
  const topCats = Array.from(catTotals.entries()).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([c])=>c);
  const categoryTrends = topCats.map(cat => ({
    category: cat,
    series: withChanges.map(m => ({ label: m.label, total: (m.topExpenseCategories || []).find(x => x.category === cat)?.total || 0 })),
    total: catTotals.get(cat) || 0,
  }));

  const incomeCatTotals = new Map();
  for (const m of withChanges) for (const c of (m.topIncomeCategories || [])) incomeCatTotals.set(c.category, (incomeCatTotals.get(c.category) || 0) + c.total);
  const topIncomeCats = Array.from(incomeCatTotals.entries()).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([c])=>c);
  const incomeSourceTrends = topIncomeCats.map(cat => ({
    category: cat,
    series: withChanges.map(m => ({ label: m.label, total: (m.topIncomeCategories || []).find(x => x.category === cat)?.total || 0 })),
    total: incomeCatTotals.get(cat) || 0,
  }));

  const bestMonth = withChanges.length ? withChanges.reduce((a,b)=>a.net>=b.net?a:b) : null;
  const worstMonth = withChanges.length ? withChanges.reduce((a,b)=>a.net<=b.net?a:b) : null;

  res.json({ months: withChanges, period: { count: withChanges.length, from: months[0], to: months[months.length - 1] }, totals, averages: avg, categoryTrends, incomeSourceTrends, highlights: { bestMonth, worstMonth } });
});
