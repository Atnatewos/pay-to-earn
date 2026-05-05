// modules/withdrawals/withdrawals.service.js
const pool = require('../../config/db');
const { WITHDRAWAL } = require('../../config/constants');
const NotificationsService = require('../notifications/notifications.service');

class WithdrawalsService {
    async requestWithdrawal(userId, amount, bankAccountId, fullName, phoneNumber) {
        const client = await pool.connect();

        try {
            // Start transaction
            await client.query('BEGIN');

            // Validate minimum withdrawal
            if (amount < WITHDRAWAL.MIN) {
                throw new Error(`Minimum withdrawal is ${WITHDRAWAL.MIN} ETB`);
            }

            // Check user balance
            const userResult = await client.query(
                'SELECT balance FROM users WHERE id = $1',
                [userId]
            );

            if (userResult.rows.length === 0 || userResult.rows[0].balance < amount) {
                throw new Error('Insufficient balance');
            }

            // Verify bank account belongs to user
            const accountResult = await client.query(
                'SELECT id FROM bank_accounts WHERE id = $1 AND user_id = $2',
                [bankAccountId, userId]
            );

            if (accountResult.rows.length === 0) {
                throw new Error('Bank account not found');
            }

            // Deduct balance
            await client.query(
                'UPDATE users SET balance = balance - $1 WHERE id = $2',
                [amount, userId]
            );

            // Create withdrawal request
            const withdrawResult = await client.query(
                `INSERT INTO withdrawals (user_id, amount, full_name, phone_number, bank_account_id)
                 VALUES ($1, $2, $3, $4, $5) RETURNING id`,
                [userId, amount, fullName, phoneNumber, bankAccountId]
            );

            const withdrawalId = withdrawResult.rows[0].id;

            // Get updated balance for transaction record
            const updatedUser = await client.query(
                'SELECT balance FROM users WHERE id = $1',
                [userId]
            );

            // Record transaction in ledger
            await client.query(
                `INSERT INTO transactions (user_id, type, amount, balance_after, category, reference_id, description)
                 VALUES ($1, 'debit', $2, $3, 'withdrawal', $4, $5)`,
                [userId, amount, updatedUser.rows[0].balance, withdrawalId, 'Withdrawal requested']
            );

            // Commit transaction
            await client.query('COMMIT');

            return {
                id: withdrawalId,
                amount,
                status: 'pending'
            };

        } catch (error) {
            // Rollback on any error
            await client.query('ROLLBACK');
            throw error;
        } finally {
            // Release client back to pool
            client.release();
        }
    }

    async processWithdrawal(withdrawalId, adminId, status, reason = null) {
        const client = await pool.connect();

        try {
            // Start transaction
            await client.query('BEGIN');

            // Get withdrawal and verify it's pending
            const withdrawResult = await client.query(
                'SELECT * FROM withdrawals WHERE id = $1 AND status = $2',
                [withdrawalId, 'pending']
            );

            if (withdrawResult.rows.length === 0) {
                throw new Error('Withdrawal not found or already processed');
            }

            const withdrawal = withdrawResult.rows[0];

            if (status === 'completed') {
                // Mark as completed
                await client.query(
                    'UPDATE withdrawals SET status = $1, processed_by = $2, processed_at = NOW() WHERE id = $3',
                    ['completed', adminId, withdrawalId]
                );

                // Update total withdrawn
                await client.query(
                    'UPDATE users SET total_withdrawn = total_withdrawn + $1 WHERE id = $2',
                    [withdrawal.amount, withdrawal.user_id]
                );

                // Send notification to user
                await NotificationsService.create(
                    withdrawal.user_id,
                    'Withdrawal Approved ✅',
                    `Your withdrawal of ${withdrawal.amount.toLocaleString()} ETB has been approved and sent to your bank account.`,
                    'withdrawal',
                    withdrawalId
                );

            } else if (status === 'rejected') {
                // Refund the amount back to user balance
                await client.query(
                    'UPDATE users SET balance = balance + $1 WHERE id = $2',
                    [withdrawal.amount, withdrawal.user_id]
                );

                // Mark as rejected with reason
                await client.query(
                    'UPDATE withdrawals SET status = $1, processed_by = $2, processed_at = NOW(), reason = $3 WHERE id = $4',
                    ['rejected', adminId, reason, withdrawalId]
                );

                // Get updated balance for transaction record
                const updatedUser = await client.query(
                    'SELECT balance FROM users WHERE id = $1',
                    [withdrawal.user_id]
                );

                // Record refund transaction
                await client.query(
                    `INSERT INTO transactions (user_id, type, amount, balance_after, category, reference_id, description)
                     VALUES ($1, 'credit', $2, $3, 'withdrawal_refund', $4, $5)`,
                    [withdrawal.user_id, withdrawal.amount, updatedUser.rows[0].balance, withdrawalId,
                     `Withdrawal rejected: ${reason}`]
                );

                // Send notification to user
                await NotificationsService.create(
                    withdrawal.user_id,
                    'Withdrawal Rejected ❌',
                    `Your withdrawal of ${withdrawal.amount.toLocaleString()} ETB was rejected. Reason: ${reason}. Amount has been refunded to your balance.`,
                    'withdrawal',
                    withdrawalId
                );
            }

            // Commit transaction
            await client.query('COMMIT');

            return { success: true, message: `Withdrawal ${status}` };

        } catch (error) {
            // Rollback on any error
            await client.query('ROLLBACK');
            throw error;
        } finally {
            // Release client back to pool
            client.release();
        }
    }

    async getHistory(userId, page = 1, limit = 20) {
        const offset = (page - 1) * limit;

        // Get withdrawal history with bank details
        const withdrawalsResult = await pool.query(
            `SELECT w.*, ba.bank_name, ba.account_number
             FROM withdrawals w
             JOIN bank_accounts ba ON w.bank_account_id = ba.id
             WHERE w.user_id = $1
             ORDER BY w.created_at DESC
             LIMIT $2 OFFSET $3`,
            [userId, limit, offset]
        );

        // Get total count for pagination
        const countResult = await pool.query(
            'SELECT COUNT(*) as total FROM withdrawals WHERE user_id = $1',
            [userId]
        );

        const total = parseInt(countResult.rows[0].total);

        return {
            withdrawals: withdrawalsResult.rows,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }

    async getPendingWithdrawals(page = 1, limit = 20) {
        const offset = (page - 1) * limit;

        // Get pending withdrawals with user and bank info
        const withdrawalsResult = await pool.query(
            `SELECT w.*, u.phone, u.full_name, ba.bank_name, ba.account_number
             FROM withdrawals w
             JOIN users u ON w.user_id = u.id
             JOIN bank_accounts ba ON w.bank_account_id = ba.id
             WHERE w.status = 'pending'
             ORDER BY w.created_at ASC
             LIMIT $1 OFFSET $2`,
            [limit, offset]
        );

        // Get total count for pagination
        const countResult = await pool.query(
            'SELECT COUNT(*) as total FROM withdrawals WHERE status = $1',
            ['pending']
        );

        const total = parseInt(countResult.rows[0].total);

        return {
            withdrawals: withdrawalsResult.rows,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }

    async processBulk(action, ids, adminId, reason = null) {
        const results = [];

        // Process each withdrawal individually
        for (const id of ids) {
            try {
                const result = await this.processWithdrawal(id, adminId, action, reason);
                results.push({ id, success: true, ...result });
            } catch (error) {
                results.push({ id, success: false, error: error.message });
            }
        }

        return results;
    }
}

module.exports = new WithdrawalsService();