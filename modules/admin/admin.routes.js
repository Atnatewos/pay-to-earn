// Delete user
router.delete('/users/:id', authenticateAdmin, async (req, res, next) => {
    try {
        await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
        res.json({ success: true, message: 'User deleted' });
    } catch (error) { next(error); }
});

// Update user details
router.put('/users/:id', authenticateAdmin, async (req, res, next) => {
    try {
        const { phone, fullName, password } = req.body;
        const updates = [];
        const values = [];
        let i = 1;
        
        if (phone) { updates.push(`phone = $${i++}`); values.push(phone); }
        if (fullName) { updates.push(`full_name = $${i++}`); values.push(fullName); }
        if (password) {
            const bcrypt = require('bcryptjs');
            const hash = await bcrypt.hash(password, 12);
            updates.push(`password_hash = $${i++}`);
            values.push(hash);
        }
        
        if (updates.length === 0) return res.json({ success: false, message: 'No updates' });
        
        values.push(req.params.id);
        await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = $${i}`, values);
        res.json({ success: true, message: 'User updated' });
    } catch (error) { next(error); }
});

// Send notification to specific user
router.post('/users/:id/notify', authenticateAdmin, async (req, res, next) => {
    try {
        const { title, message } = req.body;
        const NotificationsService = require('../notifications/notifications.service');
        await NotificationsService.create(req.params.id, title, message, 'system');
        res.json({ success: true, message: 'Notification sent' });
    } catch (error) { next(error); }
});

// Send popup/alert to specific user (stored as notification with popup flag)
router.post('/users/:id/alert', authenticateAdmin, async (req, res, next) => {
    try {
        const { title, message } = req.body;
        const NotificationsService = require('../notifications/notifications.service');
        // Store as high-priority notification that shows as popup
        await pool.query(
            'INSERT INTO notifications (user_id, title, message, type, is_read) VALUES ($1, $2, $3, $4, $5)',
            [req.params.id, title, message, 'alert', false]
        );
        res.json({ success: true, message: 'Alert sent' });
    } catch (error) { next(error); }
});

// Send to all users
router.post('/notify-all', authenticateAdmin, async (req, res, next) => {
    try {
        const { title, message } = req.body;
        const users = await pool.query('SELECT id FROM users WHERE status = $1', ['active']);
        const NotificationsService = require('../notifications/notifications.service');
        for (const user of users.rows) {
            await NotificationsService.create(user.id, title, message, 'system');
        }
        res.json({ success: true, message: `Sent to ${users.rows.length} users` });
    } catch (error) { next(error); }
});