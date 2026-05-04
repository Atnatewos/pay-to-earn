const AuthService = require('./auth.service');
const Response = require('../../utils/response');

const AuthController = {
    async register(req, res, next) {
        try {
            const { phone, password, fullName, referralCode } = req.body;
            if (!phone || !password) return Response.error(res, 'Phone and password are required', 400);
            if (password.length < 6) return Response.error(res, 'Password must be at least 6 characters', 400);
            const result = await AuthService.register(phone, password, fullName, referralCode);
            return Response.success(res, result, 'Registration successful', 201);
        } catch (error) {
            if (error.message === 'Phone number already registered') return Response.error(res, error.message, 400);
            next(error);
        }
    },
    async login(req, res, next) {
        try {
            const { phone, password } = req.body;
            if (!phone || !password) return Response.error(res, 'Phone and password are required', 400);
            const result = await AuthService.login(phone, password);
            return Response.success(res, result, 'Login successful');
        } catch (error) {
            if (error.message.includes('Invalid') || error.message.includes('suspended')) return Response.error(res, error.message, 401);
            next(error);
        }
    },
    async getProfile(req, res, next) {
        try { const profile = await AuthService.getUserProfile(req.user.id); return Response.success(res, profile); }
        catch (error) { next(error); }
    },
    async updateProfile(req, res, next) {
        try {
            const { fullName, avatarUrl } = req.body;
            await AuthService.updateProfile(req.user.id, { fullName, avatarUrl });
            return Response.success(res, null, 'Profile updated');
        } catch (error) { next(error); }
    }
};

module.exports = AuthController;
