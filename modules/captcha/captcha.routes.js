// modules/captcha/captcha.routes.js
const router = require('express').Router();
const CaptchaService = require('./captcha.service');
const TasksService = require('../tasks/tasks.service');
const Response = require('../../utils/response');
const { authenticateUser } = require('../../middleware/auth');
const { taskLimiter } = require('../../middleware/rateLimit');

// Generate new captcha
router.post('/generate', authenticateUser, taskLimiter, async (req, res, next) => {
    try {
        const { taskNumber } = req.body;
        
        // Verify user has pending tasks
        const todayTask = await TasksService.getTodayTask(req.user.id);
        
        if (todayTask.is_completed) {
            return Response.error(res, 'All tasks completed for today', 400);
        }

        const captcha = CaptchaService.generateCaptcha(req.user.id, taskNumber || (todayTask.tasks_completed + 1));
        
        return Response.success(res, {
            id: captcha.id,
            type: captcha.type,
            question: captcha.question,
            display: captcha.display,
            options: captcha.options,
            expiresAt: captcha.expiresAt
        }, 'Captcha generated');
    } catch (error) {
        next(error);
    }
});

// Validate captcha and complete task
router.post('/verify', authenticateUser, taskLimiter, async (req, res, next) => {
    try {
        const { captchaId, answer } = req.body;

        if (!captchaId || !answer) {
            return Response.error(res, 'Captcha ID and answer required', 400);
        }

        // Validate captcha
        const validation = CaptchaService.validateCaptcha(captchaId, req.user.id, answer);
        
        if (!validation.valid) {
            return Response.error(res, validation.error, 400);
        }

        // Complete task
        const taskResult = await TasksService.completeTask(req.user.id);

        return Response.success(res, {
            ...taskResult,
            captchaType: validation.type,
            message: 'Task completed successfully!'
        });
    } catch (error) {
        if (error.message.includes('All tasks') || error.message.includes('No tasks')) {
            return Response.error(res, error.message, 400);
        }
        next(error);
    }
});

module.exports = router;