// modules/admin/admin.controller.js
const AdminService = require('./admin.service');
const { logAdminActivity } = require('../../utils/logger');
const NotificationsService = require('../notifications/notifications.service');
const Response = require('../../utils/response');
const pool = require('../../config/db');
const bcrypt = require('bcryptjs');

class AdminController {
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

    async getDashboard(req, res) {
        try {
            const stats = await AdminService.getDashboard();
            return res.json({ success: true, data: stats });
        } catch (error) {
            return res.json({ success: false, message: 'Failed to load dashboard' });
        }
    }

    async getUsers(req, res) {
        try {
            const { page, limit, search, status } = req.query;
            const result = await AdminService.getUsers(parseInt(page) || 1, parseInt(limit) || 20, search || '', status || '');
            return res.json({ success: true, data: result.users, pagination: result.pagination });
        } catch (error) {
            return res.json({ success: false, message: 'Failed to load users' });
        }
    }

    async getUserById(req, res) {
        try {
            const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
            if (result.rows.length === 0) return res.json({ success: false, message: 'User not found' });
            return res.json({ success: true, data: result.rows[0] });
        } catch (error) {
            return res.json({ success: false, message: 'Failed to load user' });
        }
    }

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

    async deleteUser(req, res) {
        try {
            await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
            return res.json({ success: true, message: 'User deleted' });
        } catch (error) {
            return res.json({ success: false, message: 'Failed to delete user' });
        }
    }

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

    async activateUser(req, res) {
        try {
            await pool.query('UPDATE users SET status = $1 WHERE id = $2', ['active', req.params.id]);
            return res.json({ success: true, message: 'User activated' });
        } catch (error) {
            return res.json({ success: false, message: 'Failed to activate user' });
        }
    }

    async notifyUser(req, res) {
        try {
            const { title, message } = req.body;
            await NotificationsService.create(req.params.id, title, message, 'system');
            return res.json({ success: true, message: 'Notification sent' });
        } catch (error) {
            return res.json({ success: false, message: 'Failed to send notification' });
        }
    }

    async createAdmin(req, res) {
        try {
            const { username, password, role } = req.body;
            const result = await AdminService.createAdmin(req.admin.id, username, password, role);
            return res.json({ success: true, data: result });
        } catch (error) {
            return res.json({ success: false, message: error.message });
        }
    }

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

    async getLogs(req, res) {
        try {
            const result = await pool.query("SELECT al.*, a.username FROM admin_logs al JOIN admins a ON al.admin_id = a.id ORDER BY al.created_at DESC LIMIT 50");
            return res.json({ success: true, data: result.rows });
        } catch (error) {
            return res.json({ success: false, message: 'Failed to load logs' });
        }
    }

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

    async getSalaryHistory(req, res) {
        try {
            const result = await pool.query("SELECT ms.*, u.phone FROM manager_salaries ms JOIN users u ON ms.user_id = u.id ORDER BY ms.paid_at DESC LIMIT 50");
            return res.json({ success: true, data: result.rows });
        } catch (error) {
            return res.json({ success: false, message: 'Failed to load salary history' });
        }
    }

    // ============ ALERT METHODS ============
    
    async getAlertTemplates(req, res) {
        try {
            const result = await pool.query('SELECT * FROM alert_templates ORDER BY id');
            return res.json({ success: true, data: result.rows });
        } catch (error) {
            return res.json({ success: false, message: 'Failed to load templates' });
        }
    }

