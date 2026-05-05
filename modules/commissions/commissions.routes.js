const router = require('express').Router();
const CommissionsService = require('./commissions.service');
const Response = require('../../utils/response');
const { authenticateUser } = require('../../middleware/auth');

router.get('/breakdown', authenticateUser, async (req, res, next) => {
    try { const commissions = await CommissionsService.getBreakdown(req.user.id); return Response.success(res, commissions); }
    catch (error) { next(error); }
});

module.exports = router;