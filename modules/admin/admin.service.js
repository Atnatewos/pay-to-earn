// modules/admin/admin.service.js
const pool = require('../../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { JWT } = require('../../config/constants');

class AdminService {
    async login(username, password) {
        const [admins] = await pool.query('SELECT * FROM admins WHERE username = ? AND status = "active"', [username]);
        if (admins.length === 0) throw new Error('Invalid credentials');
        const admin = admins[0];
        const valid = await bcrypt.compare(password, admin.password_hash);
        if (!valid) throw new Error('Invalid credentials');
        await pool.query('UPDATE admins SET last_login = NOW() WHERE id = ?', [admin.id]);
        const token = jwt.sign({ id: admin.id, username: admin.username, role: admin.role, isAdmin: true }, JWT.SECRET, { expiresIn: JWT.EXPIRES_IN });
        return { token, admin: { id: admin.id, username: admin.username, role: admin.role } };
    }

    async createAdmin(creatorId, username, password, role) {
        const [creator] = await pool.query('SELECT role FROM admins WHERE id = ?', [creatorId]);
        if (creator.length === 0) throw new Error('Creator not found');
        const roleHierarchy = { super_admin: 1, senior_admin: 2, admin: 3, moderator: 4 };
        if (roleHierarchy[role] <= roleHierarchy[creator[0].role]) throw new Error('Cannot create admin with equal or higher role');
        const passwordHash = await bcrypt.hash(password, 12);
        const [result] = await pool.query('INSERT INTO admins (username, password_hash, role, created_by) VALUES (?, ?, ?, ?)', [username, passwordHash, role, creatorId]);
        return { id: result.insertId, username, role };
    }

    async getDashboard() {
        const [[stats]] = await pool.query(`
            SELECT
                (SELECT COUNT(*) FROM users) as total_users,
                (SELECT COUNT(*) FROM users WHERE created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)) as new_users_24h,
                (SELECT COUNT(*) FROM users WHERE status = 'active') as active_users,
                (SELECT COALESCE(SUM(total_deposited), 0) FROM users) as total_deposits,
                (SELECT COALESCE(SUM(amount), 0) FROM withdrawals WHERE status = 'completed') as total_withdrawn,
                (SELECT COUNT(*) FROM deposits WHERE status = 'pending') as pending_deposits,
                (SELECT COUNT(*) FROM withdrawals WHERE status = 'pending') as pending_withdrawals
        `);
        return stats;
    }

    async getUsers(page = 1, limit = 20, search = '', status = '') {
        const offset = (page - 1) * limit;
        let query = 'SELECT id, phone, full_name, avatar_url, referral_code, status, balance, active_package, total_earned, total_deposited, created_at FROM users WHERE 1=1';
        const params = [];
        if (search) { query += ' AND (phone LIKE ? OR full_name LIKE ? OR referral_code LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
        if (status) { query += ' AND status = ?'; params.push(status); }
        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);
        const [users] = await pool.query(query, params);
        const countQuery = query.replace(/SELECT .+ FROM/, 'SELECT COUNT(*) as total FROM').split('LIMIT')[0];
        const [[{ total }]] = await pool.query(countQuery, params.slice(0, -2));
        return { users, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
    }

    async toggleSystemFeature(featureKey, isEnabled, adminId) {
        await pool.query('UPDATE system_features SET is_enabled = ?, updated_by = ? WHERE feature_key = ?', [isEnabled, adminId, featureKey]);
        return { featureKey, isEnabled };
    }

    async sendBroadcast(title, message, target, adminId) {
        const [result] = await pool.query('INSERT INTO broadcasts (title, message, target, created_by) VALUES (?, ?, ?, ?)', [title, message, target, adminId]);
        return { id: result.insertId, title, target };
    }

    async getBroadcasts() {
        const [broadcasts] = await pool.query(`SELECT b.*, a.username FROM broadcasts b JOIN admins a ON b.created_by = a.id WHERE b.is_active = TRUE ORDER BY b.created_at DESC LIMIT 20`);
        return broadcasts;
    }

    async getSystemFeatures() {
        const [features] = await pool.query('SELECT * FROM system_features');
        return features;
    }

    async getLogs(page = 1, limit = 50, adminId = null) {
        const offset = (page - 1) * limit;
        let query = 'SELECT al.*, a.username FROM admin_logs al JOIN admins a ON al.admin_id = a.id WHERE 1=1';
        const params = [];
        if (adminId) { query += ' AND al.admin_id = ?'; params.push(adminId); }
        query += ' ORDER BY al.created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);
        const [logs] = await pool.query(query, params);
        return logs;
    }
}

module.exports = new AdminService();