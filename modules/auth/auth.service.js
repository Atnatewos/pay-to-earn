// modules/auth/auth.service.js
const pool = require('../../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { JWT, INTERN } = require('../../config/constants');
const { generateReferralCode } = require('../../utils/referralGen');

class AuthService {
    async register(phone, password, fullName, referralCode = null) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            const [existing] = await connection.query('SELECT id FROM users WHERE phone = ?', [phone]);
            if (existing.length > 0) throw new Error('Phone number already registered');
            const passwordHash = await bcrypt.hash(password, 12);
            let code, codeExists = true;
            while (codeExists) {
                code = generateReferralCode();
                const [result] = await connection.query('SELECT id FROM users WHERE referral_code = ?', [code]);
                codeExists = result.length > 0;
            }
            let referredBy = null, parentId = null;
            if (referralCode) {
                const [referrer] = await connection.query('SELECT id FROM users WHERE referral_code = ?', [referralCode]);
                if (referrer.length > 0) { referredBy = referrer[0].id; parentId = referrer[0].id; }
            }
            const [result] = await connection.query(
                `INSERT INTO users (phone, full_name, password_hash, referral_code, referred_by, parent_id, active_package, package_expiry)
                 VALUES (?, ?, ?, ?, ?, ?, 'Intern', DATE_ADD(CURDATE(), INTERVAL ? DAY))`,
                [phone, fullName || null, passwordHash, code, referredBy, parentId, INTERN.DURATION_DAYS]
            );
            const userId = result.insertId;
            await connection.query('INSERT INTO user_tree (ancestor_id, descendant_id, level) VALUES (?, ?, 0)', [userId, userId]);
            if (parentId) await this.buildTreeRelations(connection, userId, parentId);
            const today = new Date().toISOString().split('T')[0];
            await connection.query('INSERT INTO daily_tasks (user_id, task_date, tasks_allocated) VALUES (?, ?, ?)', [userId, today, INTERN.TASKS_PER_DAY]);
            await connection.commit();
            const token = jwt.sign({ id: userId, phone, isAdmin: false }, JWT.SECRET, { expiresIn: JWT.EXPIRES_IN });
            return { token, user: { id: userId, phone, fullName, referralCode: code, activePackage: 'Intern', balance: 0 } };
        } catch (error) { await connection.rollback(); throw error; }
        finally { connection.release(); }
    }

    async buildTreeRelations(connection, userId, parentId) {
        await connection.query('INSERT INTO user_tree (ancestor_id, descendant_id, level) VALUES (?, ?, 1)', [parentId, userId]);
        const [ancestors] = await connection.query('SELECT ancestor_id, level FROM user_tree WHERE descendant_id = ? AND level > 0 AND level < 3', [parentId]);
        for (const ancestor of ancestors) {
            const newLevel = ancestor.level + 1;
            if (newLevel <= 3) await connection.query('INSERT INTO user_tree (ancestor_id, descendant_id, level) VALUES (?, ?, ?)', [ancestor.ancestor_id, userId, newLevel]);
        }
    }

    async login(phone, password) {
        const [users] = await pool.query('SELECT * FROM users WHERE phone = ?', [phone]);
        if (users.length === 0) throw new Error('Invalid phone or password');
        const user = users[0];
        if (user.status !== 'active') throw new Error('Account is suspended.');
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) throw new Error('Invalid phone or password');
        const token = jwt.sign({ id: user.id, phone: user.phone, isAdmin: false }, JWT.SECRET, { expiresIn: JWT.EXPIRES_IN });
        return { token, user: { id: user.id, phone: user.phone, fullName: user.full_name, avatarUrl: user.avatar_url, balance: user.balance, activePackage: user.active_package } };
    }

    async getUserProfile(userId) {
        const [users] = await pool.query(
            'SELECT id, phone, full_name, avatar_url, referral_code, status, balance, total_earned, total_deposited, active_package, package_expiry, created_at FROM users WHERE id = ?',
            [userId]
        );
        if (users.length === 0) throw new Error('User not found');
        return users[0];
    }

    async updateProfile(userId, data) {
        const updates = [], values = [];
        if (data.fullName !== undefined) { updates.push('full_name = ?'); values.push(data.fullName); }
        if (data.avatarUrl !== undefined) { updates.push('avatar_url = ?'); values.push(data.avatarUrl); }
        if (updates.length === 0) return { success: true };
        values.push(userId);
        await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
        return { success: true };
    }
}

module.exports = new AuthService();