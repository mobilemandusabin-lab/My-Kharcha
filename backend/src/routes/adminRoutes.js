const router = require('express').Router();
const auth = require('../middleware/auth');
const requireSuperAdmin = require('../middleware/requireSuperAdmin');
const User = require('../models/User');
const Family = require('../models/Family');
const FamilyMember = require('../models/FamilyMember');
const asyncHandler = require('../utils/asyncHandler');

router.use(auth, requireSuperAdmin);

router.get('/users', asyncHandler(async (req, res) => {
  const users = await User.find().select('-passwordHash').sort({ createdAt: -1 }).lean();
  res.json({ users });
}));

router.get('/families', asyncHandler(async (req, res) => {
  const families = await Family.find().sort({ createdAt: -1 }).lean();
  const ids = families.map(f => f._id);
  const members = await FamilyMember.aggregate([
    { $match: { familyId: { $in: ids } } },
    { $group: { _id: '$familyId', count: { $sum: 1 }, activeCount: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } } } }
  ]);
  const map = Object.fromEntries(members.map(m => [String(m._id), m]));
  res.json({ families: families.map(f => ({ ...f, memberCount: map[String(f._id)]?.count || 0, activeMemberCount: map[String(f._id)]?.activeCount || 0 })) });
}));

module.exports = router;
