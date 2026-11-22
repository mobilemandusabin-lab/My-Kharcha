const mongoose = require('mongoose');

const familyMemberSchema = new mongoose.Schema({
  familyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Family', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['admin', 'member', 'viewer'], default: 'member' },
  status: { type: String, enum: ['pending', 'active', 'removed'], default: 'active' },
  joinedAt: { type: Date, default: Date.now },
  invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

familyMemberSchema.index({ familyId: 1, userId: 1 }, { unique: true });
familyMemberSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('FamilyMember', familyMemberSchema);
