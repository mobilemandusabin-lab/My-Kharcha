const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const { requireMembership, getActiveMembership } = require('../services/familyAccess');
const asyncHandler = require('../utils/asyncHandler');
const { getCurrentBS } = require('../utils/nepalDate');
const { parseBSMonthQuery, getTodayRange } = require('../services/dateRange');
const { v4: uuidv4 } = require('uuid');

function toBool(v) { return v === true || v === 'true' || v === '1'; }

async function ensurePaidByInFamily(familyId, paidBy) {
  const m = await getActiveMembership(familyId, paidBy);
  if (!m) { const err = new Error('Paid by must be an active family member'); err.status = 400; throw err; }
}

function buildScopeQuery(user, query) {
  const scope = query.scope || 'personal';
  if (scope === 'family') {
    if (!query.familyId) throw Object.assign(new Error('familyId is required for family scope'), { status: 400 });
    return { scope: 'family', familyId: query.familyId };
  }
  return { scope: 'personal', userId: user._id, familyId: null };
}

exports.listTransactions = asyncHandler(async (req, res) => {
  const q = req.query || {};
  const scope = q.scope || 'personal';
  let filter = {};
  if (scope === 'family') {
    if (!q.familyId) return res.status(400).json({ message: 'familyId is required' });
    await requireMembership(q.familyId, req.user._id);
    filter = { scope: 'family', familyId: q.familyId };
    if (q.paidBy) filter.paidBy = q.paidBy;
  } else {
    filter = { scope: 'personal', userId: req.user._id, familyId: null };
  }
  if (q.type) filter.type = q.type;
  if (q.category) filter.category = q.category;
  if (q.paymentMethod) filter.paymentMethod = q.paymentMethod;
  if (q.bookmarked !== undefined) filter.isBookmarked = toBool(q.bookmarked);
  if (q.paymentStatus) filter.paymentStatus = q.paymentStatus;
  if (q.search) filter.title = { $regex: String(q.search), $options: 'i' };
  if (q.from || q.to) {
    filter.transactionAt = {};
    if (q.from) filter.transactionAt.$gte = new Date(q.from);
    if (q.to) filter.transactionAt.$lte = new Date(q.to);
  }
  let sort = { transactionAt: -1, createdAt: -1 };
  if (q.sort === 'oldest') sort = { transactionAt: 1, createdAt: 1 };
  if (q.sort === 'highest') sort = { amount: -1, transactionAt: -1 };
  if (q.sort === 'lowest') sort = { amount: 1, transactionAt: -1 };
  const limit = Math.min(Number(q.limit || 500), 2000);
  const items = await Transaction.find(filter).sort(sort).limit(limit).lean();
  res.json({ transactions: items });
});

exports.getTransaction = asyncHandler(async (req, res) => {
  const tx = await Transaction.findById(req.params.id);
  if (!tx) return res.status(404).json({ message: 'Transaction not found' });
  if (tx.scope === 'personal') {
    if (String(tx.userId) !== String(req.user._id)) return res.status(403).json({ message: 'Access denied' });
  } else {
    await requireMembership(tx.familyId, req.user._id);
  }
  res.json({ transaction: tx });
});

exports.createTransaction = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const scope = body.scope || 'personal';
  const type = body.type || 'expense';
  const amount = Number(body.amount);
  if (!amount || amount <= 0) return res.status(400).json({ message: 'Amount must be greater than zero' });
  if (!body.title || !String(body.title).trim()) return res.status(400).json({ message: 'Title is required' });
  if (!body.category || !String(body.category).trim()) return res.status(400).json({ message: 'Category is required' });
  if (!['expense', 'income'].includes(type)) return res.status(400).json({ message: 'Invalid type' });
  const clientTransactionId = body.clientTransactionId || uuidv4();
  const transactionAt = body.transactionAt ? new Date(body.transactionAt) : new Date();
  if (isNaN(transactionAt.getTime())) return res.status(400).json({ message: 'Invalid date/time' });

  let familyId = null;
  let paidBy = req.user._id;
  if (scope === 'family') {
    if (!body.familyId) return res.status(400).json({ message: 'familyId is required for family expense' });
    await requireMembership(body.familyId, req.user._id, ['admin', 'member']);
    familyId = body.familyId;
    paidBy = body.paidBy || req.user._id;
    await ensurePaidByInFamily(familyId, paidBy);
  } else {
    if (scope !== 'personal') return res.status(400).json({ message: 'Invalid scope' });
    familyId = null;
    paidBy = req.user._id;
  }

  const tx = await Transaction.create({
    userId: req.user._id,
    familyId,
    clientTransactionId,
    scope,
    type,
    title: String(body.title).trim(),
    amount: Math.round(amount * 100) / 100,
    category: String(body.category).trim(),
    paymentMethod: body.paymentMethod || 'Cash',
    paidBy,
    notes: body.notes || '',
    transactionAt,
    isBookmarked: !!body.isBookmarked,
    source: body.source || 'manual',
    paymentStatus: body.paymentStatus === 'unpaid' ? 'unpaid' : 'paid',
    settledAt: body.paymentStatus === 'unpaid' ? null : (body.settledAt ? new Date(body.settledAt) : null),
    isSeed: !!body.isSeed,
  });
  res.status(201).json({ transaction: tx });
});

