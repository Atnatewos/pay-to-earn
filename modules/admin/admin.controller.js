// modules/admin/admin.controller.js

/**
 * Admin Controller - Handles all admin panel operations
 * Includes admin management (CRUD) for super_admin
 * All permission checks via middleware
 */
const AdminService = require('./admin.service');
const NotificationsService = require('../notifications/notifications.service');
const pool = require('../../config/db');
const bcrypt = require('bcryptjs');
const permissionsConfig = require('../../config/permissions.json');

class AdminController {

  // ============ EXISTING METHODS (unchanged) ============
  async login(req, res) {
    try {
      var username = req.body.username;
      var password = req.body.password;
      if (!username || !password) {
        return res.json({ success: false, message: 'Username and password required' });
      }
      var result = await AdminService.login(username, password);
      return res.json({ success: true, data: result });
    } catch (error) {
      return res.json({ success: false, message: error.message || 'Login failed' });
    }
  }

  async getDashboard(req, res) {
    try {
      var stats = await AdminService.getDashboard();
      return res.json({ success: true, data: stats });
    } catch (error) {
      return res.json({ success: false, message: 'Failed to load dashboard' });
    }
  }

  // ============ ADMIN MANAGEMENT METHODS ============

  /**
   * List all admins with their permissions
   * Only super_admin can access
   */

    /**
     * List all admins with their permissions
     * Excludes the requesting admin from the list (can't see yourself)
     * Only accessible with admins.view permission
     */
    async listAdmins(req, res) {
    try {
        var currentAdminId = req.admin.id;
        
        // Get all admins EXCEPT the current admin (can't manage yourself)
        var result = await pool.query(
        'SELECT id, username, role, status, last_login, created_at FROM admins WHERE id != $1 ORDER BY created_at DESC',
        [currentAdminId]
        );

        var admins = result.rows;

        // Get permissions for each admin
        for (var i = 0; i < admins.length; i++) {
        var permResult = await pool.query(
            'SELECT permission_code FROM admin_permissions WHERE admin_id = $1',
            [admins[i].id]
        );
        admins[i].permissions = permResult.rows.map(function(r) { return r.permission_code; });
        }

        return res.json({
        success: true,
        data: {
            admins: admins,
            allPermissions: permissionsConfig.permissions
        }
        });
    } catch (error) {
        console.error('listAdmins error:', error.message);
        return res.json({ success: false, message: 'Failed to load admins' });
    }
    }


    /**
     * Create a new admin account with default permissions based on role
     * Super admin can specify custom permissions to override defaults
     */
    async createAdmin(req, res) {
    try {
        var username = req.body.username;
        var password = req.body.password;
        var role = req.body.role;
        var permissionCodes = req.body.permissions || [];
        var adminDefaults = require('../../config/adminDefaults.json');

        if (!username || !password || !role) {
        return res.json({ success: false, message: 'Username, password, and role are required' });
        }

        if (password.length < 6) {
        return res.json({ success: false, message: 'Password must be at least 6 characters' });
        }

        // Check username uniqueness
        var existingResult = await pool.query(
        'SELECT id FROM admins WHERE username = $1',
        [username]
        );
        if (existingResult.rows.length > 0) {
        return res.json({ success: false, message: 'Username already exists' });
        }

        // Hash password
        var passwordHash = await bcrypt.hash(password, 12);

        // Create admin
        var insertResult = await pool.query(
        'INSERT INTO admins (username, password_hash, role, created_by, status) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [username, passwordHash, role, req.admin.id, 'active']
        );

        var newAdminId = insertResult.rows[0].id;

        // Determine which permissions to assign
        var finalPermissions;
        if (permissionCodes.length > 0) {
        // Admin specified custom permissions - use those
        finalPermissions = permissionCodes;
        } else {
        // Use default permissions for this role from config
        finalPermissions = adminDefaults[role] || [];
        }

        // Assign permissions
        for (var i = 0; i < finalPermissions.length; i++) {
        await pool.query(
            'INSERT INTO admin_permissions (admin_id, permission_code, granted_by) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
            [newAdminId, finalPermissions[i], req.admin.id]
        );
        }

        // Log activity
        await pool.query(
        'INSERT INTO admin_logs (admin_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
        [req.admin.id, 'admin_created', 'admin', newAdminId, JSON.stringify({ username: username, role: role, permissions: finalPermissions })]
        );

        return res.json({
        success: true,
        message: 'Admin created with ' + finalPermissions.length + ' default permissions',
        data: { id: newAdminId, username: username, role: role, permissions: finalPermissions }
        });
    } catch (error) {
        console.error('createAdmin error:', error.message);
        return res.json({ success: false, message: 'Failed to create admin' });
    }
    }

