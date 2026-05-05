const router = require('express').Router();
const TransactionsService = require('./transactions.service');
const Response = require('../../utils/response');
const { authenticateUser } = require('../../middleware/auth');

router.get('/', authenticateUser, async (req, res, next) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const result = await TransactionsService.getHistory(req.user.id, parseInt(page), parseInt(limit));
        return Response.paginated(res, result.transactions, result.pagination);
    } catch (error) { next(error); }
});

module.exports = router;