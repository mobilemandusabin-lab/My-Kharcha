const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/transactionController');

router.use(auth);
router.get('/', ctrl.listTransactions);
router.post('/', ctrl.createTransaction);
router.post('/sync', ctrl.syncTransactions);
router.get('/:id', ctrl.getTransaction);
router.put('/:id', ctrl.updateTransaction);
router.delete('/:id', ctrl.deleteTransaction);
router.patch('/:id/bookmark', ctrl.toggleBookmark);
router.patch('/:id/settle', ctrl.settleTransaction);

module.exports = router;
