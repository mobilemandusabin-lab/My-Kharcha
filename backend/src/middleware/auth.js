const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function auth(req, res, next) {
  try {
    const cookieName = process.env.COOKIE_NAME || 'mykharcha_token';
    let token = req.cookies && req.cookies[cookieName];
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) return res.status(401).json({ message: 'Please log in first' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
    const user = await User.findById(decoded.id).select('-passwordHash');
    if (!user || user.status !== 'active') return res.status(401).json({ message: 'Authentication failed' });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Please log in first' });
  }
}

module.exports = auth;
