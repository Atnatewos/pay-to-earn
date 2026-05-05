// modules/notifications/notifications.service.js
const pool = require('../../config/db');

class NotificationsService {
    async create(userId, title, message, type = 'system', referenceId = null) {
        try {
            // Insert notification into database
            await pool.query(
                'INSERT INTO notifications (user_id, title, message, type, reference_id) VALUES ($1, $2, $3, $4, $5)',
                [userId, title, message, type, referenceId]
            );
        } catch (error) {
            // Log error but don't throw - notifications are non-critical
            console.error('Failed to create notification:', error.message);
        }
    }

    async getUserNotifications(userId, page = 1, limit = 20) {
        const offset = (page - 1) * limit;

        // Get paginated notifications
        const notificationsResult = await pool.query(
            'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
            [userId, limit, offset]
        );

        // Get total count for pagination
        const totalResult = await pool.query(
            'SELECT COUNT(*) as total FROM notifications WHERE user_id = $1',
            [userId]
        );

        // Get unread count
        const unreadResult = await pool.query(
            'SELECT COUNT(*) as unread FROM notifications WHERE user_id = $1 AND is_read = FALSE',
            [userId]
        );

        const total = parseInt(totalResult.rows[0].total);
        const unread = parseInt(unreadResult.rows[0].unread);

        return {
            notifications: notificationsResult.rows,
            unreadCount: unread,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }

    async markAsRead(notificationId, userId) {
        // Mark a single notification as read
        await pool.query(
            'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2',
            [notificationId, userId]
        );
    }

    async markAllAsRead(userId) {
        // Mark all user's unread notifications as read
        await pool.query(
            'UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE',
            [userId]
        );
    }

    async getUnreadCount(userId) {
        // Get count of unread notifications
        const result = await pool.query(
            'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = FALSE',
            [userId]
        );

        return parseInt(result.rows[0].count);
    }
}

module.exports = new NotificationsService();