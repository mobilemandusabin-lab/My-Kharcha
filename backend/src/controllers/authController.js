const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Settings = require('../models/Settings');
const asyncHandler = require('../utils/asyncHandler');

function signToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: process.env.JWT_EXPIRES_IN || '30d' });
}

function setTokenCookie(res, token) {
  const cookieName = process.env.COOKIE_NAME || 'mykharcha_token';
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie(cookieName, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

exports.register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ message: 'Name, email and password are required' });
  if (String(password).length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });
  const existing = await User.findOne({ email: String(email).toLowerCase().trim() });
  if (existing) return res.status(409).json({ message: 'Email already in use' });
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ name: String(name).trim(), email: String(email).toLowerCase().trim(), passwordHash });
  await Settings.create({ userId: user._id });
  const token = signToken(user._id);
  setTokenCookie(res, token);
  res.status(201).json({ user: { id: user._id, name: user.name, email: user.email, role: user.role }, token });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });
  const user = await User.findOne({ email: String(email).toLowerCase().trim() });
  if (!user) return res.status(401).json({ message: 'Invalid email or password' });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ message: 'Invalid email or password' });
  const token = signToken(user._id);
  setTokenCookie(res, token);
  res.json({ user: { id: user._id, name: user.name, email: user.email, role: user.role }, token });
});

exports.logout = asyncHandler(async (req, res) => {
  const cookieName = process.env.COOKIE_NAME || 'mykharcha_token';
  res.clearCookie(cookieName, { path: '/' });
  res.json({ message: 'Logged out' });
});

exports.me = asyncHandler(async (req, res) => {
  res.json({ user: { id: req.user._id, name: req.user.name, email: req.user.email, profileImage: req.user.profileImage, role: req.user.role } });
});
