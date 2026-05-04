const AdminService = require('./admin.service');
const { logAdminActivity } = require('../../utils/logger');
const NotificationsService = require('../notifications/notifications.service');
const Response = require('../../utils/response');
const pool = require('../../config/db');

class AdminController {
    async login(req, res, next) {
        try {
            const { username, password } = req.body;
            if (!username || !password) return Response.error(res, 'Username and password required', 400);
            const result = await AdminService.login(username, password);
            await logAdminActivity(result.admin.id, 'login', null, req.ip);
            return Response.success(res, result, 'Login successful');
        } catch (error) {
            if (error.message === 'Invalid credentials') return Response.error(res, error.message, 401);
            next(error);
        }
    }
    async createAdmin(req, res, next) {
        try {
            const { username, password, role } = req.body;
            const result = await AdminService.createAdmin(req.admin.id, username, password, role);
            await logAdminActivity(req.admin.id, 'admin_created', { username, role }, req.ip);
            return Response.success(res, result, 'Admin created', 201);
        } catch (error) { next(error); }
    }
    async getDashboard(req, res, next) {
        try { const stats = await AdminService.getDashboard(); return Response.success(res, stats); }
        catch (error) { next(error); }
    }
    async getUsers(req, res, next) {
        try {
            const { page, limit, search, status } = req.query;
            const result = await AdminService.getUsers(parseInt(page) || 1, parseInt(limit) || 20, search || '', status || '');
            return Response.paginated(res, result.users, result.pagination);
        } catch (error) { next(error); }
    }
    async toggleFeature(req, res, next) {
        try {
            const { featureKey } = req.params;
            const { isEnabled } = req.body;
            const result = await AdminService.toggleSystemFeature(featureKey, isEnabled, req.admin.id);
            await logAdminActivity(req.admin.id, 'feature_toggle', { featureKey, isEnabled }, req.ip);
            return Response.success(res, result, `Feature ${isEnabled ? 'enabled' : 'disabled'}`);
        } catch (error) { next(error); }
    }
    async sendBroadcast(req, res, next) {
        try {
            const { title, message, target } = req.body;
            if (!title || !message || !target) return Response.error(res, 'Title, message and target required', 400);
            const result = await AdminService.sendBroadcast(title, message, target, req.admin.id);
            
            // Send notification to all target users
            if (target === 'all' || target === 'users') {
                const [users] = await pool.query('SELECT id FROM users WHERE status = "active"');
                for (const user of users) {
                    await NotificationsService.create(user.id, title, message, 'system');
                }
            }
            if (target === 'all' || target === 'admins') {
                const [admins] = await pool.query('SELECT id FROM admins WHERE status = "active"');
                for (const admin of admins) {
                    await NotificationsService.create(admin.id, title, message, 'system');
                }
            }
            
            await logAdminActivity(req.admin.id, 'broadcast', { title, target }, req.ip);
            return Response.success(res, result, `Broadcast sent to ${target}`);
        } catch (error) { next(error); }
    }
    async getBroadcasts(req, res, next) {
        try { const broadcasts = await AdminService.getBroadcasts(); return Response.success(res, broadcasts); }
        catch (error) { next(error); }
    }
    async getFeatures(req, res, next) {
        try { const features = await AdminService.getSystemFeatures(); return Response.success(res, features); }
        catch (error) { next(error); }
    }
    async getLogs(req, res, next) {
        try { const { page, limit, adminId } = req.query; const logs = await AdminService.getLogs(parseInt(page) || 1, parseInt(limit) || 50, adminId || null); return Response.success(res, logs); }
        catch (error) { next(error); }
    }
}

module.exports = new AdminController();
