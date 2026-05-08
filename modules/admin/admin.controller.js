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
            const result = await pool.query('SELECT id, phone, full_name, avatar_url, referral_code, status, balance, active_package, total_earned, total_deposited, created_at FROM users WHERE id = $1', [req.params.id]);
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
            
            if (phone) { 
                fields.push(`phone = $${i++}`); 
                values.push(phone); 
            }
            if (fullName !== undefined) { 
                fields.push(`full_name = $${i++}`); 
                values.push(fullName); 
            }
            if (password && password.trim() !== '') { 
                const hash = await bcrypt.hash(password, 12); 
                fields.push(`password_hash = $${i++}`); 
                values.push(hash); 
            }
            
            if (fields.length === 0) {
                return res.json({ success: false, message: 'No fields to update' });
            }
            
            fields.push(`updated_at = NOW()`);
            values.push(req.params.id);
            
            await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = $${i}`, values);
            
            // Log the activity
            await logAdminActivity(req.admin.id, 'user_updated', { userId: req.params.id, fields: Object.keys(req.body) }, req.ip);
            
            return res.json({ success: true, message: 'User updated successfully' });
        } catch (error) {
            console.error('Update user error:', error);
            return res.json({ success: false, message: error.message || 'Failed to update user' });
        }
    }

    async deleteUser(req, res) {
        try {
            await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
            await logAdminActivity(req.admin.id, 'user_deleted', { userId: req.params.id }, req.ip);
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
            await logAdminActivity(req.admin.id, `user_${action}`, { userId: req.params.id, reason }, req.ip);
            
            // Send alert to suspended user
            const user = await pool.query('SELECT full_name, phone FROM users WHERE id = $1', [req.params.id]);
            const userName = user.rows[0]?.full_name || user.rows[0]?.phone || 'User';
            
            const alertType = action === 'ban' ? 'Ban' : 'Suspension';
            const alertIcon = action === 'ban' ? '🚫' : '⚠️';
            const alertTitle = action === 'ban' ? 'Account Banned 🚫' : 'Account Suspended ⚠️';
            const alertMessage = action === 'ban' 
                ? `Your account has been permanently banned. Reason: ${reason || 'Violation of terms'}.`
                : `Your account has been suspended. Reason: ${reason || 'Violation of terms'}. Please contact support for assistance.`;
            
            await pool.query(
                'INSERT INTO user_alerts (user_id, title, message, type, icon, color, sent_by) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                [req.params.id, alertTitle, alertMessage, 'danger', alertIcon, 'color-danger', req.admin.id]
            );
            
            // Also send notification
            await NotificationsService.create(req.params.id, alertTitle, alertMessage, 'system');
            
            return res.json({ success: true, message: `User ${action}ed and alert sent` });
        } catch (error) {
            return res.json({ success: false, message: 'Failed to suspend user' });
        }
    }

    async activateUser(req, res) {
        try {
            await pool.query('UPDATE users SET status = $1 WHERE id = $2', ['active', req.params.id]);
            await logAdminActivity(req.admin.id, 'user_activated', { userId: req.params.id }, req.ip);
            return res.json({ success: true, message: 'User activated' });
        } catch (error) {
            return res.json({ success: false, message: 'Failed to activate user' });
        }
    }

    async notifyUser(req, res) {
        try {
            const { title, message } = req.body;
            if (!title || !message) return res.json({ success: false, message: 'Title and message required' });
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
            
            // Get template if templateId provided
            let title = customTitle || 'Alert';
            let message = customMessage || 'You have a new alert.';
            let type = 'info';
            let icon = '📢';
            let color = 'color-info';
            
            if (templateId) {
                const template = await pool.query('SELECT * FROM alert_templates WHERE id = $1', [templateId]);
                if (template.rows.length > 0) {
                    const tp = template.rows[0];
                    const user = await pool.query('SELECT full_name, phone FROM users WHERE id = $1', [req.params.id]);
                    const userName = user.rows[0]?.full_name || user.rows[0]?.phone || 'User';
                    
                    title = customTitle || tp.title_template;
                    message = customMessage || tp.message_template;
                    title = title.replace('{USER_NAME}', userName).replace('{APP_NAME}', 'Pay to Earn');
                    message = message.replace('{USER_NAME}', userName).replace('{APP_NAME}', 'Pay to Earn').replace('{REASON}', customMessage || '');
                    type = tp.type;
                    icon = tp.icon;
                    color = tp.color;
                }
            }
            
            // Insert alert
            await pool.query(
                'INSERT INTO user_alerts (user_id, template_id, title, message, type, icon, color, sent_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
                [req.params.id, templateId || null, title, message, type, icon, color, req.admin.id]
            );
            
            // Also create notification
            await NotificationsService.create(req.params.id, title, message, 'alert');
            
            return res.json({ success: true, message: 'Alert sent to user' });
        } catch (error) {
            console.error('Send alert error:', error);
            return res.json({ success: false, message: 'Failed to send alert' });
        }
    }

    async sendBulkAlert(req, res) {
        try {
            const { userIds, templateId, customTitle, customMessage } = req.body;
            if (!userIds || !userIds.length) return res.json({ success: false, message: 'No users selected' });
            
            let count = 0;
            
            for (const userId of userIds) {
                let title = customTitle || 'Alert';
                let message = customMessage || 'You have a new alert.';
                let type = 'info';
                let icon = '📢';
                let color = 'color-info';
                
                if (templateId) {
                    const template = await pool.query('SELECT * FROM alert_templates WHERE id = $1', [templateId]);
                    if (template.rows.length > 0) {
                        const tp = template.rows[0];
                        const user = await pool.query('SELECT full_name, phone FROM users WHERE id = $1', [userId]);
                        const userName = user.rows[0]?.full_name || user.rows[0]?.phone || 'User';
                        
                        title = customTitle || tp.title_template;
                        message = customMessage || tp.message_template;
                        title = title.replace('{USER_NAME}', userName).replace('{APP_NAME}', 'Pay to Earn');
                        message = message.replace('{USER_NAME}', userName).replace('{APP_NAME}', 'Pay to Earn');
                        type = tp.type;
                        icon = tp.icon;
                        color = tp.color;
                    }
                }
                
                await pool.query(
                    'INSERT INTO user_alerts (user_id, template_id, title, message, type, icon, color, sent_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
                    [userId, templateId || null, title, message, type, icon, color, req.admin.id]
                );
                
                await NotificationsService.create(userId, title, message, 'alert');
                count++;
            }
            
            return res.json({ success: true, message: `Alert sent to ${count} users` });
        } catch (error) {
            console.error('Bulk alert error:', error);
            return res.json({ success: false, message: 'Failed to send alerts' });
        }
    }

    async sendAllAlert(req, res) {
        try {
            const { templateId, customTitle, customMessage, status } = req.body;
            
            let userQuery = 'SELECT id, full_name, phone FROM users WHERE 1=1';
            const params = [];
            if (status) { userQuery += ' AND status = $1'; params.push(status); }
            
            const users = await pool.query(userQuery, params);
            let count = 0;
            
            for (const user of users.rows) {
                let title = customTitle || 'Alert';
                let message = customMessage || 'You have a new alert.';
                let type = 'info';
                let icon = '📢';
                let color = 'color-info';
                
                if (templateId) {
                    const template = await pool.query('SELECT * FROM alert_templates WHERE id = $1', [templateId]);
                    if (template.rows.length > 0) {
                        const tp = template.rows[0];
                        const userName = user.full_name || user.phone || 'User';
                        
                        title = customTitle || tp.title_template;
                        message = customMessage || tp.message_template;
                        title = title.replace('{USER_NAME}', userName).replace('{APP_NAME}', 'Pay to Earn');
                        message = message.replace('{USER_NAME}', userName).replace('{APP_NAME}', 'Pay to Earn');
                        type = tp.type;
                        icon = tp.icon;
                        color = tp.color;
                    }
                }
                
                await pool.query(
                    'INSERT INTO user_alerts (user_id, template_id, title, message, type, icon, color, sent_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
                    [user.id, templateId || null, title, message, type, icon, color, req.admin.id]
                );
                
                await NotificationsService.create(user.id, title, message, 'alert');
                count++;
            }
            
            return res.json({ success: true, message: `Alert sent to ${count} users` });
        } catch (error) {
            console.error('Send all alert error:', error);
            return res.json({ success: false, message: 'Failed to send alerts' });
        }
    }
}

module.exports = new AdminController();