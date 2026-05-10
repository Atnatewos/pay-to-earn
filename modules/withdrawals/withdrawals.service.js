// modules/withdrawals/withdrawals.service.js
const pool = require('../../config/db');
const bcrypt = require('bcryptjs');
const NotificationsService = require('../notifications/notifications.service');

// ============ CONFIG FILES ============
const withdrawalConfig = require('../../config/withdrawal.json');

class WithdrawalsService {

    /**
     * Check if withdrawals are available based on schedule config
     */
    checkSchedule() {
        const schedule = withdrawalConfig.schedule;
        if (!schedule.enabled) {
            return { allowed: false, message: 'Withdrawals are currently disabled.' };
        }
        const now = new Date();
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const todayName = dayNames[now.getDay()];
        if (!schedule.days.includes(todayName)) {
            const availableDays = schedule.days.map(d => d.charAt(0).toUpperCase() + d.slice(1, 3)).join(', ');
            return { allowed: false, message: `Withdrawals only available on: ${availableDays}.` };
        }
        const currentTime = now.getHours() * 60 + now.getMinutes();
        const [startH, startM] = schedule.hoursStart.split(':').map(Number);
        const [endH, endM] = schedule.hoursEnd.split(':').map(Number);
        if (currentTime < startH * 60 + startM || currentTime > endH * 60 + endM) {
            return { allowed: false, message: `Withdrawals available from ${schedule.hoursStart} to ${schedule.hoursEnd}.` };
        }
        return { allowed: true };
    }

    /**
     * Generate schedule description for display
     */
    getScheduleDescription() {
        const schedule = withdrawalConfig.schedule;
        if (!schedule.enabled) return 'Withdrawals are currently disabled.';
        const days = schedule.days.map(d => d.charAt(0).toUpperCase() + d.slice(1, 3)).join(', ');
        return `Withdrawals available ${days} from ${schedule.hoursStart} to ${schedule.hoursEnd}. Processing: ${withdrawalConfig.processingTime}`;
    }