function canManageFamilyTx(tx, membership, userId) {
  if (!membership) return false;
  if (membership.role === 'admin') return true;
  if (membership.role === 'member') return String(tx.userId) === String(userId);
  return false;
}

exports.updateTransaction = asyncHandler(async (req, res) => {
  const tx = await Transaction.findById(req.params.id);
  if (!tx) return res.status(404).json({ message: 'Transaction not found' });
  if (tx.scope === 'personal') {
    if (String(tx.userId) !== String(req.user._id)) return res.status(403).json({ message: 'Access denied' });
  } else {
    const membership = await requireMembership(tx.familyId, req.user._id);
    if (!canManageFamilyTx(tx, membership, req.user._id)) return res.status(403).json({ message: 'Insufficient permissions' });
  }
  const body = req.body || {};
  if (body.amount !== undefined) {
    const amount = Number(body.amount);
    if (!amount || amount <= 0) return res.status(400).json({ message: 'Amount must be greater than zero' });
    tx.amount = Math.round(amount * 100) / 100;
  }
  if (body.title !== undefined) {
    if (!String(body.title).trim()) return res.status(400).json({ message: 'Title is required' });
    tx.title = String(body.title).trim();
  }
  if (body.category !== undefined) {
    if (!String(body.category).trim()) return res.status(400).json({ message: 'Category is required' });
    tx.category = String(body.category).trim();
  }
  if (body.type) tx.type = body.type;
  if (body.paymentMethod !== undefined) tx.paymentMethod = body.paymentMethod;
  if (body.notes !== undefined) tx.notes = body.notes;
  if (body.transactionAt) tx.transactionAt = new Date(body.transactionAt);
  if (body.isBookmarked !== undefined) tx.isBookmarked = !!body.isBookmarked;
  if (body.paymentStatus) {
    tx.paymentStatus = body.paymentStatus === 'unpaid' ? 'unpaid' : 'paid';
    tx.settledAt = tx.paymentStatus === 'paid' ? (body.settledAt ? new Date(body.settledAt) : (tx.settledAt || new Date())) : null;
  }
  if (body.paidBy && tx.scope === 'family') {
    await ensurePaidByInFamily(tx.familyId, body.paidBy);
    tx.paidBy = body.paidBy;
  }
  await tx.save();
  res.json({ transaction: tx });
});

exports.deleteTransaction = asyncHandler(async (req, res) => {
  const tx = await Transaction.findById(req.params.id);
  if (!tx) return res.status(404).json({ message: 'Transaction not found' });
  if (tx.scope === 'personal') {
    if (String(tx.userId) !== String(req.user._id)) return res.status(403).json({ message: 'Access denied' });
  } else {
    const membership = await requireMembership(tx.familyId, req.user._id);
    if (!canManageFamilyTx(tx, membership, req.user._id)) return res.status(403).json({ message: 'Insufficient permissions' });
  }
  await tx.deleteOne();
  res.json({ message: 'Deleted' });
});

exports.toggleBookmark = asyncHandler(async (req, res) => {
  const tx = await Transaction.findById(req.params.id);
  if (!tx) return res.status(404).json({ message: 'Transaction not found' });
  if (tx.scope === 'personal') {
    if (String(tx.userId) !== String(req.user._id)) return res.status(403).json({ message: 'Access denied' });
  } else {
    await requireMembership(tx.familyId, req.user._id); // members/viewers can view; allow bookmark for members/admins
    const m = await requireMembership(tx.familyId, req.user._id);
    if (!['admin','member'].includes(m.role)) return res.status(403).json({ message: 'Insufficient permissions' });
  }
  tx.isBookmarked = !tx.isBookmarked;
  await tx.save();
  res.json({ transaction: tx });
});

