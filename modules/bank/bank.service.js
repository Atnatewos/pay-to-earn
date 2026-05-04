// modules/bank/bank.service.js
const pool = require('../../config/db');

class BankService {
    async addAccount(userId, bankName, accountNumber) {
        // If this is first account, make it primary
        const [existing] = await pool.query(
            'SELECT COUNT(*) as count FROM bank_accounts WHERE user_id = ?',
            [userId]
        );

        const isPrimary = existing[0].count === 0;

        const [result] = await pool.query(
            'INSERT INTO bank_accounts (user_id, bank_name, account_number, is_primary) VALUES (?, ?, ?, ?)',
            [userId, bankName, accountNumber, isPrimary]
        );

        return { id: result.insertId, bankName, accountNumber, isPrimary };
    }

    async getUserAccounts(userId) {
        const [accounts] = await pool.query(
            'SELECT * FROM bank_accounts WHERE user_id = ? ORDER BY is_primary DESC, created_at DESC',
            [userId]
        );
        return accounts;
    }

    async deleteAccount(userId, accountId) {
        const [result] = await pool.query(
            'DELETE FROM bank_accounts WHERE id = ? AND user_id = ?',
            [accountId, userId]
        );

        if (result.affectedRows === 0) {
            throw new Error('Account not found');
        }

        return { success: true };
    }
}

module.exports = new BankService();