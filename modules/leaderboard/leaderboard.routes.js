const router = require('express').Router();
const LeaderboardService = require('./leaderboard.service');
const Response = require('../../utils/response');
const { authenticateUser } = require('../../middleware/auth');

router.get('/earners', authenticateUser, async (req, res, next) => {
    try {
        const { period = 'weekly', limit = 20 } = req.query;
        const leaders = await LeaderboardService.getTopEarners(period, parseInt(limit));
        return Response.success(res, leaders);
    } catch (error) {
        next(error);
    }
});

router.get('/recruiters', authenticateUser, async (req, res, next) => {
    try {
        const { period = 'monthly', limit = 20 } = req.query;
        const recruiters = await LeaderboardService.getTopRecruiters(period, parseInt(limit));
        return Response.success(res, recruiters);
    } catch (error) {
        next(error);
    }
});

module.exports = router;