    async requestWithdrawal(userId, amount, bankAccountId, fullName, phoneNumber, password) {
        // Check schedule
        const scheduleCheck = this.checkSchedule();
        if (!scheduleCheck.allowed) throw new Error(scheduleCheck.message);

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Password validation from config
            if (withdrawalConfig.requirePassword) {
                if (!password || password.trim() === '') {
                    throw new Error('Password is required for withdrawal');
                }
                const userCheck = await client.query(
                    'SELECT password_hash FROM users WHERE id = $1',
                    [userId]
                );
                if (userCheck.rows.length === 0) throw new Error('User not found');
                const valid = await bcrypt.compare(password.trim(), userCheck.rows[0].password_hash);
                if (!valid) throw new Error('Incorrect password');
            }

            // Validate amount from config
            const fixedAmounts = withdrawalConfig.fixedAmounts || [300, 1000, 4000, 10000, 25000, 50000, 100000];
            if (!fixedAmounts.includes(parseInt(amount))) {
                throw new Error(`Withdrawal amount must be one of: ${fixedAmounts.join(', ')} ETB`);
            }

            // Check earnings balance (cannot withdraw capital)
            const userResult = await client.query(
                'SELECT earnings_balance, capital, balance FROM users WHERE id = $1',
                [userId]
            );
            const user = userResult.rows[0];
            const earningsBalance = parseFloat(user.earnings_balance || 0);

            if (earningsBalance < amount) {
                throw new Error(
                    `Insufficient earnings. Available: ${earningsBalance.toLocaleString()} ETB. Capital is locked.`
                );
            }

            // Verify bank account
            const accountResult = await client.query(
                'SELECT id FROM bank_accounts WHERE id = $1 AND user_id = $2',
                [bankAccountId, userId]
            );
            if (accountResult.rows.length === 0) throw new Error('Bank account not found');

            // Deduct from earnings
            await client.query(
                'UPDATE users SET balance = balance - $1, earnings_balance = earnings_balance - $1 WHERE id = $2',
                [amount, userId]
            );

            // Create withdrawal request
            const withdrawResult = await client.query(
                'INSERT INTO withdrawals (user_id, amount, full_name, phone_number, bank_account_id) VALUES ($1, $2, $3, $4, $5) RETURNING id',
                [userId, amount, fullName, phoneNumber, bankAccountId]
            );

            // Record transaction
            const updatedUser = await client.query('SELECT balance FROM users WHERE id = $1', [userId]);
            await client.query(
                'INSERT INTO transactions (user_id, type, amount, balance_after, category, reference_id, description) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                [userId, 'debit', amount, updatedUser.rows[0].balance, 'withdrawal', withdrawResult.rows[0].id, 'Withdrawal requested']
            );

            await client.query('COMMIT');
            return { id: withdrawResult.rows[0].id, amount, status: 'pending' };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async processWithdrawal(withdrawalId, adminId, status, reason = null) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const withdrawResult = await client.query(
                'SELECT * FROM withdrawals WHERE id = $1 AND status = $2',
                [withdrawalId, 'pending']
            );
            if (withdrawResult.rows.length === 0) throw new Error('Withdrawal not found or already processed');
            const withdrawal = withdrawResult.rows[0];

            if (status === 'completed') {
                await client.query(
                    'UPDATE withdrawals SET status = $1, processed_by = $2, processed_at = NOW() WHERE id = $3',
                    ['completed', adminId, withdrawalId]
                );
                await client.query(
                    'UPDATE users SET total_withdrawn = total_withdrawn + $1 WHERE id = $2',
                    [withdrawal.amount, withdrawal.user_id]
                );

                await client.query(
                    'INSERT INTO user_alerts (user_id, title, message, type, icon, color, sent_by) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                    [withdrawal.user_id, '🎉 Withdrawal Approved!', `Your withdrawal of ${withdrawal.amount.toLocaleString()} ETB has been approved.`, 'success', '🎊', 'gradient-accent', adminId]
                );
                await NotificationsService.create(
                    withdrawal.user_id,
                    'Withdrawal Approved 🎉',
                    `${withdrawal.amount.toLocaleString()} ETB approved.`,
                    'withdrawal',
                    withdrawalId
                );
            } else if (status === 'rejected') {
                // Refund to earnings
                await client.query(
                    'UPDATE users SET balance = balance + $1, earnings_balance = earnings_balance + $1 WHERE id = $2',
                    [withdrawal.amount, withdrawal.user_id]
                );
                await client.query(
                    'UPDATE withdrawals SET status = $1, processed_by = $2, processed_at = NOW(), reason = $3 WHERE id = $4',
                    ['rejected', adminId, reason, withdrawalId]
                );

                const updatedUser = await client.query('SELECT balance FROM users WHERE id = $1', [withdrawal.user_id]);
                await client.query(
                    'INSERT INTO transactions (user_id, type, amount, balance_after, category, reference_id, description) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                    [withdrawal.user_id, 'credit', withdrawal.amount, updatedUser.rows[0].balance, 'withdrawal_refund', withdrawalId, `Rejected: ${reason}`]
                );

                await client.query(
                    'INSERT INTO user_alerts (user_id, title, message, type, icon, color, sent_by) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                    [withdrawal.user_id, '❌ Withdrawal Rejected', `Your withdrawal of ${withdrawal.amount.toLocaleString()} ETB was rejected. Reason: ${reason}. Amount refunded.`, 'danger', '❌', 'color-danger', adminId]
                );
                await NotificationsService.create(
                    withdrawal.user_id,
                    'Withdrawal Rejected',
                    `Rejected: ${reason}. Amount refunded.`,
                    'withdrawal',
                    withdrawalId
                );
            }

            await client.query('COMMIT');
            return { success: true, message: `Withdrawal ${status}` };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async getHistory(userId, page = 1, limit = 20) {
        const offset = (page - 1) * limit;
        const result = await pool.query(
            'SELECT w.*, ba.bank_name, ba.account_number FROM withdrawals w JOIN bank_accounts ba ON w.bank_account_id = ba.id WHERE w.user_id = $1 ORDER BY w.created_at DESC LIMIT $2 OFFSET $3',
            [userId, limit, offset]
        );
        const count = await pool.query('SELECT COUNT(*) as total FROM withdrawals WHERE user_id = $1', [userId]);
        const total = parseInt(count.rows[0].total);
        return {
            withdrawals: result.rows,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        };
    }
}

module.exports = new WithdrawalsService();