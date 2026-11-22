module.exports = (err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  let status = err.status || err.statusCode || 500;
  let message = err.message || 'Server error';
  if (err.name === 'ValidationError') { status = 400; message = Object.values(err.errors).map(e => e.message).join(', '); }
  if (err.code === 11000) {
    status = 409;
    const key = Object.keys(err.keyValue || {})[0];
    if (key === 'email') message = 'Email already in use';
    else if (key && key.includes('clientTransactionId')) message = 'Duplicate transaction (already synced)';
    else message = 'Duplicate record';
  }
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') { status = 401; message = 'Please log in first'; }
  res.status(status).json({ message });
};
