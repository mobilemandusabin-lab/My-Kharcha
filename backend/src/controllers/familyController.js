const crypto = require('crypto');
const Family = require('../models/Family');
const FamilyMember = require('../models/FamilyMember');
const FamilyInvitation = require('../models/FamilyInvitation');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const { requireMembership, getActiveMembership } = require('../services/familyAccess');
const asyncHandler = require('../utils/asyncHandler');

function genCode(len = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  const bytes = crypto.randomBytes(len);
  for (let i = 0; i < len; i++) out += chars[bytes[i] % chars.length];
  return out;
}

exports.createFamily = asyncHandler(async (req, res) => {
  const { familyName, description, familyImage } = req.body || {};
  if (!familyName || !String(familyName).trim()) return res.status(400).json({ message: 'Family name is required' });
  const family = await Family.create({
    familyName: String(familyName).trim(),
    description: description || '',
    familyImage: familyImage || '',
    createdBy: req.user._id,
    currency: req.body.currency || 'NPR',
    timezone: req.body.timezone || 'Asia/Kathmandu',
    invitationCode: genCode(8),
  });
  await FamilyMember.create({ familyId: family._id, userId: req.user._id, role: 'admin', status: 'active', joinedAt: new Date() });
  res.status(201).json({ family });
});

exports.listFamilies = asyncHandler(async (req, res) => {
  const memberships = await FamilyMember.find({ userId: req.user._id, status: 'active' }).populate('familyId');
  const families = memberships.filter(m => m.familyId).map(m => ({ ...m.familyId.toObject(), myRole: m.role, membershipStatus: m.status }));
  res.json({ families });
});

exports.getFamily = asyncHandler(async (req, res) => {
  await requireMembership(req.params.familyId, req.user._id);
  const family = await Family.findById(req.params.familyId);
  if (!family) return res.status(404).json({ message: 'Family not found' });
  res.json({ family });
});

exports.updateFamily = asyncHandler(async (req, res) => {
  await requireMembership(req.params.familyId, req.user._id, ['admin']);
  const family = await Family.findById(req.params.familyId);
  if (!family) return res.status(404).json({ message: 'Family not found' });
  ['familyName','description','familyImage','currency','timezone','isActive'].forEach(k => { if (req.body[k] !== undefined) family[k] = req.body[k]; });
  await family.save();
  res.json({ family });
});

exports.deleteFamily = asyncHandler(async (req, res) => {
  await requireMembership(req.params.familyId, req.user._id, ['admin']);
  // soft delete/deactivate
  await Family.findByIdAndUpdate(req.params.familyId, { isActive: false });
  res.json({ message: 'Family deactivated' });
});

exports.listMembers = asyncHandler(async (req, res) => {
  await requireMembership(req.params.familyId, req.user._id);
  const members = await FamilyMember.find({ familyId: req.params.familyId, status: { $in: ['active','pending'] } }).populate('userId', 'name email profileImage');
  res.json({ members });
});

exports.inviteMember = asyncHandler(async (req, res) => {
  await requireMembership(req.params.familyId, req.user._id, ['admin']);
  const code = genCode(10);
  const expiresAt = req.body.expiresAt ? new Date(req.body.expiresAt) : new Date(Date.now() + 7*24*60*60*1000);
  const maxUses = Number(req.body.maxUses || 1);
  const invite = await FamilyInvitation.create({ familyId: req.params.familyId, invitationCode: code, invitedBy: req.user._id, expiresAt, maxUses, usedCount: 0, status: 'pending' });
  res.status(201).json({ invitation: invite, invitationCode: code });
});

exports.listInvitations = asyncHandler(async (req, res) => {
  await requireMembership(req.params.familyId, req.user._id, ['admin']);
  const invitations = await FamilyInvitation.find({ familyId: req.params.familyId }).sort({ createdAt: -1 });
  res.json({ invitations });
});

exports.revokeInvitation = asyncHandler(async (req, res) => {
  await requireMembership(req.params.familyId, req.user._id, ['admin']);
  const inv = await FamilyInvitation.findOne({ _id: req.params.inviteId, familyId: req.params.familyId });
  if (!inv) return res.status(404).json({ message: 'Invitation not found' });
  inv.status = 'revoked';
  await inv.save();
  res.json({ invitation: inv });
});

exports.joinFamily = asyncHandler(async (req, res) => {
  const code = String((req.body && (req.body.invitationCode || req.body.code)) || '').trim().toUpperCase();
  if (!code) return res.status(400).json({ message: 'Invitation code is required' });
  let invite = await FamilyInvitation.findOne({ invitationCode: code, status: 'pending' });
  let family = null;
  if (invite) {
    if (invite.expiresAt && invite.expiresAt < new Date()) { invite.status = 'expired'; await invite.save(); return res.status(400).json({ message: 'Invitation expired' }); }
    if (invite.usedCount >= invite.maxUses) { invite.status = 'expired'; await invite.save(); return res.status(400).json({ message: 'Invitation already used' }); }
    family = await Family.findById(invite.familyId);
  } else {
    // fallback: family.invitationCode (simple code on family)
    family = await Family.findOne({ invitationCode: code, isActive: true });
  }
  if (!family || !family.isActive) return res.status(404).json({ message: 'Invalid invitation' });
  const existing = await FamilyMember.findOne({ familyId: family._id, userId: req.user._id });
  if (existing && existing.status === 'active') return res.status(409).json({ message: 'Already a member of this family' });
  if (existing) { existing.status = 'active'; existing.joinedAt = new Date(); await existing.save(); }
  else await FamilyMember.create({ familyId: family._id, userId: req.user._id, role: 'member', status: 'active', joinedAt: new Date(), invitedBy: invite ? invite.invitedBy : family.createdBy });
  if (invite) { invite.usedCount += 1; if (invite.usedCount >= invite.maxUses) invite.status = 'accepted'; await invite.save(); }
  res.json({ message: 'Joined family successfully', family: { id: family._id, familyName: family.familyName } });
});

exports.removeMember = asyncHandler(async (req, res) => {
  const { familyId, userId } = req.params;
  const actor = await requireMembership(familyId, req.user._id);
  const target = await FamilyMember.findOne({ familyId, userId });
  if (!target) return res.status(404).json({ message: 'Member not found' });
  // only admin can remove others; user can maybe leave? plan states admin removes member; keep admin-only except maybe not specified
  if (String(userId) === String(req.user._id)) {
    // allow leaving if not sole admin? simple: allow
    target.status = 'removed'; await target.save(); return res.json({ message: 'Left family' });
  }
  if (actor.role !== 'admin') return res.status(403).json({ message: 'Insufficient permissions' });
  if (target.role === 'admin') return res.status(403).json({ message: 'Cannot remove an admin without permission' });
  target.status = 'removed'; await target.save();
  res.json({ message: 'Member removed' });
});

exports.changeRole = asyncHandler(async (req, res) => {
  const { familyId, userId } = req.params;
  await requireMembership(familyId, req.user._id, ['admin']);
  const { role } = req.body || {};
  if (!['admin','member','viewer'].includes(role)) return res.status(400).json({ message: 'Invalid role' });
  // prevent self role change escalation/demotion issues? "member cannot change their own role to admin" - admin endpoint but actor is admin; still prevent changing own role via this if desired
  if (String(userId) === String(req.user._id)) return res.status(403).json({ message: 'Cannot change your own role' });
  const target = await FamilyMember.findOne({ familyId, userId, status: 'active' });
  if (!target) return res.status(404).json({ message: 'Member not found' });
  target.role = role; await target.save();
  res.json({ member: target });
});
