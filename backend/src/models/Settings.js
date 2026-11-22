const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  currency: { type: String, default: 'NPR' },
  timezone: { type: String, default: 'Asia/Kathmandu' },
  calendarPreference: { type: String, enum: ['BS', 'AD'], default: 'BS' },
  theme: { type: String, enum: ['light', 'dark', 'system'], default: 'light' },
  currentScope: { type: String, enum: ['personal', 'family'], default: 'personal' },
  selectedFamilyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Family', default: null },
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema);
