const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  familyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Family', default: null, index: true },
  clientTransactionId: { type: String, required: true },
  scope: { type: String, enum: ['personal', 'family'], required: true, index: true },
  type: { type: String, enum: ['expense', 'income'], required: true },
  title: { type: String, required: true, trim: true },
  amount: { type: Number, required: true, min: 0.01 },
  category: { type: String, required: true, trim: true },
  paymentMethod: { type: String, default: 'Cash' },
  paidBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  notes: { type: String, default: '' },
  transactionAt: { type: Date, required: true, index: true },
  isBookmarked: { type: Boolean, default: false },
  source: { type: String, default: 'manual' },
  paymentStatus: { type: String, enum: ['paid', 'unpaid'], default: 'paid' },
  settledAt: { type: Date, default: null },
  isSeed: { type: Boolean, default: false },
}, { timestamps: true });

transactionSchema.index({ userId: 1, clientTransactionId: 1 }, { unique: true });
transactionSchema.index({ userId: 1, scope: 1, transactionAt: -1 });
transactionSchema.index({ familyId: 1, transactionAt: -1 });
transactionSchema.index({ userId: 1, type: 1, transactionAt: -1 });
transactionSchema.index({ familyId: 1, type: 1, transactionAt: -1 });
transactionSchema.index({ userId: 1, isBookmarked: 1 });
transactionSchema.index({ familyId: 1, isBookmarked: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