  /**
   * Update an admin's details
   * Can change username, password, role
   */
  async updateAdmin(req, res) {
    try {
      var adminId = req.params.id;
      var username = req.body.username;
      var password = req.body.password;
      var role = req.body.role;

      // Prevent editing self
      if (parseInt(adminId) === req.admin.id) {
        return res.json({ success: false, message: 'Cannot edit your own account' });
      }

      var fields = [];
      var values = [];
      var paramIndex = 1;

      if (username) {
        fields.push('username = $' + paramIndex);
        values.push(username);
        paramIndex++;
      }

      if (password && password.trim() !== '') {
        if (password.length < 6) {
          return res.json({ success: false, message: 'Password must be at least 6 characters' });
        }
        var hash = await bcrypt.hash(password, 12);
        fields.push('password_hash = $' + paramIndex);
        values.push(hash);
        paramIndex++;
      }

      if (role) {
        fields.push('role = $' + paramIndex);
        values.push(role);
        paramIndex++;
      }

      if (fields.length === 0) {
        return res.json({ success: false, message: 'No changes made' });
      }

      values.push(adminId);
      await pool.query(
        'UPDATE admins SET ' + fields.join(', ') + ' WHERE id = $' + paramIndex,
        values
      );

      await pool.query(
        'INSERT INTO admin_logs (admin_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
        [req.admin.id, 'admin_updated', 'admin', adminId, JSON.stringify(req.body)]
      );

      return res.json({ success: true, message: 'Admin updated successfully' });
    } catch (error) {
      console.error('updateAdmin error:', error.message);
      return res.json({ success: false, message: 'Failed to update admin' });
    }
  }

  /**
   * Delete an admin account
   */
  async deleteAdmin(req, res) {
    try {
      var adminId = req.params.id;

      if (parseInt(adminId) === req.admin.id) {
        return res.json({ success: false, message: 'Cannot delete your own account' });
      }

      await pool.query('DELETE FROM admin_permissions WHERE admin_id = $1', [adminId]);
      await pool.query('DELETE FROM admins WHERE id = $1', [adminId]);

      await pool.query(
        'INSERT INTO admin_logs (admin_id, action, entity_type, entity_id) VALUES ($1, $2, $3, $4)',
        [req.admin.id, 'admin_deleted', 'admin', adminId]
      );

      return res.json({ success: true, message: 'Admin deleted' });
    } catch (error) {
      console.error('deleteAdmin error:', error.message);
      return res.json({ success: false, message: 'Failed to delete admin' });
    }
  }

  /**
   * Suspend or activate an admin
   */
  async toggleAdminStatus(req, res) {
    try {
      var adminId = req.params.id;
      var status = req.body.status;

      if (parseInt(adminId) === req.admin.id) {
        return res.json({ success: false, message: 'Cannot change your own status' });
      }

      await pool.query('UPDATE admins SET status = $1 WHERE id = $2', [status, adminId]);

      await pool.query(
        'INSERT INTO admin_logs (admin_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
        [req.admin.id, 'admin_' + status, 'admin', adminId, JSON.stringify({ status: status })]
      );

      return res.json({ success: true, message: 'Admin ' + status });
    } catch (error) {
      console.error('toggleAdminStatus error:', error.message);
      return res.json({ success: false, message: 'Failed to update admin status' });
    }
  }


