// modules/tasks/tasks.routes.js
const router = require('express').Router();
const TasksService = require('./tasks.service');
const Response = require('../../utils/response');
const { authenticateUser } = require('../../middleware/auth');
const { taskLimiter } = require('../../middleware/rateLimit');

router.get('/today', authenticateUser, async (req, res, next) => {
    try {
        const task = await TasksService.getTodayTask(req.user.id);
        return Response.success(res, task);
    } catch (error) {
        next(error);
    }
});

router.post('/complete', authenticateUser, taskLimiter, async (req, res, next) => {
    try {
        const result = await TasksService.completeTask(req.user.id);
        return Response.success(res, result, 'Task completed');
    } catch (error) {
        next(error);
    }
});

router.get('/history', authenticateUser, async (req, res, next) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const result = await TasksService.getTaskHistory(req.user.id, parseInt(page), parseInt(limit));
        return Response.paginated(res, result.logs, result.pagination);
    } catch (error) {
        next(error);
    }
});

router.get('/earnings', authenticateUser, async (req, res, next) => {
    try {
        const summary = await TasksService.getEarningsSummary(req.user.id);
        return Response.success(res, summary);
    } catch (error) {
        next(error);
    }
});

module.exports = router;