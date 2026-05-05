// modules/admin/admin.service.js
const pool = require('../../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT } = require('../../config/constants');

class AdminService {
    async login(username, password) {
        // Find admin by username
        const result = await pool.query(
            'SELECT * FROM admins WHERE username = $1 AND status = $2',
            [username, 'active']
        );

        if (result.rows.length === 0) {
            throw new Error('Invalid credentials');
        }

        const admin = result.rows[0];

        // Verify password
        const valid = await bcrypt.compare(password, admin.password_hash);
        if (!valid) {
            throw new Error('Invalid credentials');
        }

        // Update last login timestamp
        await pool.query(
            'UPDATE admins SET last_login = NOW() WHERE id = $1',
            [admin.id]
        );

        // Generate JWT token
        const token = jwt.sign(
            { id: admin.id, username: admin.username, role: admin.role, isAdmin: true },
            JWT.SECRET,
            { expiresIn: JWT.EXPIRES_IN }
        );

        return {
            token,
            admin: {
                id: admin.id,
                username: admin.username,
                role: admin.role
            }
        };
    }

    async createAdmin(creatorId, username, password, role) {
        // Check creator's role
        const creatorResult = await pool.query(
            'SELECT role FROM admins WHERE id = $1',
            [creatorId]
        );

        if (creatorResult.rows.length === 0) {
            throw new Error('Creator not found');
        }

        // Role hierarchy: super_admin(1) > senior_admin(2) > admin(3) > moderator(4)
        const roleHierarchy = {
            super_admin: 1,
            senior_admin: 2,
            admin: 3,
            moderator: 4
        };

        const creatorLevel = roleHierarchy[creatorResult.rows[0].role];
        const targetLevel = roleHierarchy[role];

        // Cannot create admin with equal or higher privileges
        if (targetLevel <= creatorLevel) {
            throw new Error('Cannot create admin with equal or higher role');
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 12);

        // Create admin
        const result = await pool.query(
            'INSERT INTO admins (username, password_hash, role, created_by) VALUES ($1, $2, $3, $4) RETURNING id',
            [username, passwordHash, role, creatorId]
        );

        return {
            id: result.rows[0].id,
            username,
            role
        };
    }

    async getDashboard() {
        // Get platform statistics
        const statsResult = await pool.query(`
            SELECT
                (SELECT COUNT(*) FROM users) as total_users,
                (SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '24 hours') as new_users_24h,
                (SELECT COUNT(*) FROM users WHERE status = 'active') as active_users,
                (SELECT COALESCE(SUM(total_deposited), 0) FROM users) as total_deposits,
                (SELECT COALESCE(SUM(amount), 0) FROM withdrawals WHERE status = 'completed') as total_withdrawn,
                (SELECT COUNT(*) FROM deposits WHERE status = 'pending') as pending_deposits,
                (SELECT COUNT(*) FROM withdrawals WHERE status = 'pending') as pending_withdrawals
        `);

        return statsResult.rows[0];
    }

    async getUsers(page = 1, limit = 20, search = '', status = '') {
        const offset = (page - 1) * limit;
        let query = 'SELECT id, phone, full_name, avatar_url, referral_code, status, balance, active_package, total_earned, total_deposited, created_at FROM users WHERE 1=1';
        const params = [];
        let paramIndex = 1;

        // Add search filter
        if (search) {
            query += ` AND (phone ILIKE $${paramIndex} OR full_name ILIKE $${paramIndex} OR referral_code ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        // Add status filter
        if (status) {
            query += ` AND status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        // Add order and pagination
        query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);

        const usersResult = await pool.query(query, params);

        // Get total count for pagination
        let countQuery = 'SELECT COUNT(*) as total FROM users WHERE 1=1';
        const countParams = [];
        let countParamIndex = 1;

        if (search) {
            countQuery += ` AND (phone ILIKE $${countParamIndex} OR full_name ILIKE $${countParamIndex} OR referral_code ILIKE $${countParamIndex})`;
            countParams.push(`%${search}%`);
            countParamIndex++;
        }

        if (status) {
            countQuery += ` AND status = $${countParamIndex}`;
            countParams.push(status);
        }

        const countResult = await pool.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].total);

        return {
            users: usersResult.rows,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }

    async toggleSystemFeature(featureKey, isEnabled, adminId) {
        await pool.query(
            'UPDATE system_features SET is_enabled = $1, updated_by = $2, updated_at = NOW() WHERE feature_key = $3',
            [isEnabled, adminId, featureKey]
        );

        return { featureKey, isEnabled };
    }

    async sendBroadcast(title, message, target, adminId) {
        const result = await pool.query(
            'INSERT INTO broadcasts (title, message, target, created_by) VALUES ($1, $2, $3, $4) RETURNING id',
            [title, message, target, adminId]
        );

        return { id: result.rows[0].id, title, target };
    }

    async getBroadcasts() {
        const result = await pool.query(
            `SELECT b.*, a.username 
             FROM broadcasts b 
             JOIN admins a ON b.created_by = a.id 
             WHERE b.is_active = TRUE 
             ORDER BY b.created_at DESC 
             LIMIT 20`
        );

        return result.rows;
    }

    async getSystemFeatures() {
        const result = await pool.query('SELECT * FROM system_features');
        return result.rows;
    }

    async getLogs(page = 1, limit = 50, adminId = null) {
        const offset = (page - 1) * limit;
        let query = `
            SELECT al.*, a.username 
            FROM admin_logs al 
            JOIN admins a ON al.admin_id = a.id 
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;

        if (adminId) {
            query += ` AND al.admin_id = $${paramIndex}`;
            params.push(adminId);
            paramIndex++;
        }

        query += ` ORDER BY al.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);

        return result.rows;
    }
}

module.exports = new AdminService();