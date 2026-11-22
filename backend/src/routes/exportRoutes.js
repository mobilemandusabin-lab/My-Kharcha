const router = require('express').Router();
const auth = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const Transaction = require('../models/Transaction');
const { requireMembership } = require('../services/familyAccess');

function toCsv(rows) {
  const header = ['date','type','title','category','amount','paymentMethod','paymentStatus','scope','notes'];
  const esc = (v) => '"' + String(v ?? '').replace(/"/g,'""') + '"';
  const lines = [header.join(',')];
  for (const r of rows) {
    lines.push([r.transactionAt.toISOString(), r.type, r.title, r.category, r.amount, r.paymentMethod, r.paymentStatus, r.scope, r.notes||''].map(esc).join(','));
  }
  return lines.join('\n');
}

router.use(auth);
router.get('/transactions.csv', asyncHandler(async (req, res) => {
  const scope = req.query.scope || 'personal';
  let filter = {};
  if (scope === 'family') {
    if (!req.query.familyId) return res.status(400).json({ message: 'familyId required' });
    await requireMembership(req.query.familyId, req.user._id);
    filter = { scope: 'family', familyId: req.query.familyId };
  } else {
    filter = { scope: 'personal', userId: req.user._id, familyId: null };
  }
  const rows = await Transaction.find(filter).sort({ transactionAt: -1 }).lean();
  const csv = toCsv(rows);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="transactions.csv"');
  res.send(csv);
}));
module.exports = router;
