// modules/bank/bank.service.js
const pool = require('../../config/db');

class BankService {
    async addAccount(userId, bankName, accountNumber) {
        // Check if this is the user's first account (make it primary if so)
        const countResult = await pool.query(
            'SELECT COUNT(*) as count FROM bank_accounts WHERE user_id = $1',
            [userId]
        );

        const isPrimary = parseInt(countResult.rows[0].count) === 0;

        // Insert the bank account
        const result = await pool.query(
            'INSERT INTO bank_accounts (user_id, bank_name, account_number, is_primary) VALUES ($1, $2, $3, $4) RETURNING id',
            [userId, bankName, accountNumber, isPrimary]
        );

        return {
            id: result.rows[0].id,
            bankName,
            accountNumber,
            isPrimary
        };
    }

    async getUserAccounts(userId) {
        // Get all user's bank accounts, primary first
        const result = await pool.query(
            'SELECT * FROM bank_accounts WHERE user_id = $1 ORDER BY is_primary DESC, created_at DESC',
            [userId]
        );

        return result.rows;
    }

    async deleteAccount(userId, accountId) {
        // Delete the bank account (only if it belongs to the user)
        const result = await pool.query(
            'DELETE FROM bank_accounts WHERE id = $1 AND user_id = $2',
            [accountId, userId]
        );

        if (result.rowCount === 0) {
            throw new Error('Account not found');
        }

        return { success: true };
    }
}

module.exports = new BankService();