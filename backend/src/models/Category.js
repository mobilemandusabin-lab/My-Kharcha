const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // null = global default
  familyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Family', default: null },
  name: { type: String, required: true, trim: true },
  type: { type: String, enum: ['expense', 'income', 'both'], required: true },
  icon: { type: String, default: '' },
  color: { type: String, default: '#64748b' },
  isDefault: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

categorySchema.index({ userId: 1, familyId: 1, name: 1, type: 1 });

module.exports = mongoose.model('Category', categorySchema);
