// modules/giftcodes/giftcodes.service.js
const pool = require('../../config/db');

class GiftCodeService {
    async createCode(adminId, amount, maxUses = 1, expiresAt = null) {
        // Generate a unique gift code
        const code = await this.generateUniqueCode();

        // Insert the gift code into database
        const result = await pool.query(
            'INSERT INTO gift_codes (code, amount, max_uses, created_by, expires_at) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [code, amount, maxUses, adminId, expiresAt]
        );

        return {
            id: result.rows[0].id,
            code,
            amount,
            maxUses,
            expiresAt
        };
    }

    async generateUniqueCode() {
        // Generate random alphanumeric code
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code;
        let exists = true;

        // Keep generating until we find a unique code
        while (exists) {
            code = 'EARN-';
            for (let i = 0; i < 8; i++) {
                code += chars[Math.floor(Math.random() * chars.length)];
            }

            const result = await pool.query(
                'SELECT id FROM gift_codes WHERE code = $1',
                [code]
            );

            exists = result.rows.length > 0;
        }

        return code;
    }

    async redeemCode(userId, code) {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Find the gift code
            const codeResult = await client.query(
                'SELECT * FROM gift_codes WHERE code = $1 AND is_active = TRUE',
                [code]
            );

            if (codeResult.rows.length === 0) {
                throw new Error('Invalid or expired gift code');
            }

            const giftCode = codeResult.rows[0];

            // Check if code has expired
            if (giftCode.expires_at && new Date(giftCode.expires_at) < new Date()) {
                throw new Error('This gift code has expired');
            }

            // Check if code has reached max uses
            if (giftCode.times_used >= giftCode.max_uses) {
                throw new Error('This gift code has reached its maximum uses');
            }

            // Check if user already redeemed this code
            const existingResult = await client.query(
                'SELECT id FROM gift_code_redemptions WHERE gift_code_id = $1 AND user_id = $2',
                [giftCode.id, userId]
            );

            if (existingResult.rows.length > 0) {
                throw new Error('You have already redeemed this code');
            }

            // Credit the amount to user
            await client.query(
                'UPDATE users SET balance = balance + $1, total_earned = total_earned + $1 WHERE id = $2',
                [giftCode.amount, userId]
            );

            // Record the redemption
            await client.query(
                'INSERT INTO gift_code_redemptions (gift_code_id, user_id, amount_received) VALUES ($1, $2, $3)',
                [giftCode.id, userId, giftCode.amount]
            );

            // Update usage count
            await client.query(
                'UPDATE gift_codes SET times_used = times_used + 1 WHERE id = $1',
                [giftCode.id]
            );

            // Deactivate if max uses reached
            if (giftCode.times_used + 1 >= giftCode.max_uses) {
                await client.query(
                    'UPDATE gift_codes SET is_active = FALSE WHERE id = $1',
                    [giftCode.id]
                );
            }

            // Get updated balance for transaction record
            const userResult = await client.query(
                'SELECT balance FROM users WHERE id = $1',
                [userId]
            );

            // Record transaction in ledger
            await client.query(
                `INSERT INTO transactions (user_id, type, amount, balance_after, category, reference_id, description)
                 VALUES ($1, 'credit', $2, $3, 'gift_code', $4, $5)`,
                [userId, giftCode.amount, userResult.rows[0].balance, giftCode.id, 'Gift code redeemed']
            );

            await client.query('COMMIT');

            return {
                success: true,
                amount: giftCode.amount,
                message: `Successfully redeemed ${giftCode.amount} ETB!`
            };

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async getAdminCodes(adminId, page = 1, limit = 20) {
        const offset = (page - 1) * limit;

        // Get codes created by this admin
        const result = await pool.query(
            'SELECT * FROM gift_codes WHERE created_by = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
            [adminId, limit, offset]
        );

        return result.rows;
    }

    async getAllCodes(page = 1, limit = 20) {
        const offset = (page - 1) * limit;

        // Get all codes with creator username
        const result = await pool.query(
            `SELECT gc.*, a.username as created_by_name 
             FROM gift_codes gc 
             JOIN admins a ON gc.created_by = a.id 
             ORDER BY gc.created_at DESC 
             LIMIT $1 OFFSET $2`,
            [limit, offset]
        );

        return result.rows;
    }
}

module.exports = new GiftCodeService();