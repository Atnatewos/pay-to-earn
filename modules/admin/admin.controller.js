// modules/admin/admin.controller.js
const AdminService = require('./admin.service');
const NotificationsService = require('../notifications/notifications.service');
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
            const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
            if (userResult.rows.length === 0) return res.json({ success: false, message: 'User not found' });
            const user = userResult.rows[0];

            const activityLog = await pool.query(
                `SELECT ual.*, a.username as admin_name FROM user_activity_log ual LEFT JOIN admins a ON ual.changed_by = a.id WHERE ual.user_id = $1 ORDER BY ual.created_at DESC LIMIT 50`,
                [userId]
            );

            const passwordHistory = await pool.query(
                `SELECT ph.id, ph.changed_at, CASE WHEN ph.changed_by IS NULL THEN 'Self' ELSE a.username END as changed_by_name FROM password_history ph LEFT JOIN admins a ON ph.changed_by = a.id WHERE ph.user_id = $1 ORDER BY ph.changed_at DESC LIMIT 10`,
                [userId]
            );

            const suspensionHistory = await pool.query(
                `SELECT ush.*, a.username as admin_name FROM user_suspension_history ush LEFT JOIN admins a ON ush.admin_id = a.id WHERE ush.phone = $1 ORDER BY ush.created_at DESC`,
                [user.phone]
            );

            const deposits = await pool.query('SELECT * FROM deposits WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10', [userId]);
            const withdrawals = await pool.query('SELECT * FROM withdrawals WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10', [userId]);

            const alerts = await pool.query(
                `SELECT ua.*, a.username as admin_name FROM user_alerts ua LEFT JOIN admins a ON ua.sent_by = a.id WHERE ua.user_id = $1 ORDER BY ua.created_at DESC LIMIT 20`,
                [userId]
            );

            const warningCount = await pool.query("SELECT COUNT(*) as count FROM user_suspension_history WHERE phone = $1 AND action = 'warning'", [user.phone]);

            return res.json({
                success: true,
                data: {
                    ...user,
                    warningCount: parseInt(warningCount.rows[0].count),
                    activityLog: activityLog.rows,
                    passwordHistory: passwordHistory.rows,
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

            const currentUser = await pool.query('SELECT phone, full_name FROM users WHERE id = $1', [userId]);
            if (currentUser.rows.length === 0) return res.json({ success: false, message: 'User not found' });

            const fields = [];
            const values = [];
            let i = 1;

            if (phone && phone !== currentUser.rows[0].phone) {
                fields.push(`phone = $${i++}`);
                values.push(phone);
                await pool.query(
                    'INSERT INTO user_activity_log (user_id, phone, action, field_name, old_value, new_value, changed_by, ip_address) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
                    [userId, currentUser.rows[0].phone, 'phone_changed', 'phone', currentUser.rows[0].phone, phone, req.admin.id, req.ip]
                );
            }
            if (fullName !== undefined && fullName !== currentUser.rows[0].full_name) {
                fields.push(`full_name = $${i++}`);
                values.push(fullName);
                await pool.query(
                    'INSERT INTO user_activity_log (user_id, phone, action, field_name, old_value, new_value, changed_by, ip_address) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
                    [userId, currentUser.rows[0].phone, 'name_changed', 'full_name', currentUser.rows[0].full_name || '', fullName, req.admin.id, req.ip]
                );
            }
            if (password && password.trim() !== '') {
                const hash = await bcrypt.hash(password, 12);
                fields.push(`password_hash = $${i++}`);
                values.push(hash);
                await pool.query(
                    'INSERT INTO user_activity_log (user_id, phone, action, field_name, old_value, new_value, changed_by, ip_address) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
                    [userId, currentUser.rows[0].phone, 'password_changed', 'password', '****', '****', req.admin.id, req.ip]
                );
                await pool.query(
                    'INSERT INTO password_history (user_id, password_hash, changed_by) VALUES ($1, $2, $3)',
                    [userId, hash, req.admin.id]
                );
            }

            if (fields.length === 0) return res.json({ success: false, message: 'No changes made' });

            fields.push(`updated_at = NOW()`);
            values.push(userId);
            await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = $${i}`, values);

            return res.json({ success: true, message: 'User updated successfully' });
        } catch (error) {
            console.error('updateUser error:', error.message);
            return res.json({ success: false, message: error.message || 'Failed to update user' });
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
            await pool.query('UPDATE users SET status = $1 WHERE id = $2', [status, req.params.id]);
            await pool.query(
                'INSERT INTO user_suspension_history (user_id, phone, action, reason, admin_id) VALUES ($1, $2, $3, $4, $5)',
                [req.params.id, phone, action, reason, req.admin.id]
            );
            await pool.query(
                'INSERT INTO user_activity_log (user_id, phone, action, field_name, old_value, new_value, changed_by, ip_address) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
                [req.params.id, phone, `user_${action}`, 'status', 'active', status, req.admin.id, req.ip]
            );
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
            await pool.query(
                'INSERT INTO user_activity_log (user_id, phone, action, field_name, old_value, new_value, changed_by, ip_address) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
                [req.params.id, user.rows[0]?.phone, 'user_activated', 'status', 'suspended/banned', 'active', req.admin.id, req.ip]
            );
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
            await pool.query('UPDATE users SET warning_count = COALESCE(warning_count, 0) + 1 WHERE id = $1', [req.params.id]);
            await pool.query(
                'INSERT INTO user_suspension_history (user_id, phone, action, reason, admin_id) VALUES ($1, $2, $3, $4, $5)',
                [req.params.id, phone, 'warning', reason, req.admin.id]
            );
            await pool.query(
                'INSERT INTO user_activity_log (user_id, phone, action, field_name, old_value, new_value, changed_by, ip_address) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
                [req.params.id, phone, 'warning_sent', 'warning', '', reason, req.admin.id, req.ip]
            );
            await pool.query(
                "INSERT INTO user_alerts (user_id, title, message, type, icon, color, sent_by, is_dismissed) VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE)",
                [req.params.id, '⚠️ Warning Received', `Reason: ${reason || 'Policy violation'}. This is warning #${(user.rows[0]?.warning_count || 0) + 1}.`, 'warning', '⚡', 'color-warning', req.admin.id]
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

    async createAdmin(req, res) {
        try {
            const { username, password, role } = req.body;
            const result = await AdminService.createAdmin(req.admin.id, username, password, role);
            return res.json({ success: true, data: result });
        } catch (error) { return res.json({ success: false, message: error.message }); }
    }

    async getFeatures(req, res) {
        try { const result = await pool.query('SELECT * FROM system_features'); return res.json({ success: true, data: result.rows }); }
        catch (error) { return res.json({ success: false, message: 'Failed to load features' }); }
    }

    async toggleFeature(req, res) {
        try {
            const { isEnabled } = req.body;
            await pool.query('UPDATE system_features SET is_enabled = $1 WHERE feature_key = $2', [isEnabled, req.params.featureKey]);
            return res.json({ success: true });
        } catch (error) { return res.json({ success: false, message: 'Failed to toggle' }); }
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
        } catch (error) { return res.json({ success: false, message: 'Failed to send broadcast' }); }
    }

    async getBroadcasts(req, res) {
        try { const result = await pool.query('SELECT * FROM broadcasts WHERE is_active = TRUE ORDER BY created_at DESC LIMIT 20'); return res.json({ success: true, data: result.rows }); }
        catch (error) { return res.json({ success: false, message: 'Failed to load broadcasts' }); }
    }

    async getLogs(req, res) {
        try { const result = await pool.query('SELECT al.*, a.username FROM admin_logs al JOIN admins a ON al.admin_id = a.id ORDER BY al.created_at DESC LIMIT 50'); return res.json({ success: true, data: result.rows }); }
        catch (error) { return res.json({ success: false, message: 'Failed to load logs' }); }
    }

    async getWithdrawals(req, res) {
        try {
            const { status = 'pending' } = req.query;
            const result = await pool.query(`SELECT w.*, u.phone, u.full_name, ba.bank_name, ba.account_number FROM withdrawals w JOIN users u ON w.user_id = u.id JOIN bank_accounts ba ON w.bank_account_id = ba.id WHERE w.status = $1 ORDER BY w.created_at DESC LIMIT 50`, [status]);
            return res.json({ success: true, data: result.rows });
        } catch (error) { return res.json({ success: false, message: 'Failed to load withdrawals' }); }
    }

    async getSalaryHistory(req, res) {
        try { const result = await pool.query('SELECT ms.*, u.phone FROM manager_salaries ms JOIN users u ON ms.user_id = u.id ORDER BY ms.paid_at DESC LIMIT 50'); return res.json({ success: true, data: result.rows }); }
        catch (error) { return res.json({ success: false, message: 'Failed to load salary history' }); }
    }

    async getAlertTemplates(req, res) {
        try { const result = await pool.query('SELECT * FROM alert_templates ORDER BY id'); return res.json({ success: true, data: result.rows }); }
        catch (error) { return res.json({ success: false, message: 'Failed to load templates' }); }
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

    async changeUserLevel(req, res) {
        try {
            const { packageName } = req.body;
            const userId = req.params.id;
            
            const user = await pool.query('SELECT phone, full_name FROM users WHERE id = $1', [userId]);
            if (user.rows.length === 0) return res.json({ success: false, message: 'User not found' });
            
            if (packageName === 'none') {
                await pool.query('UPDATE users SET active_package = NULL, package_expiry = NULL WHERE id = $1', [userId]);
                await pool.query('UPDATE user_packages SET is_active = FALSE WHERE user_id = $1', [userId]);
                await pool.query('INSERT INTO user_alerts (user_id, title, message, type, icon, color, sent_by) VALUES ($1,$2,$3,$4,$5,$6,$7)', 
                    [userId, '📦 Package Removed', 'Your active package has been removed by admin.', 'info', '📦', 'color-info', req.admin.id]);
                return res.json({ success: true, message: 'Package removed' });
            }
            
            // Get package from config
            const PackagesService = require('../packages/packages.service');
            const pkg = await PackagesService.getPackageByName(packageName);
            if (!pkg) return res.json({ success: false, message: 'Invalid package' });
            
            const durationDays = pkg.duration_days || 30;
            
            await pool.query('UPDATE user_packages SET is_active = FALSE WHERE user_id = $1', [userId]);
            await pool.query(
                `INSERT INTO user_packages (user_id, package_name, deposit_amount, started_at, expires_at) VALUES ($1,$2,$3,CURRENT_DATE,CURRENT_DATE + INTERVAL '${durationDays} days')`,
                [userId, pkg.name, pkg.deposit_amount]
            );
            await pool.query(
                `UPDATE users SET active_package = $1, package_expiry = CURRENT_DATE + INTERVAL '${durationDays} days' WHERE id = $2`,
                [pkg.name, userId]
            );
            
            await pool.query('INSERT INTO user_alerts (user_id, title, message, type, icon, color, sent_by) VALUES ($1,$2,$3,$4,$5,$6,$7)',
                [userId, '🎉 Level Changed!', `Your package has been changed to ${pkg.name} by admin.`, 'success', '🎊', 'gradient-accent', req.admin.id]);
            await NotificationsService.create(userId, 'Package Changed', `Your package is now ${pkg.name}.`, 'system');
            
            return res.json({ success: true, message: `Package changed to ${pkg.name}` });
        } catch (error) {
            return res.json({ success: false, message: 'Failed to change package' });
        }
    }

    async addUserMoney(req, res) {
        try {
            const { amount, reason } = req.body;
            const userId = req.params.id;
            if (!amount || amount <= 0) return res.json({ success: false, message: 'Invalid amount' });
            const user = await pool.query('SELECT phone, full_name FROM users WHERE id = $1', [userId]);
            if (user.rows.length === 0) return res.json({ success: false, message: 'User not found' });
            const MoneyService = require('../money/money.service');
            await MoneyService.credit(userId, amount, 'earnings', 'admin_gift', reason || 'Admin bonus');
            await pool.query('INSERT INTO user_alerts (user_id, title, message, type, icon, color, sent_by) VALUES ($1,$2,$3,$4,$5,$6,$7)', [userId, '🎁 Bonus Received!', `Admin has added ${amount.toLocaleString()} ETB to your earnings. Reason: ${reason || 'Bonus'}`, 'success', '🎁', 'gradient-primary', req.admin.id]);
            await NotificationsService.create(userId, 'Bonus Received 🎁', `${amount.toLocaleString()} ETB added to your account. ${reason || ''}`, 'system');
            return res.json({ success: true, message: `${amount} ETB added to user earnings` });
        } catch (error) { return res.json({ success: false, message: 'Failed to add money' }); }
    }


    // modules/admin/admin.controller.js - ADD THESE TWO METHODS before module.exports

/**
 * Get manager rank summary for a specific user
 * Used by admin to view and manage user's manager level
 */
async getUserManagerInfo(req, res) {
    try {
        const userId = req.params.id;
        const SalaryService = require('../salary/salary.service');
        
        // Get user's current team counts and eligibility
        const eligibility = await SalaryService.checkRankEligibility(userId);
        
        // Get user's current assigned manager rank
        const userResult = await pool.query(
            'SELECT manager_rank, full_name, phone FROM users WHERE id = $1',
            [userId]
        );
        
        if (userResult.rows.length === 0) {
            return res.json({ success: false, message: 'User not found' });
        }
        
        const user = userResult.rows[0];
        
        return res.json({
            success: true,
            data: {
                currentRank: user.manager_rank || null,
                teamCounts: eligibility.currentCounts,
                eligibleRanks: eligibility.eligibleRanks,
                highestEligibleRank: eligibility.highestRank,
                allRanks: eligibility.eligibleRanks.length > 0 ? eligibility.eligibleRanks : []
            }
        });
    } catch (error) {
        return res.json({ success: false, message: 'Failed to load manager info' });
    }
}

    /**
     * Manually assign a manager rank to a user
     * Admin can set any rank regardless of team size
     */
    async assignManagerRank(req, res) {
        try {
            const { rankName } = req.body;
            const userId = req.params.id;
            const managerConfig = require('../../config/managers.json');
            
            // Validate rank exists in config
            const validRanks = managerConfig.ranks.map(r => r.name);
            if (rankName !== 'none' && !validRanks.includes(rankName)) {
                return res.json({ success: false, message: 'Invalid manager rank' });
            }
            
            const newRank = rankName === 'none' ? null : rankName;
            
            // Update user's manager rank
            await pool.query(
                'UPDATE users SET manager_rank = $1 WHERE id = $2',
                [newRank, userId]
            );
            
            // Get user info for notification
            const user = await pool.query('SELECT full_name, phone FROM users WHERE id = $1', [userId]);
            const userName = user.rows[0]?.full_name || user.rows[0]?.phone || 'User';
            
            // Send notification
            if (newRank) {
                await NotificationsService.create(
                    userId,
                    '🏆 Manager Rank Assigned!',
                    `Congratulations ${userName}! You have been assigned the rank of "${newRank}". Check your profile for details.`,
                    'system'
                );
                
                // Send popup alert
                await pool.query(
                    'INSERT INTO user_alerts (user_id, title, message, type, icon, color, sent_by) VALUES ($1,$2,$3,$4,$5,$6,$7)',
                    [userId, '🏆 Manager Rank Updated!', `You are now a "${newRank}". This rank comes with privileges and recognition.`, 'success', '🏆', 'gradient-accent', req.admin.id]
                );
            }
            
            return res.json({ 
                success: true, 
                message: newRank ? `Manager rank set to "${newRank}"` : 'Manager rank removed' 
            });
        } catch (error) {
            return res.json({ success: false, message: 'Failed to assign rank' });
        }
    }
}

module.exports = new AdminController();