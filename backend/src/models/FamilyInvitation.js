const mongoose = require('mongoose');

const invitationSchema = new mongoose.Schema({
  familyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Family', required: true },
  invitationCode: { type: String, required: true, unique: true, index: true },
  invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  expiresAt: { type: Date },
  maxUses: { type: Number, default: 1 },
  usedCount: { type: Number, default: 0 },
  status: { type: String, enum: ['pending', 'accepted', 'expired', 'revoked'], default: 'pending' },
}, { timestamps: true });

module.exports = mongoose.model('FamilyInvitation', invitationSchema);
