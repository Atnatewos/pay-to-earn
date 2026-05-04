// modules/notifications/notifications.service.js
const pool = require('../../config/db');

class NotificationsService {
    async create(userId, title, message, type = 'system', referenceId = null) {
        try {
            await pool.query(
                'INSERT INTO notifications (user_id, title, message, type, reference_id) VALUES (?, ?, ?, ?, ?)',
                [userId, title, message, type, referenceId]
            );
        } catch (error) {
            console.error('Failed to create notification:', error.message);
        }
    }

    async getUserNotifications(userId, page = 1, limit = 20) {
        const offset = (page - 1) * limit;

        const [notifications] = await pool.query(
            'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
            [userId, limit, offset]
        );

        const [[{ total }]] = await pool.query(
            'SELECT COUNT(*) as total FROM notifications WHERE user_id = ?',
            [userId]
        );

        const [[{ unread }]] = await pool.query(
            'SELECT COUNT(*) as unread FROM notifications WHERE user_id = ? AND is_read = FALSE',
            [userId]
        );

        return {
            notifications,
            unreadCount: unread,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        };
    }

    async markAsRead(notificationId, userId) {
        await pool.query(
            'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
            [notificationId, userId]
        );
    }

    async markAllAsRead(userId) {
        await pool.query(
            'UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE',
            [userId]
        );
    }

    async getUnreadCount(userId) {
        const [[{ count }]] = await pool.query(
            'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE',
            [userId]
        );
        return count;
    }
}

module.exports = new NotificationsService();