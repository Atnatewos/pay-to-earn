// modules/notifications/notifications.routes.js
const router = require('express').Router();
const NotificationsService = require('./notifications.service');
const Response = require('../../utils/response');
const { authenticateUser } = require('../../middleware/auth');

// Get notifications
router.get('/', authenticateUser, async (req, res, next) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const result = await NotificationsService.getUserNotifications(
            req.user.id, parseInt(page), parseInt(limit)
        );
        return Response.paginated(res, result.notifications, result.pagination, { unreadCount: result.unreadCount });
    } catch (error) {
        next(error);
    }
});

// Get unread count
router.get('/unread-count', authenticateUser, async (req, res, next) => {
    try {
        const count = await NotificationsService.getUnreadCount(req.user.id);
        return Response.success(res, { count });
    } catch (error) {
        next(error);
    }
});

// Mark one as read
router.post('/:id/read', authenticateUser, async (req, res, next) => {
    try {
        await NotificationsService.markAsRead(req.params.id, req.user.id);
        return Response.success(res, null, 'Marked as read');
    } catch (error) {
        next(error);
    }
});

// Mark all as read
router.post('/read-all', authenticateUser, async (req, res, next) => {
    try {
        await NotificationsService.markAllAsRead(req.user.id);
        return Response.success(res, null, 'All marked as read');
    } catch (error) {
        next(error);
    }
});

module.exports = router;