// modules/auth/auth.service.js
const pool = require('../../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT, INTERN } = require('../../config/constants');
const { generateReferralCode } = require('../../utils/referralGen');

class AuthService {
    async register(phone, password, fullName, referralCode = null) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const existing = await client.query('SELECT id FROM users WHERE phone = $1', [phone]);
            if (existing.rows.length > 0) throw new Error('Phone number already registered');

            const passwordHash = await bcrypt.hash(password, 12);

            let code;
            while (true) {
                code = generateReferralCode();
                const result = await client.query('SELECT id FROM users WHERE referral_code = $1', [code]);
                if (result.rows.length === 0) break;
            }

            let referredBy = null, parentId = null;
            if (referralCode) {
                const referrer = await client.query('SELECT id FROM users WHERE referral_code = $1', [referralCode]);
                if (referrer.rows.length > 0) { referredBy = referrer.rows[0].id; parentId = referrer.rows[0].id; }
            }

            const result = await client.query(
                `INSERT INTO users (phone, full_name, password_hash, referral_code, referred_by, parent_id, active_package, package_expiry)
                 VALUES ($1, $2, $3, $4, $5, $6, 'Intern', CURRENT_DATE + INTERVAL '3 days') RETURNING id`,
                [phone, fullName || null, passwordHash, code, referredBy, parentId]
            );
            const userId = result.rows[0].id;

            await client.query('INSERT INTO user_tree (ancestor_id, descendant_id, level) VALUES ($1, $1, 0)', [userId]);
            if (parentId) await this.buildTreeRelations(client, userId, parentId);

            await client.query('INSERT INTO daily_tasks (user_id, task_date, tasks_allocated) VALUES ($1, CURRENT_DATE, $2)', [userId, INTERN.TASKS_PER_DAY]);
            await client.query('COMMIT');

            const token = jwt.sign({ id: userId, phone, isAdmin: false }, JWT.SECRET, { expiresIn: JWT.EXPIRES_IN });
            return { token, user: { id: userId, phone, fullName, referralCode: code, activePackage: 'Intern', balance: 0 } };
        } catch (error) { await client.query('ROLLBACK'); throw error; }
        finally { client.release(); }
    }

    async buildTreeRelations(client, userId, parentId) {
        await client.query('INSERT INTO user_tree (ancestor_id, descendant_id, level) VALUES ($1, $2, 1)', [parentId, userId]);
        const ancestors = await client.query('SELECT ancestor_id, level FROM user_tree WHERE descendant_id = $1 AND level > 0 AND level < 3', [parentId]);
        for (const ancestor of ancestors.rows) {
            const newLevel = ancestor.level + 1;
            if (newLevel <= 3) await client.query('INSERT INTO user_tree (ancestor_id, descendant_id, level) VALUES ($1, $2, $3)', [ancestor.ancestor_id, userId, newLevel]);
        }
    }

    async login(phone, password) {
        const result = await pool.query('SELECT * FROM users WHERE phone = $1', [phone]);
        if (result.rows.length === 0) throw new Error('Invalid phone or password');
        const user = result.rows[0];
        if (user.status !== 'active') throw new Error('Account is suspended.');
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) throw new Error('Invalid phone or password');
        const token = jwt.sign({ id: user.id, phone: user.phone, isAdmin: false }, JWT.SECRET, { expiresIn: JWT.EXPIRES_IN });
        return { token, user: { id: user.id, phone: user.phone, fullName: user.full_name, avatarUrl: user.avatar_url, balance: user.balance, activePackage: user.active_package } };
    }

    async getUserProfile(userId) {
        const result = await pool.query('SELECT id, phone, full_name, avatar_url, referral_code, status, balance, total_earned, total_deposited, active_package, package_expiry, created_at FROM users WHERE id = $1', [userId]);
        if (result.rows.length === 0) throw new Error('User not found');
        return result.rows[0];
    }

    async updateProfile(userId, data) {
        const fields = [];
        const values = [];
        let i = 1;
        if (data.fullName !== undefined) { fields.push(`full_name = $${i++}`); values.push(data.fullName); }
        if (data.avatarUrl !== undefined) { fields.push(`avatar_url = $${i++}`); values.push(data.avatarUrl); }
        if (fields.length === 0) return { success: true };
        values.push(userId);
        await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = $${i}`, values);
        return { success: true };
    }
}

module.exports = new AuthService();