const mongoose = require('mongoose');

const familySchema = new mongoose.Schema({
  familyName: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  familyImage: { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  currency: { type: String, default: 'NPR' },
  timezone: { type: String, default: 'Asia/Kathmandu' },
  invitationCode: { type: String, index: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Family', familySchema);
