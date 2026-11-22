const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  familyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Family', default: null },
  scope: { type: String, enum: ['personal', 'family'], required: true },
  year: { type: Number, required: true }, // BS year
  month: { type: Number, required: true }, // BS month 1-12
  totalBudget: { type: Number, required: true, min: 0 },
  categoryBudgets: [{
    category: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
  }],
  isSeed: { type: Boolean, default: false },
}, { timestamps: true });

budgetSchema.index({ userId: 1, scope: 1, year: 1, month: 1 });
budgetSchema.index({ familyId: 1, scope: 1, year: 1, month: 1 });

module.exports = mongoose.model('Budget', budgetSchema);
