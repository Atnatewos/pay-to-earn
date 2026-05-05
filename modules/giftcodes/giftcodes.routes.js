const router = require('express').Router();
const GiftCodeService = require('./giftcodes.service');
const Response = require('../../utils/response');
const { authenticateUser, authenticateAdmin } = require('../../middleware/auth');
const { requirePermission } = require('../auth/auth.middleware');

router.post('/redeem', authenticateUser, async (req, res, next) => {
    try {
        const { code } = req.body;
        if (!code) return Response.error(res, 'Gift code is required', 400);
        const result = await GiftCodeService.redeemCode(req.user.id, code.toUpperCase());
        return Response.success(res, result, 'Code redeemed!');
    } catch (error) { return Response.error(res, error.message, 400); }
});

router.post('/create', authenticateAdmin, requirePermission('system.features'), async (req, res, next) => {
    try {
        const { amount, maxUses = 1, expiresAt } = req.body;
        if (!amount || amount <= 0) return Response.error(res, 'Valid amount required', 400);
        const result = await GiftCodeService.createCode(req.admin.id, amount, maxUses, expiresAt);
        return Response.success(res, result, 'Gift code created', 201);
    } catch (error) { next(error); }
});

router.get('/admin/list', authenticateAdmin, async (req, res, next) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const codes = await GiftCodeService.getAllCodes(parseInt(page), parseInt(limit));
        return Response.success(res, codes);
    } catch (error) { next(error); }
});

module.exports = router;