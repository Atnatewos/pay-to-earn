// modules/deposits/deposits.service.js
const pool = require('../../config/db');
const { COMMISSION, DEPOSIT } = require('../../config/constants');
const NotificationsService = require('../notifications/notifications.service');
const MoneyService = require('../money/money.service');

class DepositsService {
    async createDeposit(userId, amount, bankName, transactionId) {
        if (amount < DEPOSIT.MIN || amount > DEPOSIT.MAX) {
            throw new Error(`Deposit must be between ${DEPOSIT.MIN} and ${DEPOSIT.MAX} ETB`);
        }
        const result = await pool.query(
            'INSERT INTO deposits (user_id, amount, bank_name, transaction_id) VALUES ($1, $2, $3, $4) RETURNING id',
            [userId, amount, bankName, transactionId]
        );
        return { id: result.rows[0].id, status: 'pending' };
    }

    async verifyDeposit(depositId, adminId) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const depositResult = await client.query(
                'SELECT * FROM deposits WHERE id = $1 AND status = $2',
                [depositId, 'pending']
            );
            if (depositResult.rows.length === 0) throw new Error('Deposit not found or already processed');
            const deposit = depositResult.rows[0];

            await client.query(
                'UPDATE deposits SET status = $1, verified_by = $2, verified_at = NOW() WHERE id = $3',
                ['verified', adminId, depositId]
            );

            // Credit to CAPITAL (not earnings)
            await MoneyService.credit(deposit.user_id, deposit.amount, 'capital', 'deposit', 'Deposit verified', depositId);

            // Activate package
            const packageResult = await client.query(
                'SELECT name FROM packages WHERE deposit_amount = $1 AND is_active = TRUE',
                [deposit.amount]
            );
            if (packageResult.rows.length > 0) {
                const packageName = packageResult.rows[0].name;
                await client.query('UPDATE user_packages SET is_active = FALSE WHERE user_id = $1 AND is_active = TRUE', [deposit.user_id]);
                await client.query(
                    'INSERT INTO user_packages (user_id, package_name, deposit_amount, started_at, expires_at) VALUES ($1, $2, $3, CURRENT_DATE, CURRENT_DATE + INTERVAL \'30 days\')',
                    [deposit.user_id, packageName, deposit.amount]
                );
                await client.query(
                    'UPDATE users SET active_package = $1, package_expiry = CURRENT_DATE + INTERVAL \'30 days\' WHERE id = $2',
                    [packageName, deposit.user_id]
                );
            }

            // Distribute referral commissions
            await this.distributeReferralCommissions(client, deposit.user_id, deposit.amount);
            await client.query('COMMIT');

            await NotificationsService.create(
                deposit.user_id,
                'Deposit Verified ✅',
                `Your deposit of ${deposit.amount.toLocaleString()} ETB has been verified and added to your capital. Your package is now active.`,
                'deposit',
                depositId
            );

            return { success: true, message: 'Deposit verified and notifications sent' };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally { client.release(); }
    }

    async distributeReferralCommissions(client, userId, amount) {
        const uplineResult = await client.query(
            'SELECT ancestor_id, level FROM user_tree WHERE descendant_id = $1 AND level > 0 AND level <= 3 ORDER BY level ASC',
            [userId]
        );
        const rates = [COMMISSION.REFERRAL.LEVEL_1, COMMISSION.REFERRAL.LEVEL_2, COMMISSION.REFERRAL.LEVEL_3];

        for (const uplineUser of uplineResult.rows) {
            const rate = rates[uplineUser.level - 1];
            const commissionAmount = amount * rate;

            // Credit to UPLINE EARNINGS
            await MoneyService.credit(
                uplineUser.ancestor_id, 
                commissionAmount, 
                'earnings', 
                'commission', 
                `Referral commission level ${uplineUser.level} from user #${userId}`,
                userId
            );

            await client.query(
                'INSERT INTO commissions (from_user_id, to_user_id, type, level, amount, source_amount, percentage) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                [userId, uplineUser.ancestor_id, 'referral', uplineUser.level, commissionAmount, amount, rate * 100]
            );

            await NotificationsService.create(
                uplineUser.ancestor_id,
                'Referral Commission 💰',
                `You received ${commissionAmount.toFixed(2)} ETB from a Level ${uplineUser.level} referral deposit.`,
                'commission',
                userId
            );
        }
    }

    async rejectDeposit(depositId, adminId, reason) {
        const result = await pool.query(
            'UPDATE deposits SET status = $1, verified_by = $2, rejection_reason = $3, verified_at = NOW() WHERE id = $4 AND status = $5',
            ['rejected', adminId, reason, depositId, 'pending']
        );
        if (result.rowCount === 0) throw new Error('Deposit not found or already processed');
        const deposit = await pool.query('SELECT user_id, amount FROM deposits WHERE id = $1', [depositId]);
        if (deposit.rows.length > 0) {
            await NotificationsService.create(
                deposit.rows[0].user_id,
                'Deposit Rejected ❌',
                `Your deposit of ${deposit.rows[0].amount.toLocaleString()} ETB was rejected. Reason: ${reason}`,
                'deposit',
                depositId
            );
        }
        return { success: true, message: 'Deposit rejected' };
    }

    async getPendingDeposits(page = 1, limit = 20) {
        const offset = (page - 1) * limit;
        const depositsResult = await pool.query(
            `SELECT d.*, u.phone, u.full_name FROM deposits d JOIN users u ON d.user_id = u.id WHERE d.status = 'pending' ORDER BY d.created_at ASC LIMIT $1 OFFSET $2`,
            [limit, offset]
        );
        const countResult = await pool.query("SELECT COUNT(*) as total FROM deposits WHERE status = 'pending'");
        const total = parseInt(countResult.rows[0].total);
        return { deposits: depositsResult.rows, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
    }
}

module.exports = new DepositsService();