// modules/admin/admin.routes.js
const router = require('express').Router();
const AdminController = require('./admin.controller');
const { authenticateAdmin } = require('../../middleware/auth');
const { authLimiter } = require('../../middleware/rateLimit');
const { requirePermission } = require('../auth/auth.middleware');
const pool = require('../../config/db');

// Public
router.post('/login', authLimiter, AdminController.login);

// Dashboard
router.get('/dashboard', authenticateAdmin, AdminController.getDashboard);

// Users CRUD
router.get('/users', authenticateAdmin, AdminController.getUsers);
router.get('/users/:id', authenticateAdmin, AdminController.getUserById);
router.put('/users/:id', authenticateAdmin, AdminController.updateUser);
router.delete('/users/:id', authenticateAdmin, AdminController.deleteUser);
router.post('/users/:id/suspend', authenticateAdmin, AdminController.suspendUser);
router.post('/users/:id/activate', authenticateAdmin, AdminController.activateUser);
router.post('/users/:id/notify', authenticateAdmin, AdminController.notifyUser);

// Admins
router.post('/admins', authenticateAdmin, AdminController.createAdmin);

// Features
router.get('/features', authenticateAdmin, AdminController.getFeatures);
router.post('/features/:featureKey/toggle', authenticateAdmin, AdminController.toggleFeature);

// Broadcast
router.post('/broadcast', authenticateAdmin, AdminController.sendBroadcast);
router.get('/broadcasts', authenticateAdmin, AdminController.getBroadcasts);

// Logs
router.get('/logs', authenticateAdmin, AdminController.getLogs);

// Withdrawals
router.get('/withdrawals', authenticateAdmin, AdminController.getWithdrawals);

// Salary history
router.get('/salary/history', authenticateAdmin, AdminController.getSalaryHistory);

module.exports = router;