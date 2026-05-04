// public/admin/js/admin-router.js
class AdminRouter {
    constructor() {
        this.routes = {};
        this.container = document.getElementById('adminContent');
        this.navigating = false;
        
        window.addEventListener('hashchange', () => this.handle());
        window.addEventListener('load', () => this.handle());
    }

    add(path, page) {
        this.routes[path] = page;
    }

    handle() {
        if (this.navigating) return;
        
        const hash = window.location.hash.slice(1) || '/admin/dashboard';
        const token = localStorage.getItem('admin_token');

        // Show admin app, hide user app
        document.getElementById('app').style.display = hash.startsWith('/admin') ? 'none' : 'block';
        document.getElementById('adminApp').style.display = hash.startsWith('/admin') ? 'flex' : 'none';

        if (!token && hash !== '/admin/login') {
            window.location.hash = '#/admin/login';
            return;
        }

        const page = this.routes[hash];
        if (page) {
            this.navigating = true;
            new page(this.container).render();
            setTimeout(() => { this.navigating = false; }, 100);
        }
    }

    navigate(path) {
        window.location.hash = `#${path}`;
    }
}

// Add this BEFORE module.exports = router;
// Get withdrawals list
router.get('/withdrawals', authenticateAdmin, async (req, res, next) => {
    try {
        const pool = require('../../config/db');
        const { status = 'pending', page = 1, limit = 20 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        
        const [withdrawals] = await pool.query(
            `SELECT w.*, u.phone, ba.bank_name, ba.account_number 
             FROM withdrawals w 
             JOIN users u ON w.user_id = u.id 
             JOIN bank_accounts ba ON w.bank_account_id = ba.id 
             WHERE w.status = ? 
             ORDER BY w.created_at DESC 
             LIMIT ? OFFSET ?`,
            [status, parseInt(limit), offset]
        );
        
        res.json({ success: true, data: withdrawals });
    } catch (error) {
        next(error);
    }
});

// Get single user
router.get('/users/:id', authenticateAdmin, async (req, res, next) => {
    try {
        const pool = require('../../config/db');
        const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [req.params.id]);
        if (users.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.json({ success: true, data: users[0] });
    } catch (error) {
        next(error);
    }
});

// Suspend/ban user
router.post('/users/:id/suspend', authenticateAdmin, async (req, res, next) => {
    try {
        const pool = require('../../config/db');
        const { action, reason } = req.body;
        const status = action === 'ban' ? 'banned' : 'suspended';
        await pool.query('UPDATE users SET status = ? WHERE id = ?', [status, req.params.id]);
        
        // Log activity
        await pool.query(
            'INSERT INTO admin_logs (admin_id, action, entity_type, entity_id, details) VALUES (?, ?, "user", ?, ?)',
            [req.admin.id, `user_${action}`, req.params.id, JSON.stringify({ reason })]
        );
        
        res.json({ success: true, message: `User ${action}ed` });
    } catch (error) {
        next(error);
    }
});

// Activate user
router.post('/users/:id/activate', authenticateAdmin, async (req, res, next) => {
    try {
        const pool = require('../../config/db');
        await pool.query('UPDATE users SET status = "active" WHERE id = ?', [req.params.id]);
        
        await pool.query(
            'INSERT INTO admin_logs (admin_id, action, entity_type, entity_id) VALUES (?, "user_activated", "user", ?)',
            [req.admin.id, req.params.id]
        );
        
        res.json({ success: true, message: 'User activated' });
    } catch (error) {
        next(error);
    }
});