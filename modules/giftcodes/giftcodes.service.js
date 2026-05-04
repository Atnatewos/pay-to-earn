// modules/giftcodes/giftcodes.service.js
const pool = require('../../config/db');

class GiftCodeService {
    async createCode(adminId, amount, maxUses = 1, expiresAt = null) {
        const code = await this.generateUniqueCode();
        
        const [result] = await pool.query(
            'INSERT INTO gift_codes (code, amount, max_uses, created_by, expires_at) VALUES (?, ?, ?, ?, ?)',
            [code, amount, maxUses, adminId, expiresAt]
        );

        return {
            id: result.insertId,
            code,
            amount,
            maxUses,
            expiresAt
        };
    }

    async generateUniqueCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code;
        let exists = true;
        
        while (exists) {
            code = 'EARN-';
            for (let i = 0; i < 8; i++) {
                code += chars[Math.floor(Math.random() * chars.length)];
            }
            const [result] = await pool.query('SELECT id FROM gift_codes WHERE code = ?', [code]);
            exists = result.length > 0;
        }
        
        return code;
    }

    async redeemCode(userId, code) {
        const connection = await pool.getConnection();
        
        try {
            await connection.beginTransaction();

            const [codes] = await connection.query(
                'SELECT * FROM gift_codes WHERE code = ? AND is_active = TRUE',
                [code]
            );

            if (codes.length === 0) {
                throw new Error('Invalid or expired gift code');
            }

            const giftCode = codes[0];

            if (giftCode.expires_at && new Date(giftCode.expires_at) < new Date()) {
                throw new Error('This gift code has expired');
            }

            if (giftCode.times_used >= giftCode.max_uses) {
                throw new Error('This gift code has reached its maximum uses');
            }

            // Check if user already redeemed
            const [existing] = await connection.query(
                'SELECT id FROM gift_code_redemptions WHERE gift_code_id = ? AND user_id = ?',
                [giftCode.id, userId]
            );

            if (existing.length > 0) {
                throw new Error('You have already redeemed this code');
            }

            // Credit user
            await connection.query(
                'UPDATE users SET balance = balance + ?, total_earned = total_earned + ? WHERE id = ?',
                [giftCode.amount, giftCode.amount, userId]
            );

            // Record redemption
            await connection.query(
                'INSERT INTO gift_code_redemptions (gift_code_id, user_id, amount_received) VALUES (?, ?, ?)',
                [giftCode.id, userId, giftCode.amount]
            );

            // Update usage count
            await connection.query(
                'UPDATE gift_codes SET times_used = times_used + 1 WHERE id = ?',
                [giftCode.id]
            );

            // Deactivate if max uses reached
            if (giftCode.times_used + 1 >= giftCode.max_uses) {
                await connection.query(
                    'UPDATE gift_codes SET is_active = FALSE WHERE id = ?',
                    [giftCode.id]
                );
            }

            // Record transaction
            const [userBalance] = await connection.query(
                'SELECT balance FROM users WHERE id = ?',
                [userId]
            );

            await connection.query(
                `INSERT INTO transactions (user_id, type, amount, balance_after, category, reference_id, description)
                 VALUES (?, 'credit', ?, ?, 'gift_code', ?, ?)`,
                [userId, giftCode.amount, userBalance[0].balance, giftCode.id, 'Gift code redeemed']
            );

            await connection.commit();

            return {
                success: true,
                amount: giftCode.amount,
                message: `Successfully redeemed ${giftCode.amount} ETB!`
            };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    async getAdminCodes(adminId, page = 1, limit = 20) {
        const offset = (page - 1) * limit;
        const [codes] = await pool.query(
            'SELECT * FROM gift_codes WHERE created_by = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
            [adminId, limit, offset]
        );
        return codes;
    }

    async getAllCodes(page = 1, limit = 20) {
        const offset = (page - 1) * limit;
        const [codes] = await pool.query(
            `SELECT gc.*, a.username as created_by_name 
             FROM gift_codes gc 
             JOIN admins a ON gc.created_by = a.id 
             ORDER BY gc.created_at DESC 
             LIMIT ? OFFSET ?`,
            [limit, offset]
        );
        return codes;
    }
}

module.exports = new GiftCodeService();