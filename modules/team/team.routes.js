// modules/team/team.routes.js
const router = require('express').Router();
const TeamService = require('./team.service');
const Response = require('../../utils/response');
const { authenticateUser } = require('../../middleware/auth');

router.get('/overview', authenticateUser, async (req, res, next) => {
    try {
        const overview = await TeamService.getTeamOverview(req.user.id);
        return Response.success(res, overview);
    } catch (error) {
        next(error);
    }
});

router.get('/level/:level', authenticateUser, async (req, res, next) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const level = parseInt(req.params.level);

        if (level < 1 || level > 3) {
            return Response.error(res, 'Level must be 1, 2, or 3', 400);
        }

        const result = await TeamService.getTeamByLevel(req.user.id, level, parseInt(page), parseInt(limit));
        return Response.paginated(res, result.members, result.pagination);
    } catch (error) {
        next(error);
    }
});

router.get('/referral-link', authenticateUser, async (req, res, next) => {
    try {
        const result = await TeamService.getReferralLink(req.user.id);
        return Response.success(res, result);
    } catch (error) {
        next(error);
    }
});

module.exports = router;