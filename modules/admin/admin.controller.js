// modules/admin/admin.controller.js
const AdminService = require('./admin.service');
const { logAdminActivity } = require('../../utils/logger');
const NotificationsService = require('../notifications/notifications.service');
const Response = require('../../utils/response');
const pool = require('../../config/db');
const bcrypt = require('bcryptjs');

class AdminController {
    // Login
    async login(req, res) {
        try {
            const { username, password } = req.body;
            if (!username || !password) return res.json({ success: false, message: 'Username and password required' });
            const result = await AdminService.login(username, password);
            return res.json({ success: true, data: result });
        } catch (error) {
            return res.json({ success: false, message: error.message || 'Login failed' });
        }
    }

    // Dashboard
    async getDashboard(req, res) {
        try {
            const stats = await AdminService.getDashboard();
            return res.json({ success: true, data: stats });
        } catch (error) {
            return res.json({ success: false, message: 'Failed to load dashboard' });
        }
    }

    // Get users
    async getUsers(req, res) {
        try {
            const { page, limit, search, status } = req.query;
            const result = await AdminService.getUsers(parseInt(page) || 1, parseInt(limit) || 20, search || '', status || '');
            return res.json({ success: true, data: result.users, pagination: result.pagination });
        } catch (error) {
            return res.json({ success: false, message: 'Failed to load users' });
        }
    }

    // Get single user
    async getUserById(req, res) {
        try {
            const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
            if (result.rows.length === 0) return res.json({ success: false, message: 'User not found' });
            return res.json({ success: true, data: result.rows[0] });
        } catch (error) {
            return res.json({ success: false, message: 'Failed to load user' });
        }
    }

    // Update user
    async updateUser(req, res) {
        try {
            const { phone, fullName, password } = req.body;
            const fields = [];
            const values = [];
            let i = 1;
            if (phone) { fields.push(`phone = $${i++}`); values.push(phone); }
            if (fullName) { fields.push(`full_name = $${i++}`); values.push(fullName); }
            if (password) { const hash = await bcrypt.hash(password, 12); fields.push(`password_hash = $${i++}`); values.push(hash); }
            if (fields.length === 0) return res.json({ success: false, message: 'No fields to update' });
            values.push(req.params.id);
            await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = $${i}`, values);
            return res.json({ success: true, message: 'User updated' });
        } catch (error) {
            return res.json({ success: false, message: 'Failed to update user' });
        }
    }

    // Delete user
    async deleteUser(req, res) {
        try {
            await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
            return res.json({ success: true, message: 'User deleted' });
        } catch (error) {
            return res.json({ success: false, message: 'Failed to delete user' });
        }
    }

    // Suspend user
    async suspendUser(req, res) {
        try {
            const { action, reason } = req.body;
            const status = action === 'ban' ? 'banned' : 'suspended';
            await pool.query('UPDATE users SET status = $1 WHERE id = $2', [status, req.params.id]);
            return res.json({ success: true, message: `User ${action}ed` });
        } catch (error) {
            return res.json({ success: false, message: 'Failed to suspend user' });
        }
    }

    // Activate user
    async activateUser(req, res) {
        try {
            await pool.query('UPDATE users SET status = $1 WHERE id = $2', ['active', req.params.id]);
            return res.json({ success: true, message: 'User activated' });
        } catch (error) {
            return res.json({ success: false, message: 'Failed to activate user' });
        }
    }

    // Notify user
    async notifyUser(req, res) {
        try {
            const { title, message } = req.body;
            await NotificationsService.create(req.params.id, title, message, 'system');
            return res.json({ success: true, message: 'Notification sent' });
        } catch (error) {
            return res.json({ success: false, message: 'Failed to send notification' });
        }
    }

    // Create admin
    async createAdmin(req, res) {
        try {
            const { username, password, role } = req.body;
            const result = await AdminService.createAdmin(req.admin.id, username, password, role);
            return res.json({ success: true, data: result });
        } catch (error) {
            return res.json({ success: false, message: error.message });
        }
    }

    // Features
    async getFeatures(req, res) {
        try {
            const result = await pool.query('SELECT * FROM system_features');
            return res.json({ success: true, data: result.rows });
        } catch (error) {
            return res.json({ success: false, message: 'Failed to load features' });
        }
    }

    async toggleFeature(req, res) {
        try {
            const { isEnabled } = req.body;
            await pool.query('UPDATE system_features SET is_enabled = $1 WHERE feature_key = $2', [isEnabled, req.params.featureKey]);
            return res.json({ success: true });
        } catch (error) {
            return res.json({ success: false, message: 'Failed to toggle' });
        }
    }

    // Broadcast
    async sendBroadcast(req, res) {
        try {
            const { title, message, target } = req.body;
            const result = await AdminService.sendBroadcast(title, message, target, req.admin.id);
            return res.json({ success: true, data: result });
        } catch (error) {
            return res.json({ success: false, message: 'Failed to send broadcast' });
        }
    }

    async getBroadcasts(req, res) {
        try {
            const result = await pool.query("SELECT * FROM broadcasts WHERE is_active = TRUE ORDER BY created_at DESC LIMIT 20");
            return res.json({ success: true, data: result.rows });
        } catch (error) {
            return res.json({ success: false, message: 'Failed to load broadcasts' });
        }
    }

    // Logs
    async getLogs(req, res) {
        try {
            const result = await pool.query("SELECT al.*, a.username FROM admin_logs al JOIN admins a ON al.admin_id = a.id ORDER BY al.created_at DESC LIMIT 50");
            return res.json({ success: true, data: result.rows });
        } catch (error) {
            return res.json({ success: false, message: 'Failed to load logs' });
        }
    }

    // Withdrawals
    async getWithdrawals(req, res) {
        try {
            const { status = 'pending' } = req.query;
            const result = await pool.query(
                `SELECT w.*, u.phone, u.full_name, ba.bank_name, ba.account_number 
                 FROM withdrawals w JOIN users u ON w.user_id = u.id 
                 JOIN bank_accounts ba ON w.bank_account_id = ba.id 
                 WHERE w.status = $1 ORDER BY w.created_at DESC LIMIT 50`,
                [status]
            );
            return res.json({ success: true, data: result.rows });
        } catch (error) {
            return res.json({ success: false, message: 'Failed to load withdrawals' });
        }
    }

    // Salary history
    async getSalaryHistory(req, res) {
        try {
            const result = await pool.query("SELECT ms.*, u.phone FROM manager_salaries ms JOIN users u ON ms.user_id = u.id ORDER BY ms.paid_at DESC LIMIT 50");
            return res.json({ success: true, data: result.rows });
        } catch (error) {
            return res.json({ success: false, message: 'Failed to load salary history' });
        }
    }
}

module.exports = new AdminController();