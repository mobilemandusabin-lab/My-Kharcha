const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/budgetController');
router.use(auth);
router.get('/', ctrl.listBudgets);
router.post('/', ctrl.upsertBudget);
router.put('/:id', ctrl.updateBudget);
router.delete('/:id', ctrl.deleteBudget);
module.exports = router;
