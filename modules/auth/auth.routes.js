const router = require('express').Router();
const AuthController = require('./auth.controller');
const { authenticateUser } = require('../../middleware/auth');
const { authLimiter } = require('../../middleware/rateLimit');

router.post('/register', authLimiter, AuthController.register);
router.post('/login', authLimiter, AuthController.login);
router.get('/profile', authenticateUser, AuthController.getProfile);
router.put('/profile', authenticateUser, AuthController.updateProfile);

module.exports = router;