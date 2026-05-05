const router = require('express').Router();
const DepositsService = require('./deposits.service');
const Response = require('../../utils/response');
const { authenticateUser, authenticateAdmin } = require('../../middleware/auth');
const { requirePermission } = require('../auth/auth.middleware');

// User creates deposit request
router.post('/', authenticateUser, async (req, res, next) => {
    try {
        const { amount, bankName, transactionId } = req.body;
        if (!amount || !bankName || !transactionId) return Response.error(res, 'Amount, bank name and transaction ID are required', 400);
        const result = await DepositsService.createDeposit(req.user.id, amount, bankName, transactionId);
        return Response.success(res, result, 'Deposit submitted for verification', 201);
    } catch (error) { next(error); }
});

// User deposit history
router.get('/history', authenticateUser, async (req, res, next) => {
    try {
        const result = await DepositsService.getPendingDeposits(1, 50);
        const userDeposits = result.deposits.filter(d => d.user_id == req.user.id);
        return Response.success(res, userDeposits);
    } catch (error) { next(error); }
});

// Admin: Get pending deposits
router.get('/pending', authenticateAdmin, requirePermission('deposits.verify'), async (req, res, next) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const result = await DepositsService.getPendingDeposits(parseInt(page), parseInt(limit));
        return Response.paginated(res, result.deposits, result.pagination);
    } catch (error) { next(error); }
});

// Admin: Verify deposit
router.post('/:id/verify', authenticateAdmin, requirePermission('deposits.verify'), async (req, res, next) => {
    try {
        const result = await DepositsService.verifyDeposit(req.params.id, req.admin.id);
        return Response.success(res, result);
    } catch (error) { next(error); }
});

// Admin: Reject deposit
router.post('/:id/reject', authenticateAdmin, requirePermission('deposits.reject'), async (req, res, next) => {
    try {
        const { reason } = req.body;
        const result = await DepositsService.rejectDeposit(req.params.id, req.admin.id, reason);
        return Response.success(res, result);
    } catch (error) { next(error); }
});

module.exports = router;