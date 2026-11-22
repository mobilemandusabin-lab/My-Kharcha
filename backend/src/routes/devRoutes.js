const router = require('express').Router();
const { seedData } = require('../seed/seed');

function guard(req, res, next) {
  if (process.env.NODE_ENV === 'production') return res.status(403).json({ message: 'Not allowed in production' });
  next();
}

router.post('/seed', guard, async (req, res, next) => {
  try { const result = await seedData({ resetOnly: false }); res.json(result); } catch (e) { next(e); }
});

router.post('/seed/reset', guard, async (req, res, next) => {
  try { const result = await seedData({ resetOnly: true }); res.json(result); } catch (e) { next(e); }
});

module.exports = router;
