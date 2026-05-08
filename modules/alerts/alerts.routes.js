// modules/alerts/alerts.routes.js
const router = require('express').Router();
const pool = require('../../config/db');
const { authenticateUser } = require('../../middleware/auth');

router.get('/unread', authenticateUser, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM user_alerts WHERE user_id = $1 AND is_read = FALSE AND is_dismissed = FALSE ORDER BY created_at DESC',
            [req.user.id]
        );
        return res.json({ success: true, data: result.rows });
    } catch (error) {
        return res.json({ success: false, data: [] });
    }
});

router.post('/:id/dismiss', authenticateUser, async (req, res) => {
    try {
        await pool.query(
            'UPDATE user_alerts SET is_dismissed = TRUE WHERE id = $1 AND user_id = $2',
            [req.params.id, req.user.id]
        );
        return res.json({ success: true });
    } catch (error) {
        return res.json({ success: false });
    }
});

module.exports = router;