exports.settleTransaction = asyncHandler(async (req, res) => {
  const tx = await Transaction.findById(req.params.id);
  if (!tx) return res.status(404).json({ message: 'Transaction not found' });
  if (tx.scope === 'personal') {
    if (String(tx.userId) !== String(req.user._id)) return res.status(403).json({ message: 'Access denied' });
  } else {
    const membership = await requireMembership(tx.familyId, req.user._id);
    if (!canManageFamilyTx(tx, membership, req.user._id) && membership.role !== 'member') {
      // allow members/admins who can manage or at least members to settle? be permissive to members in family
    }
    if (!['admin','member'].includes(membership.role)) return res.status(403).json({ message: 'Insufficient permissions' });
  }
  tx.paymentStatus = 'paid';
  tx.settledAt = new Date();
  await tx.save();
  res.json({ transaction: tx });
});

exports.syncTransactions = asyncHandler(async (req, res) => {
  const items = Array.isArray(req.body && req.body.transactions) ? req.body.transactions : [];
  const results = [];
  for (const item of items) {
    try {
      if (!item || !item.clientTransactionId) {
        results.push({ clientTransactionId: item && item.clientTransactionId, status: 'error', message: 'clientTransactionId required' });
        continue;
      }
      // if exists for this user, treat as success (idempotent)
      const existing = await Transaction.findOne({ userId: req.user._id, clientTransactionId: item.clientTransactionId });
      if (existing) {
        results.push({ clientTransactionId: item.clientTransactionId, status: 'ok', transactionId: existing._id, duplicate: true });
        continue;
      }
      // create using same logic; force userId
      req.body = { ...item, source: item.source || 'offline-sync' };
      // inline create logic minimal
      const scope = item.scope || 'personal';
      const type = item.type || 'expense';
      const amount = Number(item.amount);
      if (!amount || amount <= 0 || !item.title || !item.category) {
        results.push({ clientTransactionId: item.clientTransactionId, status: 'error', message: 'Invalid transaction data' });
        continue;
      }
      let familyId = null; let paidBy = req.user._id;
      if (scope === 'family') {
        if (!item.familyId) { results.push({ clientTransactionId: item.clientTransactionId, status: 'error', message: 'familyId required' }); continue; }
        const m = await getActiveMembership(item.familyId, req.user._id);
        if (!m || !['admin','member'].includes(m.role)) { results.push({ clientTransactionId: item.clientTransactionId, status: 'error', message: 'Not authorized for family' }); continue; }
        familyId = item.familyId; paidBy = item.paidBy || req.user._id;
        const pm = await getActiveMembership(familyId, paidBy);
        if (!pm) { results.push({ clientTransactionId: item.clientTransactionId, status: 'error', message: 'Invalid paidBy' }); continue; }
      }
      const tx = await Transaction.create({
        userId: req.user._id,
        familyId,
        clientTransactionId: item.clientTransactionId,
        scope,
        type,
        title: String(item.title).trim(),
        amount: Math.round(amount * 100) / 100,
        category: String(item.category).trim(),
        paymentMethod: item.paymentMethod || 'Cash',
        paidBy,
        notes: item.notes || '',
        transactionAt: item.transactionAt ? new Date(item.transactionAt) : new Date(),
        isBookmarked: !!item.isBookmarked,
        source: item.source || 'offline-sync',
        paymentStatus: item.paymentStatus === 'unpaid' ? 'unpaid' : 'paid',
        settledAt: item.paymentStatus === 'unpaid' ? null : (item.settledAt ? new Date(item.settledAt) : null),
        isSeed: !!item.isSeed,
      });
      results.push({ clientTransactionId: item.clientTransactionId, status: 'ok', transactionId: tx._id });
    } catch (e) {
      if (e.code === 11000) {
        const existing = await Transaction.findOne({ userId: req.user._id, clientTransactionId: item.clientTransactionId });
        results.push({ clientTransactionId: item.clientTransactionId, status: 'ok', transactionId: existing && existing._id, duplicate: true });
      } else {
        results.push({ clientTransactionId: item.clientTransactionId, status: 'error', message: e.message });
      }
    }
  }
  res.json({ results });
});
