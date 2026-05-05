const router = require('express').Router();
const BankService = require('./bank.service');
const Response = require('../../utils/response');
const { authenticateUser } = require('../../middleware/auth');

router.post('/', authenticateUser, async (req, res, next) => {
    try {
        const { bankName, accountNumber } = req.body;
        if (!bankName || !accountNumber) return Response.error(res, 'Bank name and account number are required', 400);
        const result = await BankService.addAccount(req.user.id, bankName, accountNumber);
        return Response.success(res, result, 'Bank account added', 201);
    } catch (error) { next(error); }
});

router.get('/', authenticateUser, async (req, res, next) => {
    try { const accounts = await BankService.getUserAccounts(req.user.id); return Response.success(res, accounts); }
    catch (error) { next(error); }
});

router.delete('/:id', authenticateUser, async (req, res, next) => {
    try { const result = await BankService.deleteAccount(req.user.id, req.params.id); return Response.success(res, result, 'Bank account removed'); }
    catch (error) { next(error); }
});

module.exports = router;