const pool = require('../../config/db');
const { WITHDRAWAL } = require('../../config/constants');
const NotificationsService = require('../notifications/notifications.service');

class WithdrawalsService {
    async requestWithdrawal(userId, amount, bankAccountId, fullName, phoneNumber) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            if (amount < WITHDRAWAL.MIN) throw new Error(`Minimum withdrawal is ${WITHDRAWAL.MIN} ETB`);
            const [users] = await connection.query('SELECT balance FROM users WHERE id = ?', [userId]);
            if (users.length === 0 || users[0].balance < amount) throw new Error('Insufficient balance');
            const [accounts] = await connection.query('SELECT id FROM bank_accounts WHERE id = ? AND user_id = ?', [bankAccountId, userId]);
            if (accounts.length === 0) throw new Error('Bank account not found');

            await connection.query('UPDATE users SET balance = balance - ? WHERE id = ?', [amount, userId]);
            const [result] = await connection.query(
                'INSERT INTO withdrawals (user_id, amount, full_name, phone_number, bank_account_id) VALUES (?, ?, ?, ?, ?)',
                [userId, amount, fullName, phoneNumber, bankAccountId]
            );
            const [userBalance] = await connection.query('SELECT balance FROM users WHERE id = ?', [userId]);
            await connection.query(
                'INSERT INTO transactions (user_id, type, amount, balance_after, category, reference_id, description) VALUES (?, "debit", ?, ?, "withdrawal", ?, ?)',
                [userId, amount, userBalance[0].balance, result.insertId, 'Withdrawal requested']
            );
            await connection.commit();
            return { id: result.insertId, amount, status: 'pending' };
        } catch (error) { await connection.rollback(); throw error; }
        finally { connection.release(); }
    }

    async processWithdrawal(withdrawalId, adminId, status, reason = null) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            const [withdrawals] = await connection.query('SELECT * FROM withdrawals WHERE id = ? AND status = "pending"', [withdrawalId]);
            if (withdrawals.length === 0) throw new Error('Withdrawal not found or already processed');
            const withdrawal = withdrawals[0];

            if (status === 'completed') {
                await connection.query('UPDATE withdrawals SET status = "completed", processed_by = ?, processed_at = NOW() WHERE id = ?', [adminId, withdrawalId]);
                await connection.query('UPDATE users SET total_withdrawn = total_withdrawn + ? WHERE id = ?', [withdrawal.amount, withdrawal.user_id]);
                await NotificationsService.create(withdrawal.user_id, 'Withdrawal Approved ✅', `Your withdrawal of ${withdrawal.amount.toLocaleString()} ETB has been approved and sent to your bank account.`, 'withdrawal', withdrawalId);
            } else if (status === 'rejected') {
                await connection.query('UPDATE users SET balance = balance + ? WHERE id = ?', [withdrawal.amount, withdrawal.user_id]);
                await connection.query('UPDATE withdrawals SET status = "rejected", processed_by = ?, processed_at = NOW(), reason = ? WHERE id = ?', [adminId, reason, withdrawalId]);
                const [userBalance] = await connection.query('SELECT balance FROM users WHERE id = ?', [withdrawal.user_id]);
                await connection.query('INSERT INTO transactions (user_id, type, amount, balance_after, category, reference_id, description) VALUES (?, "credit", ?, ?, "withdrawal_refund", ?, ?)', [withdrawal.user_id, withdrawal.amount, userBalance[0].balance, withdrawalId, `Rejected: ${reason}`]);
                await NotificationsService.create(withdrawal.user_id, 'Withdrawal Rejected ❌', `Your withdrawal of ${withdrawal.amount.toLocaleString()} ETB was rejected. Reason: ${reason}. Amount refunded.`, 'withdrawal', withdrawalId);
            }
            await connection.commit();
            return { success: true, message: `Withdrawal ${status}` };
        } catch (error) { await connection.rollback(); throw error; }
        finally { connection.release(); }
    }

    async getHistory(userId, page = 1, limit = 20) {
        const offset = (page - 1) * limit;
        const [withdrawals] = await pool.query(
            'SELECT w.*, ba.bank_name, ba.account_number FROM withdrawals w JOIN bank_accounts ba ON w.bank_account_id = ba.id WHERE w.user_id = ? ORDER BY w.created_at DESC LIMIT ? OFFSET ?',
            [userId, limit, offset]
        );
        const [[{ total }]] = await pool.query('SELECT COUNT(*) as total FROM withdrawals WHERE user_id = ?', [userId]);
        return { withdrawals, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
    }

    async getPendingWithdrawals(page = 1, limit = 20) {
        const offset = (page - 1) * limit;
        const [withdrawals] = await pool.query(
            'SELECT w.*, u.phone, u.full_name, ba.bank_name, ba.account_number FROM withdrawals w JOIN users u ON w.user_id = u.id JOIN bank_accounts ba ON w.bank_account_id = ba.id WHERE w.status = "pending" ORDER BY w.created_at ASC LIMIT ? OFFSET ?',
            [limit, offset]
        );
        const [[{ total }]] = await pool.query('SELECT COUNT(*) as total FROM withdrawals WHERE status = "pending"');
        return { withdrawals, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
    }

    async processBulk(action, ids, adminId, reason = null) {
        const results = [];
        for (const id of ids) {
            try { results.push(await this.processWithdrawal(id, adminId, action, reason)); }
            catch (e) { results.push({ id, error: e.message }); }
        }
        return results;
    }
}

module.exports = new WithdrawalsService();
