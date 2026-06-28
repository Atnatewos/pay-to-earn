// modules/giftcodes/giftcodes.service.js
const pool = require('../../config/db');
const MoneyService = require('../money/money.service');
var messagesConfig = require('../../config/messages.json');

class GiftCodeService {
    async createCode(adminId, amount, maxUses = 1, expiresAt = null) {
        const code = await this.generateUniqueCode();

        const result = await pool.query(
            'INSERT INTO gift_codes (code, amount, max_uses, created_by, expires_at) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [code, amount, maxUses, adminId, expiresAt]\r
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
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code;
        let exists = true;

        while (exists) {
            code = 'EARN-';
            for (let i = 0; i < 8; i++) {
                code += chars[Math.floor(Math.random() * chars.length)];
            }
            const result = await pool.query('SELECT id FROM gift_codes WHERE code = $1', [code]);
            exists = result.rows.length > 0;
        }

        return code;
    }

    async redeemCode(userId, inputCode) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Fetch code and check active status
            const codeResult = await client.query(
                'SELECT * FROM gift_codes WHERE code = $1 FOR UPDATE',
                [inputCode.trim().toUpperCase()]
            );

            if (codeResult.rows.length === 0 || !codeResult.rows[0].is_active) {
                throw new Error(messagesConfig.giftCode.invalid);
            }

            const giftCode = codeResult.rows[0];

            // 2. Check system expiry date
            if (giftCode.expires_at && new Date(giftCode.expires_at) < new Date()) {
                // Instantly deactivate if checked after expiry boundary
                await client.query('UPDATE gift_codes SET is_active = FALSE WHERE id = $1', [giftCode.id]);
                throw new Error(messagesConfig.giftCode.expired);
            }

            // 3. Check allocation usage counts
            if (giftCode.times_used >= giftCode.max_uses) {
                throw new Error(messagesConfig.giftCode.maxUses);
            }

            // 4. Prevent users from duplicating redemptions on single instances
            const usageCheck = await client.query(
                'SELECT id FROM gift_code_usages WHERE user_id = $1 AND gift_code_id = $2',
                [userId, giftCode.id]
            );

            if (usageCheck.rows.length > 0) {
                throw new Error(messagesConfig.giftCode.alreadyRedeemed);
            }

            // 5. Append lookup usage audit log row
            await client.query(
                'INSERT INTO gift_code_usages (user_id, gift_code_id) VALUES ($1, $2)',
                [userId, giftCode.id]
            );

            // 6. Increment internal sequence pointer counter logs
            await client.query(
                'UPDATE gift_codes SET times_used = times_used + 1, updated_at = NOW() WHERE id = $1',
                [giftCode.id]
            );

            // 7. Credit amount to earnings account balance instance via standard ledger rules
            await MoneyService.credit(
                userId,
                parseFloat(giftCode.amount),
                'earnings',
                'gift_code',
                `Redeemed bonus coupon promotional code string layout: ${giftCode.code}`,
                giftCode.id
            );

            // Deactivate if max uses reached
            if (giftCode.times_used + 1 >= giftCode.max_uses) {
                await client.query(
                    'UPDATE gift_codes SET is_active = FALSE WHERE id = $1',
                    [giftCode.id]
                );
            }

            await client.query('COMMIT');

            return {
                success: true,
                amount: giftCode.amount,
                message: messagesConfig.giftCode.redeemed.replace('{amount}', giftCode.amount)
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
        const result = await pool.query(
            'SELECT * FROM gift_codes WHERE created_by = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
            [adminId, limit, offset]\r
        );
        return result.rows;
    }

    async getAllCodes(page = 1, limit = 20) {
        const offset = (page - 1) * limit;
        const result = await pool.query(
            `SELECT gc.*, a.username as created_by_name 
             FROM gift_codes gc 
             JOIN admins a ON gc.created_by = a.id 
             ORDER BY gc.created_at DESC LIMIT $1 OFFSET $2`,
            [limit, offset]
        );
        return result.rows;
    }
}

module.exports = new GiftCodeService();