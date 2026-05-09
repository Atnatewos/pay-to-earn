// modules/withdrawals/withdrawals.routes.js
const router = require('express').Router();
const WithdrawalsService = require('./withdrawals.service');
const Response = require('../../utils/response');
const { authenticateUser, authenticateAdmin } = require('../../middleware/auth');

router.post('/', authenticateUser, async (req, res, next) => {
    try {
        const { amount, bankAccountId, fullName, phoneNumber, password } = req.body;
        
        // Brutal debug
        console.log('BODY RECEIVED:', JSON.stringify(req.body));
        console.log('PASSWORD:', password);
        
        if (!amount || !bankAccountId) {
            return Response.error(res, 'Amount and bank account are required', 400);
        }
        
        const result = await WithdrawalsService.requestWithdrawal(
            req.user.id, 
            amount, 
            bankAccountId, 
            fullName || '', 
            phoneNumber || '', 
            password || ''
        );
        
        return Response.success(res, result, 'Withdrawal request submitted', 201);
    } catch (error) {
        console.error('WITHDRAWAL ERROR:', error.message);
        return Response.error(res, error.message, 400);
    }
});

router.get('/history', authenticateUser, async (req, res, next) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const result = await WithdrawalsService.getHistory(req.user.id, parseInt(page), parseInt(limit));
        return Response.paginated(res, result.withdrawals, result.pagination);
    } catch (error) { next(error); }
});

router.post('/:id/process', authenticateAdmin, async (req, res, next) => {
    try {
        const { status, reason } = req.body;
        if (!['completed', 'rejected'].includes(status)) {
            return Response.error(res, 'Status must be completed or rejected', 400);
        }
        const result = await WithdrawalsService.processWithdrawal(req.params.id, req.admin.id, status, reason);
        return Response.success(res, result);
    } catch (error) { next(error); }
});

module.exports = router;