    /**
     * Update an admin's permissions
     * Cannot change your own permissions
     * Replaces all permissions with the new set
     */
    async updateAdminPermissions(req, res) {
    try {
        var uniquePermissions = [];
        for (var i = 0; i < permissionCodes.length; i++) {
        if (uniquePermissions.indexOf(permissionCodes[i]) === -1) {
            uniquePermissions.push(permissionCodes[i]);
        }
        }
        permissionCodes = uniquePermissions;

        var adminId = parseInt(req.params.id);
        var permissionCodes = req.body.permissions || [];

        // Prevent self-permission changes
        if (adminId === req.admin.id) {
        return res.json({ success: false, message: 'Cannot modify your own permissions' });
        }

        // Remove existing permissions
        await pool.query('DELETE FROM admin_permissions WHERE admin_id = $1', [adminId]);

        // Add new permissions
        for (var i = 0; i < permissionCodes.length; i++) {
        await pool.query(
            'INSERT INTO admin_permissions (admin_id, permission_code, granted_by) VALUES ($1, $2, $3)',
            [adminId, permissionCodes[i], req.admin.id]
        );
        }

        await pool.query(
        'INSERT INTO admin_logs (admin_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
        [req.admin.id, 'admin_permissions_updated', 'admin', adminId, JSON.stringify({ permissions: permissionCodes })]
        );

        return res.json({ success: true, message: 'Permissions updated' });
    } catch (error) {
        console.error('updateAdminPermissions error:', error.message);
        return res.json({ success: false, message: 'Failed to update permissions' });
    }
    }

  /**
   * Get available permissions list from config
   */
  async getPermissionsList(req, res) {
    return res.json({
      success: true,
      data: permissionsConfig.permissions
    });
  }

  // ============ EXISTING SHORTER METHODS (keep as-is) ============
  async getUsers(req, res) {
    try {
      var page = parseInt(req.query.page) || 1;
      var limit = parseInt(req.query.limit) || 20;
      var search = req.query.search || '';
      var status = req.query.status || '';
      var result = await AdminService.getUsers(page, limit, search, status);
      return res.json({ success: true, data: result.users, pagination: result.pagination });
    } catch (error) {
      return res.json({ success: false, message: 'Failed to load users' });
    }
  }

