const Settings = require('../models/Settings');
const asyncHandler = require('../utils/asyncHandler');

exports.getSettings = asyncHandler(async (req, res) => {
  let settings = await Settings.findOne({ userId: req.user._id });
  if (!settings) settings = await Settings.create({ userId: req.user._id });
  res.json({ settings });
});

exports.updateSettings = asyncHandler(async (req, res) => {
  let settings = await Settings.findOne({ userId: req.user._id });
  if (!settings) settings = await Settings.create({ userId: req.user._id });
  const allowed = ['currency','timezone','calendarPreference','theme','currentScope','selectedFamilyId'];
  for (const k of allowed) if (req.body[k] !== undefined) settings[k] = req.body[k];
  await settings.save();
  res.json({ settings });
});
