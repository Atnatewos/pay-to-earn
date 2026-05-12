// modules/admin/admin.routes.js

/**
 * Admin Routes
 * All admin endpoints with permission-based access control
 * Super admin has access to admin management endpoints
 */
const router = require('express').Router();
const AdminController = require('./admin.controller');
const { authenticateAdmin } = require('../../middleware/auth');
const { authLimiter } = require('../../middleware/rateLimit');
const { requirePermission } = require('../auth/auth.middleware');

// Public
router.post('/login', authLimiter, AdminController.login);

// Dashboard
router.get('/dashboard', authenticateAdmin, requirePermission('dashboard.view'), AdminController.getDashboard);

// Users CRUD
router.get('/users', authenticateAdmin, requirePermission('users.view'), AdminController.getUsers);
router.get('/users/:id', authenticateAdmin, requirePermission('users.view'), AdminController.getUserById);
router.put('/users/:id', authenticateAdmin, requirePermission('users.edit'), AdminController.updateUser);
router.delete('/users/:id', authenticateAdmin, requirePermission('users.delete'), AdminController.deleteUser);
router.post('/users/:id/suspend', authenticateAdmin, requirePermission('users.suspend'), AdminController.suspendUser);
router.post('/users/:id/activate', authenticateAdmin, AdminController.activateUser);
router.post('/users/:id/warn', authenticateAdmin, requirePermission('users.warn'), AdminController.warnUser);
router.post('/users/:id/notify', authenticateAdmin, requirePermission('users.notify'), AdminController.notifyUser);
router.post('/users/:id/alert', authenticateAdmin, requirePermission('users.alert'), AdminController.sendUserAlert);
router.post('/users/:id/level', authenticateAdmin, requirePermission('users.level'), AdminController.changeUserLevel);
router.post('/users/:id/add-money', authenticateAdmin, requirePermission('users.add_money'), AdminController.addUserMoney);
router.get('/users/:id/manager-info', authenticateAdmin, requirePermission('users.manager_rank'), AdminController.getUserManagerInfo);
router.post('/users/:id/manager-rank', authenticateAdmin, requirePermission('users.manager_rank'), AdminController.assignManagerRank);

// Admin Management (super_admin only via permission)
router.get('/admins', authenticateAdmin, requirePermission('admins.view'), AdminController.listAdmins);
router.post('/admins', authenticateAdmin, requirePermission('admins.create'), AdminController.createAdmin);
router.put('/admins/:id', authenticateAdmin, requirePermission('admins.edit'), AdminController.updateAdmin);
router.delete('/admins/:id', authenticateAdmin, requirePermission('admins.delete'), AdminController.deleteAdmin);
router.post('/admins/:id/status', authenticateAdmin, requirePermission('admins.edit'), AdminController.toggleAdminStatus);
router.put('/admins/:id/permissions', authenticateAdmin, requirePermission('admins.permissions'), AdminController.updateAdminPermissions);
router.get('/permissions', authenticateAdmin, AdminController.getPermissionsList);

// Features
router.get('/features', authenticateAdmin, requirePermission('features.toggle'), AdminController.getFeatures);
router.post('/features/:featureKey/toggle', authenticateAdmin, requirePermission('features.toggle'), AdminController.toggleFeature);

// Broadcast
router.post('/broadcast', authenticateAdmin, requirePermission('broadcast.send'), AdminController.sendBroadcast);
router.get('/broadcasts', authenticateAdmin, AdminController.getBroadcasts);

// Logs
router.get('/logs', authenticateAdmin, requirePermission('logs.view'), AdminController.getLogs);

// Withdrawals
router.get('/withdrawals', authenticateAdmin, requirePermission('withdrawals.view'), AdminController.getWithdrawals);

// Salary
router.get('/salary/history', authenticateAdmin, requirePermission('salaries.view'), AdminController.getSalaryHistory);

// Alerts
router.get('/alerts/templates', authenticateAdmin, AdminController.getAlertTemplates);
router.post('/alerts/bulk', authenticateAdmin, requirePermission('users.alert'), AdminController.sendBulkAlert);
router.post('/alerts/all', authenticateAdmin, requirePermission('users.alert'), AdminController.sendAllAlert);

module.exports = router;