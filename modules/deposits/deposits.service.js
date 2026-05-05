// modules/deposits/deposits.service.js
const pool = require('../../config/db');
const { COMMISSION, DEPOSIT } = require('../../config/constants');
const NotificationsService = require('../notifications/notifications.service');

class DepositsService {
    async createDeposit(userId, amount, bankName, transactionId) {
        // Validate amount limits
        if (amount < DEPOSIT.MIN || amount > DEPOSIT.MAX) {
            throw new Error(`Deposit must be between ${DEPOSIT.MIN} and ${DEPOSIT.MAX} ETB`);
        }

        // Insert deposit request
        const result = await pool.query(
            'INSERT INTO deposits (user_id, amount, bank_name, transaction_id) VALUES ($1, $2, $3, $4) RETURNING id',
            [userId, amount, bankName, transactionId]
        );

        return { id: result.rows[0].id, status: 'pending' };
    }

    async verifyDeposit(depositId, adminId) {
        const client = await pool.connect();

        try {
            // Start transaction
            await client.query('BEGIN');

            // Get deposit and verify it's pending
            const depositResult = await client.query(
                'SELECT * FROM deposits WHERE id = $1 AND status = $2',
                [depositId, 'pending']
            );

            if (depositResult.rows.length === 0) {
                throw new Error('Deposit not found or already processed');
            }

            const deposit = depositResult.rows[0];

            // Update deposit status to verified
            await client.query(
                'UPDATE deposits SET status = $1, verified_by = $2, verified_at = NOW() WHERE id = $3',
                ['verified', adminId, depositId]
            );

            // Credit user balance and update total deposited
            await client.query(
                'UPDATE users SET balance = balance + $1, total_deposited = total_deposited + $1 WHERE id = $2',
                [deposit.amount, deposit.user_id]
            );

            // Get updated balance for transaction record
            const userBalance = await client.query(
                'SELECT balance FROM users WHERE id = $1',
                [deposit.user_id]
            );

            // Record transaction in ledger
            await client.query(
                `INSERT INTO transactions (user_id, type, amount, balance_after, category, reference_id, description)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [deposit.user_id, 'credit', deposit.amount, userBalance.rows[0].balance, 'deposit', depositId, 'Deposit verified']
            );

            // Find matching package for the deposit amount
            const packageResult = await client.query(
                'SELECT name FROM packages WHERE deposit_amount = $1 AND is_active = TRUE',
                [deposit.amount]
            );

            // Activate package if amount matches a package
            if (packageResult.rows.length > 0) {
                const packageName = packageResult.rows[0].name;

                // Deactivate any existing active package
                await client.query(
                    'UPDATE user_packages SET is_active = FALSE WHERE user_id = $1 AND is_active = TRUE',
                    [deposit.user_id]
                );

                // Create new active package record
                await client.query(
                    `INSERT INTO user_packages (user_id, package_name, deposit_amount, started_at, expires_at)
                     VALUES ($1, $2, $3, CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days')`,
                    [deposit.user_id, packageName, deposit.amount]
                );

                // Update user's active package and expiry
                await client.query(
                    'UPDATE users SET active_package = $1, package_expiry = CURRENT_DATE + INTERVAL \'30 days\' WHERE id = $2',
                    [packageName, deposit.user_id]
                );
            }

            // Distribute referral commissions to upline (3 levels)
            await this.distributeReferralCommissions(client, deposit.user_id, deposit.amount);

            // Commit all changes
            await client.query('COMMIT');

            // Send notification to depositor
            await NotificationsService.create(
                deposit.user_id,
                'Deposit Verified ✅',
                `Your deposit of ${deposit.amount.toLocaleString()} ETB has been verified and your package is now active.`,
                'deposit',
                depositId
            );

            return { success: true, message: 'Deposit verified and notifications sent' };

        } catch (error) {
            // Rollback all changes if anything fails
            await client.query('ROLLBACK');
            throw error;
        } finally {
            // Release the client back to pool
            client.release();
        }
    }

    async distributeReferralCommissions(client, userId, amount) {
        // Get upline users up to 3 levels
        const uplineResult = await client.query(
            `SELECT ancestor_id, level FROM user_tree 
             WHERE descendant_id = $1 AND level > 0 AND level <= 3
             ORDER BY level ASC`,
            [userId]
        );

        const upline = uplineResult.rows;

        // Commission rates for each level
        const rates = [
            COMMISSION.REFERRAL.LEVEL_1,  // 10% for Level 1
            COMMISSION.REFERRAL.LEVEL_2,  // 3% for Level 2
            COMMISSION.REFERRAL.LEVEL_3   // 1% for Level 3
        ];

        // Distribute commission to each upline user
        for (const uplineUser of upline) {
            const rate = rates[uplineUser.level - 1];
            const commissionAmount = amount * rate;

            // Credit commission to upline user
            await client.query(
                'UPDATE users SET balance = balance + $1, total_earned = total_earned + $1 WHERE id = $2',
                [commissionAmount, uplineUser.ancestor_id]
            );

            // Record commission
            await client.query(
                `INSERT INTO commissions (from_user_id, to_user_id, type, level, amount, source_amount, percentage)
                 VALUES ($1, $2, 'referral', $3, $4, $5, $6)`,
                [userId, uplineUser.ancestor_id, uplineUser.level, commissionAmount, amount, rate * 100]
            );

            // Get updated balance for transaction record
            const uplineBalance = await client.query(
                'SELECT balance FROM users WHERE id = $1',
                [uplineUser.ancestor_id]
            );

            // Record transaction in ledger
            await client.query(
                `INSERT INTO transactions (user_id, type, amount, balance_after, category, reference_id, description)
                 VALUES ($1, 'credit', $2, $3, 'commission', $4, $5)`,
                [uplineUser.ancestor_id, commissionAmount, uplineBalance.rows[0].balance, userId,
                 `Referral commission level ${uplineUser.level} from user #${userId}`]
            );

            // Send notification to upline user
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
        // Update deposit status to rejected
        const result = await pool.query(
            'UPDATE deposits SET status = $1, verified_by = $2, rejection_reason = $3, verified_at = NOW() WHERE id = $4 AND status = $5',
            ['rejected', adminId, reason, depositId, 'pending']
        );

        if (result.rowCount === 0) {
            throw new Error('Deposit not found or already processed');
        }

        return { success: true, message: 'Deposit rejected' };
    }

    async getPendingDeposits(page = 1, limit = 20) {
        const offset = (page - 1) * limit;

        // Get pending deposits with user info
        const depositsResult = await pool.query(
            `SELECT d.*, u.phone, u.full_name 
             FROM deposits d 
             JOIN users u ON d.user_id = u.id 
             WHERE d.status = 'pending' 
             ORDER BY d.created_at ASC 
             LIMIT $1 OFFSET $2`,
            [limit, offset]
        );

        // Get total count for pagination
        const countResult = await pool.query(
            'SELECT COUNT(*) as total FROM deposits WHERE status = $1',
            ['pending']
        );

        const total = parseInt(countResult.rows[0].total);

        return {
            deposits: depositsResult.rows,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }
}

module.exports = new DepositsService();