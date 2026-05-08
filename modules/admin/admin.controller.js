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
            const userId = req.params.id;
            
            // Basic user info
            const userResult = await pool.query(
                'SELECT * FROM users WHERE id = $1', [userId]
            );
            if (userResult.rows.length === 0) return res.json({ success: false, message: 'User not found' });
            const user = userResult.rows[0];

            // Activity log (password changes, name changes, phone changes)
            const activityLog = await pool.query(
                `SELECT ual.*, a.username as admin_name 
                 FROM user_activity_log ual 
                 LEFT JOIN admins a ON ual.changed_by = a.id 
                 WHERE ual.user_id = $1 
                 ORDER BY ual.created_at DESC LIMIT 50`,
                [userId]
            );

            // Suspension/warning history
            const suspensionHistory = await pool.query(
                `SELECT ush.*, a.username as admin_name 
                 FROM user_suspension_history ush 
                 LEFT JOIN admins a ON ush.admin_id = a.id 
                 WHERE ush.phone = $1 
                 ORDER BY ush.created_at DESC`,
                [user.phone]
            );

            // Recent deposits
            const deposits = await pool.query(
                'SELECT * FROM deposits WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10',
                [userId]
            );

            // Recent withdrawals
            const withdrawals = await pool.query(
                'SELECT * FROM withdrawals WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10',
                [userId]
            );

            // Sent alerts
            const alerts = await pool.query(
                `SELECT ua.*, a.username as admin_name 
                 FROM user_alerts ua 
                 LEFT JOIN admins a ON ua.sent_by = a.id 
                 WHERE ua.user_id = $1 
                 ORDER BY ua.created_at DESC LIMIT 20`,
                [userId]
            );

            // Warning count
            const warningCount = await pool.query(
                "SELECT COUNT(*) as count FROM user_suspension_history WHERE phone = $1 AND action = 'warning'",
                [user.phone]
            );

            return res.json({
                success: true,
                data: {
                    ...user,
                    warningCount: parseInt(warningCount.rows[0].count),
                    activityLog: activityLog.rows,
                    suspensionHistory: suspensionHistory.rows,
                    recentDeposits: deposits.rows,
                    recentWithdrawals: withdrawals.rows,
                    alerts: alerts.rows
                }
            });
        } catch (error) {
            console.error('getUserById error:', error.message);
            return res.json({ success: false, message: 'Failed to load user' });
        }
    }

    async updateUser(req, res) {
        try {
            const { phone, fullName, password } = req.body;
            const userId = req.params.id;
            
            // Get current user data for activity log
            const currentUser = await pool.query('SELECT phone, full_name FROM users WHERE id = $1', [userId]);
            if (currentUser.rows.length === 0) return res.json({ success: false, message: 'User not found' });
            
            const fields = [];
            const values = [];
            let i = 1;
            
            if (phone && phone !== currentUser.rows[0].phone) {
                fields.push(`phone = $${i++}`);
                values.push(phone);
                await this.logActivity(userId, currentUser.rows[0].phone, 'phone_changed', 'phone', currentUser.rows[0].phone, phone, req.admin.id, req.ip);
            }
            if (fullName !== undefined && fullName !== currentUser.rows[0].full_name) {
                fields.push(`full_name = $${i++}`);
                values.push(fullName);
                await this.logActivity(userId, currentUser.rows[0].phone, 'name_changed', 'full_name', currentUser.rows[0].full_name || '', fullName, req.admin.id, req.ip);
            }
            if (password && password.trim() !== '') {
                const hash = await bcrypt.hash(password, 12);
                fields.push(`password_hash = $${i++}`);
                values.push(hash);
                await this.logActivity(userId, currentUser.rows[0].phone, 'password_changed', 'password', '****', '****', req.admin.id, req.ip);
            }
            
            if (fields.length === 0) return res.json({ success: false, message: 'No changes made' });
            
            fields.push(`updated_at = NOW()`);
            values.push(userId);
            await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = $${i}`, values);
            
            return res.json({ success: true, message: 'User updated successfully' });
        } catch (error) {
            return res.json({ success: false, message: error.message || 'Failed to update user' });
        }
    }

    async logActivity(userId, phone, action, fieldName, oldValue, newValue, changedBy, ipAddress) {
        try {
            await pool.query(
                'INSERT INTO user_activity_log (user_id, phone, action, field_name, old_value, new_value, changed_by, ip_address) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
                [userId, phone, action, fieldName, oldValue, newValue, changedBy, ipAddress]
            );
        } catch (e) {
            console.error('Activity log error:', e.message);
        }
    }

    async deleteUser(req, res) {
        try {
            const user = await pool.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
            if (user.rows.length === 0) return res.json({ success: false, message: 'User not found' });
            const u = user.rows[0];
            
            await pool.query(
                'INSERT INTO deleted_users (original_id, phone, full_name, status, balance, total_earned, total_deposited, active_package, referral_code, deleted_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
                [u.id, u.phone, u.full_name, u.status, u.balance, u.total_earned, u.total_deposited, u.active_package, u.referral_code, req.admin.id]
            );
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
            const user = await pool.query('SELECT phone, full_name FROM users WHERE id = $1', [req.params.id]);
            const phone = user.rows[0]?.phone;
            const userName = user.rows[0]?.full_name || phone || 'User';
            
            await pool.query('UPDATE users SET status = $1 WHERE id = $2', [status, req.params.id]);
            await pool.query(
                'INSERT INTO user_suspension_history (user_id, phone, action, reason, admin_id) VALUES ($1, $2, $3, $4, $5)',
                [req.params.id, phone, action, reason, req.admin.id]
            );
            await this.logActivity(req.params.id, phone, `user_${action}`, 'status', 'active', status, req.admin.id, req.ip);
            
            const alertTitle = action === 'ban' ? '🚫 Account Banned' : '⚠️ Account Suspended';
            const alertMessage = action === 'ban' 
                ? `Your account has been permanently banned. Reason: ${reason || 'Violation of terms'}.`
                : `Your account has been suspended. Reason: ${reason || 'Violation of terms'}. Contact support.`;
            
            await pool.query(
                'INSERT INTO user_alerts (user_id, title, message, type, icon, color, sent_by) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                [req.params.id, alertTitle, alertMessage, 'danger', '🚫', 'color-danger', req.admin.id]
            );
            await NotificationsService.create(req.params.id, alertTitle, alertMessage, 'system');
            
            return res.json({ success: true, message: `User ${action}ed` });
        } catch (error) {
            return res.json({ success: false, message: 'Failed to suspend user' });
        }
    }

    async activateUser(req, res) {
        try {
            const user = await pool.query('SELECT phone FROM users WHERE id = $1', [req.params.id]);
            await pool.query('UPDATE users SET status = $1 WHERE id = $2', ['active', req.params.id]);
            await this.logActivity(req.params.id, user.rows[0]?.phone, 'user_activated', 'status', 'suspended/banned', 'active', req.admin.id, req.ip);
            return res.json({ success: true, message: 'User activated' });
        } catch (error) {
            return res.json({ success: false, message: 'Failed to activate user' });
        }
    }

    async warnUser(req, res) {
        try {
            const { reason } = req.body;
            const user = await pool.query('SELECT phone, full_name FROM users WHERE id = $1', [req.params.id]);
            const phone = user.rows[0]?.phone;
            const userName = user.rows[0]?.full_name || phone || 'User';
            
            // Increment warning count
            await pool.query('UPDATE users SET warning_count = COALESCE(warning_count, 0) + 1 WHERE id = $1', [req.params.id]);
            
            // Record in suspension history
            await pool.query(
                'INSERT INTO user_suspension_history (user_id, phone, action, reason, admin_id) VALUES ($1, $2, $3, $4, $5)',
                [req.params.id, phone, 'warning', reason, req.admin.id]
            );
            
            // Log activity
            await this.logActivity(req.params.id, phone, 'warning_sent', 'warning', '', reason, req.admin.id, req.ip);
            
            // Create sticky alert
            await pool.query(
                'INSERT INTO user_alerts (user_id, title, message, type, icon, color, sent_by, is_dismissed) VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE)',
                [req.params.id, '⚠️ Warning Received', `Reason: ${reason || 'Policy violation'}. This is warning #${(user.rows[0]?.warning_count || 0) + 1}. Continued violations may result in suspension.`, 'warning', '⚡', 'color-warning', req.admin.id]
            );
            
            await NotificationsService.create(req.params.id, '⚠️ Warning', `You received a warning. Reason: ${reason}`, 'system');
            
            return res.json({ success: true, message: 'Warning sent to user' });
        } catch (error) {
            return res.json({ success: false, message: 'Failed to send warning' });
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

    async createAdmin(req, res) { /* unchanged */ }
    async getFeatures(req, res) { /* unchanged */ }
    async toggleFeature(req, res) { /* unchanged */ }
    async sendBroadcast(req, res) { /* unchanged */ }
    async getBroadcasts(req, res) { /* unchanged */ }
    async getLogs(req, res) { /* unchanged */ }
    async getWithdrawals(req, res) { /* unchanged */ }
    async getSalaryHistory(req, res) { /* unchanged */ }
    async getAlertTemplates(req, res) { /* unchanged */ }
    async sendUserAlert(req, res) { /* unchanged */ }
    async sendBulkAlert(req, res) { /* unchanged */ }
    async sendAllAlert(req, res) { /* unchanged */ }

    // The full implementations for these methods are already in your controller
    // I'm keeping them as-is to not duplicate code
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
            if (!title || !message) return res.json({ success: false, message: 'Title and message required' });
            const result = await AdminService.sendBroadcast(title, message, target, req.admin.id);
            let users;
            if (target === 'all') users = await pool.query("SELECT id FROM users WHERE status != 'banned'");
            else if (target === 'users') users = await pool.query("SELECT id FROM users WHERE status = 'active'");
            else users = await pool.query('SELECT id FROM users');
            let count = 0;
            for (const user of users.rows) {
                await pool.query('INSERT INTO user_alerts (user_id, title, message, type, icon, color, sent_by) VALUES ($1,$2,$3,$4,$5,$6,$7)', [user.id, title, message, 'announcement', '📢', 'color-info', req.admin.id]);
                await NotificationsService.create(user.id, title, message, 'system');
                count++;
            }
            return res.json({ success: true, data: result, message: `Broadcast sent to ${count} users` });
        } catch (error) {
            return res.json({ success: false, message: 'Failed to send broadcast' });
        }
    }
    async getBroadcasts(req, res) {
        try {
            const result = await pool.query('SELECT * FROM broadcasts WHERE is_active = TRUE ORDER BY created_at DESC LIMIT 20');
            return res.json({ success: true, data: result.rows });
        } catch (error) {
            return res.json({ success: false, message: 'Failed to load broadcasts' });
        }
    }
    async getLogs(req, res) {
        try {
            const result = await pool.query('SELECT al.*, a.username FROM admin_logs al JOIN admins a ON al.admin_id = a.id ORDER BY al.created_at DESC LIMIT 50');
            return res.json({ success: true, data: result.rows });
        } catch (error) {
            return res.json({ success: false, message: 'Failed to load logs' });
        }
    }
    async getWithdrawals(req, res) {
        try {
            const { status = 'pending' } = req.query;
            const result = await pool.query(`SELECT w.*, u.phone, u.full_name, ba.bank_name, ba.account_number FROM withdrawals w JOIN users u ON w.user_id = u.id JOIN bank_accounts ba ON w.bank_account_id = ba.id WHERE w.status = $1 ORDER BY w.created_at DESC LIMIT 50`, [status]);
            return res.json({ success: true, data: result.rows });
        } catch (error) {
            return res.json({ success: false, message: 'Failed to load withdrawals' });
        }
    }
    async getSalaryHistory(req, res) {
        try {
            const result = await pool.query('SELECT ms.*, u.phone FROM manager_salaries ms JOIN users u ON ms.user_id = u.id ORDER BY ms.paid_at DESC LIMIT 50');
            return res.json({ success: true, data: result.rows });
        } catch (error) {
            return res.json({ success: false, message: 'Failed to load salary history' });
        }
    }
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
            let title = customTitle || 'Alert', message = customMessage || 'You have a new alert.', type = 'info', icon = '📢', color = 'color-info';
            if (templateId) {
                const template = await pool.query('SELECT * FROM alert_templates WHERE id = $1', [templateId]);
                if (template.rows.length > 0) {
                    const tp = template.rows[0];
                    const user = await pool.query('SELECT full_name, phone FROM users WHERE id = $1', [req.params.id]);
                    const userName = user.rows[0]?.full_name || user.rows[0]?.phone || 'User';
                    title = customTitle || tp.title_template; message = customMessage || tp.message_template;
                    title = title.replace('{USER_NAME}', userName).replace('{APP_NAME}', 'Pay to Earn');
                    message = message.replace('{USER_NAME}', userName).replace('{APP_NAME}', 'Pay to Earn').replace('{REASON}', customMessage || '');
                    type = tp.type; icon = tp.icon; color = tp.color;
                }
            }
            await pool.query('INSERT INTO user_alerts (user_id, template_id, title, message, type, icon, color, sent_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', [req.params.id, templateId||null, title, message, type, icon, color, req.admin.id]);
            await NotificationsService.create(req.params.id, title, message, 'alert');
            return res.json({ success: true, message: 'Alert sent to user' });
        } catch (error) { return res.json({ success: false, message: 'Failed to send alert' }); }
    }
    async sendBulkAlert(req, res) {
        try {
            const { userIds, templateId, customTitle, customMessage } = req.body;
            if (!userIds || !userIds.length) return res.json({ success: false, message: 'No users selected' });
            let count = 0;
            for (const uid of userIds) {
                let title = customTitle || 'Alert', message = customMessage || 'You have a new alert.', type = 'info', icon = '📢', color = 'color-info';
                if (templateId) {
                    const template = await pool.query('SELECT * FROM alert_templates WHERE id = $1', [templateId]);
                    if (template.rows.length > 0) {
                        const tp = template.rows[0];
                        const user = await pool.query('SELECT full_name, phone FROM users WHERE id = $1', [uid]);
                        const userName = user.rows[0]?.full_name || user.rows[0]?.phone || 'User';
                        title = customTitle || tp.title_template; message = customMessage || tp.message_template;
                        title = title.replace('{USER_NAME}', userName).replace('{APP_NAME}', 'Pay to Earn');
                        message = message.replace('{USER_NAME}', userName).replace('{APP_NAME}', 'Pay to Earn');
                        type = tp.type; icon = tp.icon; color = tp.color;
                    }
                }
                await pool.query('INSERT INTO user_alerts (user_id, template_id, title, message, type, icon, color, sent_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', [uid, templateId||null, title, message, type, icon, color, req.admin.id]);
                await NotificationsService.create(uid, title, message, 'alert');
                count++;
            }
            return res.json({ success: true, message: `Alert sent to ${count} users` });
        } catch (error) { return res.json({ success: false, message: 'Failed to send alerts' }); }
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
                let title = customTitle || 'Alert', message = customMessage || 'You have a new alert.', type = 'info', icon = '📢', color = 'color-info';
                if (templateId) {
                    const template = await pool.query('SELECT * FROM alert_templates WHERE id = $1', [templateId]);
                    if (template.rows.length > 0) {
                        const tp = template.rows[0];
                        const userName = user.full_name || user.phone || 'User';
                        title = customTitle || tp.title_template; message = customMessage || tp.message_template;
                        title = title.replace('{USER_NAME}', userName).replace('{APP_NAME}', 'Pay to Earn');
                        message = message.replace('{USER_NAME}', userName).replace('{APP_NAME}', 'Pay to Earn');
                        type = tp.type; icon = tp.icon; color = tp.color;
                    }
                }
                await pool.query('INSERT INTO user_alerts (user_id, template_id, title, message, type, icon, color, sent_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', [user.id, templateId||null, title, message, type, icon, color, req.admin.id]);
                await NotificationsService.create(user.id, title, message, 'alert');
                count++;
            }
            return res.json({ success: true, message: `Alert sent to ${count} users` });
        } catch (error) { return res.json({ success: false, message: 'Failed to send alerts' }); }
    }
    async createAdmin(req, res) {
        try {
            const { username, password, role } = req.body;
            const result = await AdminService.createAdmin(req.admin.id, username, password, role);
            return res.json({ success: true, data: result });
        } catch (error) { return res.json({ success: false, message: error.message }); }
    }
}

module.exports = new AdminController();