    async sendUserAlert(req, res) {
        try {
            const { templateId, customTitle, customMessage } = req.body;
            const template = await pool.query('SELECT * FROM alert_templates WHERE id = $1', [templateId]);
            if (template.rows.length === 0) return res.json({ success: false, message: 'Template not found' });
            
            const tp = template.rows[0];
            const user = await pool.query('SELECT full_name, phone FROM users WHERE id = $1', [req.params.id]);
            const userName = user.rows[0]?.full_name || user.rows[0]?.phone || 'User';
            
            let title = customTitle || tp.title_template;
            let message = customMessage || tp.message_template;
            title = title.replace('{USER_NAME}', userName).replace('{APP_NAME}', 'Pay to Earn');
            message = message.replace('{USER_NAME}', userName).replace('{APP_NAME}', 'Pay to Earn').replace('{REASON}', customMessage || 'Violation of terms');
            
            await pool.query(
                'INSERT INTO user_alerts (user_id, template_id, title, message, type, icon, color, sent_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
                [req.params.id, templateId, title, message, tp.type, tp.icon, tp.color, req.admin.id]
            );
            await NotificationsService.create(req.params.id, title, message, 'alert');
            
            return res.json({ success: true, message: 'Alert sent to user' });
        } catch (error) {
            return res.json({ success: false, message: 'Failed to send alert' });
        }
    }

    async sendBulkAlert(req, res) {
        try {
            const { userIds, templateId, customTitle, customMessage } = req.body;
            if (!userIds || !userIds.length) return res.json({ success: false, message: 'No users selected' });
            
            const template = await pool.query('SELECT * FROM alert_templates WHERE id = $1', [templateId]);
            if (template.rows.length === 0) return res.json({ success: false, message: 'Template not found' });
            const tp = template.rows[0];
            let count = 0;
            
            for (const userId of userIds) {
                const user = await pool.query('SELECT full_name, phone FROM users WHERE id = $1', [userId]);
                if (user.rows.length === 0) continue;
                const userName = user.rows[0]?.full_name || user.rows[0]?.phone || 'User';
                
                let title = customTitle || tp.title_template;
                let message = customMessage || tp.message_template;
                title = title.replace('{USER_NAME}', userName).replace('{APP_NAME}', 'Pay to Earn');
                message = message.replace('{USER_NAME}', userName).replace('{APP_NAME}', 'Pay to Earn');
                
                await pool.query(
                    'INSERT INTO user_alerts (user_id, template_id, title, message, type, icon, color, sent_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
                    [userId, templateId, title, message, tp.type, tp.icon, tp.color, req.admin.id]
                );
                await NotificationsService.create(userId, title, message, 'alert');
                count++;
            }
            
            return res.json({ success: true, message: `Alert sent to ${count} users` });
        } catch (error) {
            return res.json({ success: false, message: 'Failed to send alerts' });
        }
    }

    async sendAllAlert(req, res) {
        try {
            const { templateId, customTitle, customMessage, status } = req.body;
            const template = await pool.query('SELECT * FROM alert_templates WHERE id = $1', [templateId]);
            if (template.rows.length === 0) return res.json({ success: false, message: 'Template not found' });
            const tp = template.rows[0];
            
            let userQuery = 'SELECT id, full_name, phone FROM users WHERE 1=1';
            const params = [];
            if (status) { userQuery += ' AND status = $1'; params.push(status); }
            
            const users = await pool.query(userQuery, params);
            let count = 0;
            
            for (const user of users.rows) {
                const userName = user.full_name || user.phone || 'User';
                let title = customTitle || tp.title_template;
                let message = customMessage || tp.message_template;
                title = title.replace('{USER_NAME}', userName).replace('{APP_NAME}', 'Pay to Earn');
                message = message.replace('{USER_NAME}', userName).replace('{APP_NAME}', 'Pay to Earn');
                
                await pool.query(
                    'INSERT INTO user_alerts (user_id, template_id, title, message, type, icon, color, sent_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
                    [user.id, templateId, title, message, tp.type, tp.icon, tp.color, req.admin.id]
                );
                await NotificationsService.create(user.id, title, message, 'alert');
                count++;
            }
            
            return res.json({ success: true, message: `Alert sent to ${count} users` });
        } catch (error) {
            return res.json({ success: false, message: 'Failed to send alerts' });
        }
    }
}

module.exports = new AdminController();