const Budget = require('../models/Budget');
const { requireMembership } = require('../services/familyAccess');
const asyncHandler = require('../utils/asyncHandler');
const { parseBSMonthQuery } = require('../services/dateRange');

exports.listBudgets = asyncHandler(async (req, res) => {
  const scope = req.query.scope || 'personal';
  const { year, month } = parseBSMonthQuery(req.query);
  let filter = { scope, year, month };
  if (scope === 'family') {
    if (!req.query.familyId) return res.status(400).json({ message: 'familyId required' });
    await requireMembership(req.query.familyId, req.user._id);
    filter.familyId = req.query.familyId; filter.userId = null;
  } else {
    filter.userId = req.user._id; filter.familyId = null;
  }
  const budgets = await Budget.find(filter).lean();
  res.json({ budgets });
});

exports.upsertBudget = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const scope = body.scope || 'personal';
  const year = Number(body.year); const month = Number(body.month);
  if (!year || !month) return res.status(400).json({ message: 'BS year and month required' });
  let filter = { scope, year, month };
  let payload = { scope, year, month, totalBudget: Number(body.totalBudget || 0), categoryBudgets: body.categoryBudgets || [] };
  if (scope === 'family') {
    if (!body.familyId) return res.status(400).json({ message: 'familyId required' });
    await requireMembership(body.familyId, req.user._id, ['admin']);
    filter.familyId = body.familyId; filter.userId = null;
    payload.familyId = body.familyId; payload.userId = null;
  } else {
    filter.userId = req.user._id; filter.familyId = null;
    payload.userId = req.user._id; payload.familyId = null;
  }
  const budget = await Budget.findOneAndUpdate(filter, payload, { new: true, upsert: true, setDefaultsOnInsert: true });
  res.status(201).json({ budget });
});

exports.updateBudget = asyncHandler(async (req, res) => {
  const budget = await Budget.findById(req.params.id);
  if (!budget) return res.status(404).json({ message: 'Budget not found' });
  if (budget.scope === 'personal') {
    if (String(budget.userId) !== String(req.user._id)) return res.status(403).json({ message: 'Access denied' });
  } else {
    await requireMembership(budget.familyId, req.user._id, ['admin']);
  }
  if (req.body.totalBudget !== undefined) budget.totalBudget = Number(req.body.totalBudget);
  if (req.body.categoryBudgets !== undefined) budget.categoryBudgets = req.body.categoryBudgets;
  await budget.save();
  res.json({ budget });
});

exports.deleteBudget = asyncHandler(async (req, res) => {
  const budget = await Budget.findById(req.params.id);
  if (!budget) return res.status(404).json({ message: 'Budget not found' });
  if (budget.scope === 'personal') {
    if (String(budget.userId) !== String(req.user._id)) return res.status(403).json({ message: 'Access denied' });
  } else {
    await requireMembership(budget.familyId, req.user._id, ['admin']);
  }
  await budget.deleteOne();
  res.json({ message: 'Deleted' });
});
