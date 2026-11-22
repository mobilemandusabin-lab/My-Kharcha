const FamilyMember = require('../models/FamilyMember');
const Family = require('../models/Family');

async function getActiveMembership(familyId, userId) {
  if (!familyId || !userId) return null;
  return FamilyMember.findOne({ familyId, userId, status: 'active' }).populate('familyId');
}

async function requireMembership(familyId, userId, roles = null) {
  const membership = await getActiveMembership(familyId, userId);
  if (!membership) {
    const err = new Error('Access denied'); err.status = 403; throw err;
  }
  if (roles && !roles.includes(membership.role)) {
    const err = new Error('Insufficient permissions'); err.status = 403; throw err;
  }
  return membership;
}

async function getFamilyOr403(familyId, userId) {
  await requireMembership(familyId, userId);
  const family = await Family.findById(familyId);
  if (!family || !family.isActive) { const err = new Error('Family not found'); err.status = 404; throw err; }
  return family;
}

module.exports = { getActiveMembership, requireMembership, getFamilyOr403 };
