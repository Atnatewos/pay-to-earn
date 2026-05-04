const router = require('express').Router();
const WithdrawalsService = require('./withdrawals.service');
const Response = require('../../utils/response');
const { authenticateUser, authenticateAdmin } = require('../../middleware/auth');
const { requirePermission } = require('../auth/auth.middleware');

router.post('/', authenticateUser, async (req, res, next) => {
    try {
        const { amount, bankAccountId, fullName, phoneNumber } = req.body;
        if (!amount || !bankAccountId) return Response.error(res, 'Amount and bank account are required', 400);
        const result = await WithdrawalsService.requestWithdrawal(req.user.id, amount, bankAccountId, fullName, phoneNumber);
        return Response.success(res, result, 'Withdrawal request submitted', 201);
    } catch (error) { next(error); }
});

router.get('/history', authenticateUser, async (req, res, next) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const result = await WithdrawalsService.getHistory(req.user.id, parseInt(page), parseInt(limit));
        return Response.paginated(res, result.withdrawals, result.pagination);
    } catch (error) { next(error); }
});

router.post('/:id/process', authenticateAdmin, requirePermission('withdrawals.process'), async (req, res, next) => {
    try {
        const { status, reason } = req.body;
        if (!['completed', 'rejected'].includes(status)) return Response.error(res, 'Status must be completed or rejected', 400);
        const result = await WithdrawalsService.processWithdrawal(req.params.id, req.admin.id, status, reason);
        return Response.success(res, result);
    } catch (error) { next(error); }
});

router.post('/bulk-process', authenticateAdmin, requirePermission('withdrawals.process'), async (req, res, next) => {
    try {
        const { ids, action, reason } = req.body;
        if (!ids || !ids.length) return Response.error(res, 'No withdrawals selected', 400);
        if (!['completed', 'rejected'].includes(action)) return Response.error(res, 'Invalid action', 400);
        const results = await WithdrawalsService.processBulk(action, ids, req.admin.id, reason);
        return Response.success(res, results, `Processed ${results.length} withdrawals`);
    } catch (error) { next(error); }
});

module.exports = router;