  async getUserById(req, res) {
    try {
      var userId = req.params.id;
      var userResult = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
      if (userResult.rows.length === 0) return res.json({ success: false, message: 'User not found' });
      var user = userResult.rows[0];

      var activityLog = await pool.query('SELECT ual.*, a.username as admin_name FROM user_activity_log ual LEFT JOIN admins a ON ual.changed_by = a.id WHERE ual.user_id = $1 ORDER BY ual.created_at DESC LIMIT 50', [userId]);
      var passwordHistory = await pool.query('SELECT ph.id, ph.changed_at, CASE WHEN ph.changed_by IS NULL THEN \'Self\' ELSE a.username END as changed_by_name FROM password_history ph LEFT JOIN admins a ON ph.changed_by = a.id WHERE ph.user_id = $1 ORDER BY ph.changed_at DESC LIMIT 10', [userId]);
      var suspensionHistory = await pool.query('SELECT ush.*, a.username as admin_name FROM user_suspension_history ush LEFT JOIN admins a ON ush.admin_id = a.id WHERE ush.phone = $1 ORDER BY ush.created_at DESC', [user.phone]);
      var deposits = await pool.query('SELECT * FROM deposits WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10', [userId]);
      var withdrawals = await pool.query('SELECT * FROM withdrawals WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10', [userId]);
      var alerts = await pool.query('SELECT ua.*, a.username as admin_name FROM user_alerts ua LEFT JOIN admins a ON ua.sent_by = a.id WHERE ua.user_id = $1 ORDER BY ua.created_at DESC LIMIT 20', [userId]);
      var warningCount = await pool.query("SELECT COUNT(*) as count FROM user_suspension_history WHERE phone = $1 AND action = 'warning'", [user.phone]);

      return res.json({
        success: true,
        data: {
          id: user.id, phone: user.phone, full_name: user.full_name, avatar_url: user.avatar_url,
          referral_code: user.referral_code, status: user.status, balance: user.balance,
          capital: user.capital, earnings_balance: user.earnings_balance,
          total_earned: user.total_earned, total_deposited: user.total_deposited,
          active_package: user.active_package, package_expiry: user.package_expiry,
          manager_rank: user.manager_rank, created_at: user.created_at,
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
      var phone = req.body.phone;
      var fullName = req.body.fullName;
      var password = req.body.password;
      var userId = req.params.id;
      var currentUser = await pool.query('SELECT phone, full_name FROM users WHERE id = $1', [userId]);
      if (currentUser.rows.length === 0) return res.json({ success: false, message: 'User not found' });
      var fields = [];
      var values = [];
      var i = 1;
      if (phone && phone !== currentUser.rows[0].phone) {
        fields.push('phone = $' + i); values.push(phone); i++;
        await pool.query('INSERT INTO user_activity_log (user_id, phone, action, field_name, old_value, new_value, changed_by, ip_address) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', [userId, currentUser.rows[0].phone, 'phone_changed', 'phone', currentUser.rows[0].phone, phone, req.admin.id, req.ip]);
      }
      if (fullName !== undefined && fullName !== currentUser.rows[0].full_name) {
        fields.push('full_name = $' + i); values.push(fullName); i++;
        await pool.query('INSERT INTO user_activity_log (user_id, phone, action, field_name, old_value, new_value, changed_by, ip_address) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', [userId, currentUser.rows[0].phone, 'name_changed', 'full_name', currentUser.rows[0].full_name || '', fullName, req.admin.id, req.ip]);
      }
      if (password && password.trim() !== '') {
        var hash = await bcrypt.hash(password, 12);
        fields.push('password_hash = $' + i); values.push(hash); i++;
        await pool.query('INSERT INTO user_activity_log (user_id, phone, action, field_name, old_value, new_value, changed_by, ip_address) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', [userId, currentUser.rows[0].phone, 'password_changed', 'password', '****', '****', req.admin.id, req.ip]);
        await pool.query('INSERT INTO password_history (user_id, password_hash, changed_by) VALUES ($1,$2,$3)', [userId, hash, req.admin.id]);
      }
      if (fields.length === 0) return res.json({ success: false, message: 'No changes made' });
      fields.push('updated_at = NOW()');
      values.push(userId);
      await pool.query('UPDATE users SET ' + fields.join(', ') + ' WHERE id = $' + (i), values);
      return res.json({ success: true, message: 'User updated successfully' });
    } catch (error) {
      return res.json({ success: false, message: error.message || 'Failed to update user' });
    }
  }

  async deleteUser(req, res) {
    try {
      var user = await pool.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
      if (user.rows.length === 0) return res.json({ success: false, message: 'User not found' });
      var u = user.rows[0];
      await pool.query('INSERT INTO deleted_users (original_id, phone, full_name, status, balance, total_earned, total_deposited, active_package, referral_code, deleted_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)', [u.id, u.phone, u.full_name, u.status, u.balance, u.total_earned, u.total_deposited, u.active_package, u.referral_code, req.admin.id]);
      await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
      return res.json({ success: true, message: 'User deleted' });
    } catch (error) {
      return res.json({ success: false, message: 'Failed to delete user' });
    }
  }

  async suspendUser(req, res) {
    try {
      var action = req.body.action;
      var reason = req.body.reason;
      var status = action === 'ban' ? 'banned' : 'suspended';
      var user = await pool.query('SELECT phone, full_name FROM users WHERE id = $1', [req.params.id]);
      var phone = user.rows[0] ? user.rows[0].phone : null;
      await pool.query('UPDATE users SET status = $1 WHERE id = $2', [status, req.params.id]);
      await pool.query('INSERT INTO user_suspension_history (user_id, phone, action, reason, admin_id) VALUES ($1,$2,$3,$4,$5)', [req.params.id, phone, action, reason, req.admin.id]);
      await pool.query('INSERT INTO user_activity_log (user_id, phone, action, field_name, old_value, new_value, changed_by, ip_address) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', [req.params.id, phone, 'user_' + action, 'status', 'active', status, req.admin.id, req.ip]);
      var alertTitle = action === 'ban' ? 'Account Banned' : 'Account Suspended';
      var alertMessage = action === 'ban' ? 'Your account has been permanently banned. Reason: ' + (reason || 'Violation of terms') : 'Your account has been suspended. Reason: ' + (reason || 'Violation of terms');
      await pool.query('INSERT INTO user_alerts (user_id, title, message, type, icon, color, sent_by) VALUES ($1,$2,$3,$4,$5,$6,$7)', [req.params.id, alertTitle, alertMessage, 'danger', '🚫', 'color-danger', req.admin.id]);
      await NotificationsService.create(req.params.id, alertTitle, alertMessage, 'system');
      return res.json({ success: true, message: 'User ' + action + 'ed' });
    } catch (error) {
      return res.json({ success: false, message: 'Failed to suspend user' });
    }
  }

  async activateUser(req, res) {
    try {
      var user = await pool.query('SELECT phone FROM users WHERE id = $1', [req.params.id]);
      await pool.query('UPDATE users SET status = $1 WHERE id = $2', ['active', req.params.id]);
      await pool.query('INSERT INTO user_activity_log (user_id, phone, action, field_name, old_value, new_value, changed_by, ip_address) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', [req.params.id, user.rows[0] ? user.rows[0].phone : null, 'user_activated', 'status', 'suspended/banned', 'active', req.admin.id, req.ip]);
      return res.json({ success: true, message: 'User activated' });
    } catch (error) {
      return res.json({ success: false, message: 'Failed to activate user' });
    }
  }

  async warnUser(req, res) {
    try {
      var reason = req.body.reason;
      var user = await pool.query('SELECT phone, full_name FROM users WHERE id = $1', [req.params.id]);
      var phone = user.rows[0] ? user.rows[0].phone : null;
      await pool.query('UPDATE users SET warning_count = COALESCE(warning_count, 0) + 1 WHERE id = $1', [req.params.id]);
      await pool.query('INSERT INTO user_suspension_history (user_id, phone, action, reason, admin_id) VALUES ($1,$2,$3,$4,$5)', [req.params.id, phone, 'warning', reason, req.admin.id]);
      await pool.query('INSERT INTO user_activity_log (user_id, phone, action, field_name, old_value, new_value, changed_by, ip_address) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', [req.params.id, phone, 'warning_sent', 'warning', '', reason, req.admin.id, req.ip]);
      await pool.query("INSERT INTO user_alerts (user_id, title, message, type, icon, color, sent_by, is_dismissed) VALUES ($1,$2,$3,$4,$5,$6,$7,FALSE)", [req.params.id, 'Warning Received', 'Reason: ' + (reason || 'Policy violation'), 'warning', '⚡', 'color-warning', req.admin.id]);
      await NotificationsService.create(req.params.id, 'Warning', 'You received a warning. Reason: ' + reason, 'system');
      return res.json({ success: true, message: 'Warning sent to user' });
    } catch (error) {
      return res.json({ success: false, message: 'Failed to send warning' });
    }
  }

  async notifyUser(req, res) {
    try {
      var title = req.body.title;
      var message = req.body.message;
      if (!title || !message) return res.json({ success: false, message: 'Title and message required' });
      await NotificationsService.create(req.params.id, title, message, 'system');
      return res.json({ success: true, message: 'Notification sent' });
    } catch (error) {
      return res.json({ success: false, message: 'Failed to send notification' });
    }
  }

  async getFeatures(req, res) {
    try {
      var result = await pool.query('SELECT * FROM system_features');
      return res.json({ success: true, data: result.rows });
    } catch (error) {
      return res.json({ success: false, message: 'Failed to load features' });
    }
  }

  async toggleFeature(req, res) {
    try {
      await pool.query('UPDATE system_features SET is_enabled = $1 WHERE feature_key = $2', [req.body.isEnabled, req.params.featureKey]);
      return res.json({ success: true });
    } catch (error) {
      return res.json({ success: false, message: 'Failed to toggle' });
    }
  }

  async sendBroadcast(req, res) {
    try {
      var title = req.body.title;
      var message = req.body.message;
      var target = req.body.target;
      if (!title || !message) return res.json({ success: false, message: 'Title and message required' });
      var result = await AdminService.sendBroadcast(title, message, target, req.admin.id);
      var users;
      if (target === 'all') users = await pool.query("SELECT id FROM users WHERE status != 'banned'");
      else if (target === 'users') users = await pool.query("SELECT id FROM users WHERE status = 'active'");
      else users = await pool.query('SELECT id FROM users');
      var count = 0;
      for (var j = 0; j < users.rows.length; j++) {
        await pool.query('INSERT INTO user_alerts (user_id, title, message, type, icon, color, sent_by) VALUES ($1,$2,$3,$4,$5,$6,$7)', [users.rows[j].id, title, message, 'announcement', '📢', 'color-info', req.admin.id]);
        await NotificationsService.create(users.rows[j].id, title, message, 'system');
        count++;
      }
      return res.json({ success: true, data: result, message: 'Broadcast sent to ' + count + ' users' });
    } catch (error) {
      return res.json({ success: false, message: 'Failed to send broadcast' });
    }
  }

  async getBroadcasts(req, res) {
    try {
      var result = await pool.query('SELECT * FROM broadcasts WHERE is_active = TRUE ORDER BY created_at DESC LIMIT 20');
      return res.json({ success: true, data: result.rows });
    } catch (error) {
      return res.json({ success: false, message: 'Failed to load broadcasts' });
    }
  }

  async getLogs(req, res) {
    try {
      var result = await pool.query('SELECT al.*, a.username FROM admin_logs al JOIN admins a ON al.admin_id = a.id ORDER BY al.created_at DESC LIMIT 50');
      return res.json({ success: true, data: result.rows });
    } catch (error) {
      return res.json({ success: false, message: 'Failed to load logs' });
    }
  }

  async getWithdrawals(req, res) {
    try {
      var status = req.query.status || 'pending';
      var result = await pool.query('SELECT w.*, u.phone, u.full_name, ba.bank_name, ba.account_number FROM withdrawals w JOIN users u ON w.user_id = u.id JOIN bank_accounts ba ON w.bank_account_id = ba.id WHERE w.status = $1 ORDER BY w.created_at DESC LIMIT 50', [status]);
      return res.json({ success: true, data: result.rows });
    } catch (error) {
      return res.json({ success: false, message: 'Failed to load withdrawals' });
    }
  }

  async getSalaryHistory(req, res) {
    try {
      var result = await pool.query('SELECT ms.*, u.phone FROM manager_salaries ms JOIN users u ON ms.user_id = u.id ORDER BY ms.paid_at DESC LIMIT 50');
      return res.json({ success: true, data: result.rows });
    } catch (error) {
      return res.json({ success: false, message: 'Failed to load salary history' });
    }
  }

  async getAlertTemplates(req, res) {
    try {
      var result = await pool.query('SELECT * FROM alert_templates ORDER BY id');
      return res.json({ success: true, data: result.rows });
    } catch (error) {
      return res.json({ success: false, message: 'Failed to load templates' });
    }
  }

  async sendUserAlert(req, res) {
    try {
      var templateId = req.body.templateId;
      var customTitle = req.body.customTitle;
      var customMessage = req.body.customMessage;
      var title = customTitle || 'Alert';
      var message = customMessage || 'You have a new alert.';
      var type = 'info';
      var icon = '📢';
      var color = 'color-info';
      if (templateId) {
        var template = await pool.query('SELECT * FROM alert_templates WHERE id = $1', [templateId]);
        if (template.rows.length > 0) {
          var tp = template.rows[0];
          var user = await pool.query('SELECT full_name, phone FROM users WHERE id = $1', [req.params.id]);
          var userName = user.rows[0] ? (user.rows[0].full_name || user.rows[0].phone) : 'User';
          title = customTitle || tp.title_template;
          message = customMessage || tp.message_template;
          title = title.replace('{USER_NAME}', userName).replace('{APP_NAME}', 'Pay to Earn');
          message = message.replace('{USER_NAME}', userName).replace('{APP_NAME}', 'Pay to Earn').replace('{REASON}', customMessage || '');
          type = tp.type;
          icon = tp.icon;
          color = tp.color;
        }
      }
      await pool.query('INSERT INTO user_alerts (user_id, template_id, title, message, type, icon, color, sent_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', [req.params.id, templateId || null, title, message, type, icon, color, req.admin.id]);
      await NotificationsService.create(req.params.id, title, message, 'alert');
      return res.json({ success: true, message: 'Alert sent to user' });
    } catch (error) {
      return res.json({ success: false, message: 'Failed to send alert' });
    }
  }

  async sendBulkAlert(req, res) {
    try {
      var userIds = req.body.userIds;
      if (!userIds || !userIds.length) return res.json({ success: false, message: 'No users selected' });
      var count = 0;
      for (var k = 0; k < userIds.length; k++) {
        await pool.query('INSERT INTO user_alerts (user_id, title, message, type, icon, color, sent_by) VALUES ($1,$2,$3,$4,$5,$6,$7)', [userIds[k], req.body.customTitle || 'Alert', req.body.customMessage || 'You have a new alert.', 'info', '📢', 'color-info', req.admin.id]);
        count++;
      }
      return res.json({ success: true, message: 'Alert sent to ' + count + ' users' });
    } catch (error) {
      return res.json({ success: false, message: 'Failed to send alerts' });
    }
  }

  async sendAllAlert(req, res) {
    try {
      var users = await pool.query('SELECT id FROM users');
      var count = 0;
      for (var m = 0; m < users.rows.length; m++) {
        await pool.query('INSERT INTO user_alerts (user_id, title, message, type, icon, color, sent_by) VALUES ($1,$2,$3,$4,$5,$6,$7)', [users.rows[m].id, req.body.customTitle || 'Alert', req.body.customMessage || 'You have a new alert.', 'info', '📢', 'color-info', req.admin.id]);
        count++;
      }
      return res.json({ success: true, message: 'Alert sent to ' + count + ' users' });
    } catch (error) {
      return res.json({ success: false, message: 'Failed to send alerts' });
    }
  }

  async changeUserLevel(req, res) {
    try {
      var packageName = req.body.packageName;
      var userId = req.params.id;
      var user = await pool.query('SELECT phone, full_name FROM users WHERE id = $1', [userId]);
      if (user.rows.length === 0) return res.json({ success: false, message: 'User not found' });
      if (packageName === 'none') {
        await pool.query('UPDATE users SET active_package = NULL, package_expiry = NULL WHERE id = $1', [userId]);
        await pool.query('UPDATE user_packages SET is_active = FALSE WHERE user_id = $1', [userId]);
        return res.json({ success: true, message: 'Package removed' });
      }
      var pkg = await pool.query('SELECT * FROM packages WHERE name = $1', [packageName]);
      if (pkg.rows.length === 0) return res.json({ success: false, message: 'Invalid package' });
      await pool.query('UPDATE user_packages SET is_active = FALSE WHERE user_id = $1', [userId]);
      await pool.query("INSERT INTO user_packages (user_id, package_name, deposit_amount, started_at, expires_at) VALUES ($1,$2,$3,CURRENT_DATE,CURRENT_DATE + INTERVAL '30 days')", [userId, packageName, pkg.rows[0].deposit_amount]);
      await pool.query("UPDATE users SET active_package = $1, package_expiry = CURRENT_DATE + INTERVAL '30 days' WHERE id = $2", [packageName, userId]);
      return res.json({ success: true, message: 'Package changed to ' + packageName });
    } catch (error) {
      return res.json({ success: false, message: 'Failed to change package' });
    }
  }

  async addUserMoney(req, res) {
    try {
      var amount = req.body.amount;
      var reason = req.body.reason;
      var userId = req.params.id;
      if (!amount || amount <= 0) return res.json({ success: false, message: 'Invalid amount' });
      var MoneyService = require('../money/money.service');
      await MoneyService.credit(userId, amount, 'earnings', 'admin_gift', reason || 'Admin bonus');
      return res.json({ success: true, message: amount + ' ETB added to user earnings' });
    } catch (error) {
      return res.json({ success: false, message: 'Failed to add money' });
    }
  }

  // Manager rank methods from previous update
  async getUserManagerInfo(req, res) {
    try {
      var userId = req.params.id;
      var SalaryService = require('../salary/salary.service');
      var eligibility = await SalaryService.checkRankEligibility(userId);
      var userResult = await pool.query('SELECT manager_rank, full_name, phone FROM users WHERE id = $1', [userId]);
      if (userResult.rows.length === 0) return res.json({ success: false, message: 'User not found' });
      return res.json({ success: true, data: { currentRank: userResult.rows[0].manager_rank, teamCounts: eligibility.currentCounts, eligibleRanks: eligibility.eligibleRanks, highestEligibleRank: eligibility.highestRank } });
    } catch (error) {
      return res.json({ success: false, message: 'Failed to load manager info' });
    }
  }

  async assignManagerRank(req, res) {
    try {
      var rankName = req.body.rankName;
      var userId = req.params.id;
      var managerConfig = require('../../config/managers.json');
      var validRanks = managerConfig.ranks.map(function(r) { return r.name; });
      if (rankName !== 'none' && validRanks.indexOf(rankName) === -1) return res.json({ success: false, message: 'Invalid manager rank' });
      var newRank = rankName === 'none' ? null : rankName;
      await pool.query('UPDATE users SET manager_rank = $1 WHERE id = $2', [newRank, userId]);
      return res.json({ success: true, message: newRank ? 'Manager rank set' : 'Manager rank removed' });
    } catch (error) {
      return res.json({ success: false, message: 'Failed to assign rank' });
    }
  }


    /**
     * Get current admin's own permissions
     * No special permission required - any authenticated admin can see their own permissions
     * This solves the chicken-and-egg problem where admin needs admins.view to see their permissions
     * but they need permissions to know if they have admins.view
     */
    async getMyPermissions(req, res) {
    try {
        var adminId = req.admin.id;
        var roleResult = await pool.query('SELECT role FROM admins WHERE id = $1', [adminId]);

        if (roleResult.rows.length === 0) {
        return res.json({ success: false, message: 'Admin not found' });
        }

        var role = roleResult.rows[0].role;

        // Super admin gets all permissions
        if (role === 'super_admin') {
        return res.json({
            success: true,
            data: {
            role: role,
            permissions: ['*']
            }
        });
        }

        // Get this admin's permissions from database
        var permResult = await pool.query(
        'SELECT permission_code FROM admin_permissions WHERE admin_id = $1',
        [adminId]
        );

        var permissions = permResult.rows.map(function(r) { return r.permission_code; });

        return res.json({
        success: true,
        data: {
            role: role,
            permissions: permissions
        }
        });
    } catch (error) {
        console.error('getMyPermissions error:', error.message);
        return res.json({ success: false, message: 'Failed to load permissions' });
    }
    }
}

module.exports = new AdminController();