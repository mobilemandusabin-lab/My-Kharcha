const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/familyController');
const txCtrl = require('../controllers/transactionController');
const budgetCtrl = require('../controllers/budgetController');
const reportCtrl = require('../controllers/reportController');
const { requireMembership } = require('../services/familyAccess');
const Transaction = require('../models/Transaction');
const asyncHandler = require('../utils/asyncHandler');

router.use(auth);

router.post('/', ctrl.createFamily);
router.get('/', ctrl.listFamilies);
router.post('/join', ctrl.joinFamily);
router.get('/:familyId', ctrl.getFamily);
router.put('/:familyId', ctrl.updateFamily);
router.delete('/:familyId', ctrl.deleteFamily);

router.get('/:familyId/members', ctrl.listMembers);
router.post('/:familyId/invite', ctrl.inviteMember);
router.get('/:familyId/invitations', ctrl.listInvitations);
router.post('/:familyId/invitations/:inviteId/revoke', ctrl.revokeInvitation);
router.delete('/:familyId/members/:userId', ctrl.removeMember);
router.patch('/:familyId/members/:userId/role', ctrl.changeRole);

// Family transactions (scope-aware wrappers)
router.get('/:familyId/transactions', asyncHandler(async (req, res) => {
  req.query.scope = 'family'; req.query.familyId = req.params.familyId; return txCtrl.listTransactions(req, res);
}));
router.post('/:familyId/transactions', asyncHandler(async (req, res) => {
  req.body.scope = 'family'; req.body.familyId = req.params.familyId; return txCtrl.createTransaction(req, res);
}));
router.get('/:familyId/transactions/:id', txCtrl.getTransaction);
router.put('/:familyId/transactions/:id', txCtrl.updateTransaction);
router.delete('/:familyId/transactions/:id', txCtrl.deleteTransaction);

// Family reports
router.get('/:familyId/reports/summary', (req,res,next)=>{ req.query.scope='family'; req.query.familyId=req.params.familyId; return reportCtrl.summary(req,res,next); });
router.get('/:familyId/reports/members', (req,res,next)=>{ req.query.scope='family'; req.query.familyId=req.params.familyId; return reportCtrl.memberReport(req,res,next); });
router.get('/:familyId/reports/categories', (req,res,next)=>{ req.query.scope='family'; req.query.familyId=req.params.familyId; return reportCtrl.categoryReport(req,res,next); });
router.get('/:familyId/reports/monthly', (req,res,next)=>{ req.query.scope='family'; req.query.familyId=req.params.familyId; return reportCtrl.monthlyReport(req,res,next); });
router.get('/:familyId/reports/month-end-summary', (req,res,next)=>{ req.query.scope='family'; req.query.familyId=req.params.familyId; return reportCtrl.monthEndSummary(req,res,next); });
router.get('/:familyId/reports/comparison', (req,res,next)=>{ req.query.scope='family'; req.query.familyId=req.params.familyId; return reportCtrl.monthlyComparison(req,res,next); });

// Family budgets
router.get('/:familyId/budgets', (req,res,next)=>{ req.query.scope='family'; req.query.familyId=req.params.familyId; return budgetCtrl.listBudgets(req,res,next); });
router.post('/:familyId/budgets', (req,res,next)=>{ req.body.scope='family'; req.body.familyId=req.params.familyId; return budgetCtrl.upsertBudget(req,res,next); });
router.put('/:familyId/budgets/:id', budgetCtrl.updateBudget);
router.delete('/:familyId/budgets/:id', budgetCtrl.deleteBudget);

module.exports = router;
