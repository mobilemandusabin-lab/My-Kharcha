const router = require('express').Router();
const auth = require('../middleware/auth');
const { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES, PAYMENT_METHODS } = require('../utils/constants');
const { getCurrentBS, formatBS, formatAD, getNepalNow, getDaysInBSMonth } = require('../utils/nepalDate');
const Settings = require('../models/Settings');
const FamilyMember = require('../models/FamilyMember');

router.get('/bootstrap', auth, async (req, res, next) => {
  try {
    const bs = getCurrentBS();
    const settings = await Settings.findOne({ userId: req.user._id });
    const memberships = await FamilyMember.find({ userId: req.user._id, status: 'active' }).populate('familyId');
    const families = memberships.map(m => ({ id: m.familyId._id, name: m.familyId.familyName, role: m.role, family: m.familyId }));
    res.json({
      user: { id: req.user._id, name: req.user.name, email: req.user.email },
      settings,
      families,
      categories: { expense: DEFAULT_EXPENSE_CATEGORIES, income: DEFAULT_INCOME_CATEGORIES },
      paymentMethods: PAYMENT_METHODS,
      nepal: {
        bs,
        daysInMonth: getDaysInBSMonth(bs.year, bs.month),
        bsFormatted: formatBS(bs, { nepaliDigits: true, lang: 'np' }),
        adFormatted: formatAD(new Date()),
        time: (()=>{ const w=getNepalNow(); return `${String(w.getUTCHours()).padStart(2,'0')}:${String(w.getUTCMinutes()).padStart(2,'0')}`; })(),
      }
    });
  } catch (e) { next(e); }
});

module.exports = router;
