const router = require('express').Router();
const AdminController = require('./admin.controller');
const { authenticateAdmin } = require('../../middleware/auth');
const { authLimiter } = require('../../middleware/rateLimit');
const { requirePermission } = require('../auth/auth.middleware');
const pool = require('../../config/db');

router.post('/login', authLimiter, AdminController.login);
router.get('/dashboard', authenticateAdmin, AdminController.getDashboard);
router.get('/users', authenticateAdmin, requirePermission('users.view'), AdminController.getUsers);
router.get('/users/:id', authenticateAdmin, async (req, res, next) => {
    try {
        const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'User not found' });
        res.json({ success: true, data: result.rows[0] });
    } catch (error) { next(error); }
});
router.post('/users/:id/suspend', authenticateAdmin, requirePermission('users.suspend'), async (req, res, next) => {
    try {
        const { action, reason } = req.body;
        const status = action === 'ban' ? 'banned' : 'suspended';
        await pool.query('UPDATE users SET status = $1 WHERE id = $2', [status, req.params.id]);
        await pool.query('INSERT INTO admin_logs (admin_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)', [req.admin.id, `user_${action}`, 'user', req.params.id, JSON.stringify({ reason })]);
        res.json({ success: true, message: `User ${action}ed` });
    } catch (error) { next(error); }
});
router.post('/users/:id/activate', authenticateAdmin, async (req, res, next) => {
    try {
        await pool.query('UPDATE users SET status = $1 WHERE id = $2', ['active', req.params.id]);
        await pool.query('INSERT INTO admin_logs (admin_id, action, entity_type, entity_id) VALUES ($1, $2, $3, $4)', [req.admin.id, 'user_activated', 'user', req.params.id]);
        res.json({ success: true, message: 'User activated' });
    } catch (error) { next(error); }
});
router.post('/admins', authenticateAdmin, requirePermission('admins.create'), AdminController.createAdmin);
router.get('/features', authenticateAdmin, AdminController.getFeatures);
router.post('/features/:featureKey/toggle', authenticateAdmin, requirePermission('system.features'), AdminController.toggleFeature);
router.post('/broadcast', authenticateAdmin, requirePermission('system.broadcast'), AdminController.sendBroadcast);
router.get('/broadcasts', authenticateAdmin, AdminController.getBroadcasts);
router.get('/logs', authenticateAdmin, requirePermission('system.logs'), AdminController.getLogs);
router.get('/withdrawals', authenticateAdmin, async (req, res, next) => {
    try {
        const { status = 'pending', page = 1, limit = 20 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const result = await pool.query(
            `SELECT w.*, u.phone, u.full_name, ba.bank_name, ba.account_number 
             FROM withdrawals w JOIN users u ON w.user_id = u.id 
             JOIN bank_accounts ba ON w.bank_account_id = ba.id 
             WHERE w.status = $1 ORDER BY w.created_at DESC LIMIT $2 OFFSET $3`,
            [status, parseInt(limit), offset]
        );
        res.json({ success: true, data: result.rows });
    } catch (error) { next(error); }
});
router.get('/salary/history', authenticateAdmin, async (req, res, next) => {
    try {
        const result = await pool.query(
            `SELECT ms.*, u.phone, u.full_name FROM manager_salaries ms 
             JOIN users u ON ms.user_id = u.id ORDER BY ms.paid_at DESC LIMIT 50`
        );
        res.json({ success: true, data: result.rows });
    } catch (error) { next(error); }
});

module.exports = router;