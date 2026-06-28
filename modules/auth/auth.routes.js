// modules/auth/auth.routes.js
const router = require('express').Router();
const AuthController = require('./auth.controller');
const { authenticateUser, authenticateAdmin } = require('../../middleware/auth');

// Public routes
router.post('/login', AuthController.login);
router.post('/register', AuthController.register);

// Protected routes
router.get('/me', authenticateUser, AuthController.getCurrentUser);
router.post('/logout', authenticateUser, AuthController.logout);

// Admin routes
router.post('/admin/login', AuthController.adminLogin);
router.get('/admin/me', authenticateAdmin, AuthController.getCurrentAdmin);

module.exports = router;