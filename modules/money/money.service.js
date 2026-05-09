// modules/money/money.service.js
// CENTRAL MONEY MANAGEMENT - Every credit/debit goes through here
const pool = require('../../config/db');

class MoneyService {
    /**
     * Credit money to user
     * @param {number} userId 
     * @param {number} amount 
     * @param {string} type - 'capital' or 'earnings'
     * @param {string} category - 'deposit', 'task', 'commission', 'gift', 'salary', 'bonus'
     * @param {string} description 
     * @param {number} referenceId 
     */
    static async credit(userId, amount, type = 'earnings', category = 'task', description = '', referenceId = null) {
        if (!amount || amount <= 0) return;
        
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Update balance based on type
            if (type === 'capital') {
                await client.query(
                    'UPDATE users SET balance = balance + $1, capital = capital + $1, total_deposited = total_deposited + $1 WHERE id = $2',
                    [amount, userId]
                );
            } else {
                // EARNINGS - This is withdrawable money
                await client.query(
                    'UPDATE users SET balance = balance + $1, earnings_balance = earnings_balance + $1, total_earned = total_earned + $1 WHERE id = $2',
                    [amount, userId]
                );
            }

            // Record transaction
            const userResult = await client.query('SELECT balance FROM users WHERE id = $1', [userId]);
            await client.query(
                'INSERT INTO transactions (user_id, type, amount, balance_after, category, reference_id, description) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                [userId, 'credit', amount, userResult.rows[0].balance, category, referenceId, description]
            );

            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Debit money from user's EARNINGS only
     */
    static async debit(userId, amount, category = 'withdrawal', description = '', referenceId = null) {
        if (!amount || amount <= 0) return;
        
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Check earnings balance
            const userResult = await client.query('SELECT earnings_balance, balance FROM users WHERE id = $1', [userId]);
            const earnings = parseFloat(userResult.rows[0]?.earnings_balance || 0);
            
            if (earnings < amount) {
                throw new Error(`Insufficient earnings balance. Available: ${earnings.toLocaleString()} ETB`);
            }

            // Deduct from earnings only
            await client.query(
                'UPDATE users SET balance = balance - $1, earnings_balance = earnings_balance - $1 WHERE id = $2',
                [amount, userId]
            );

            // Record transaction
            const updatedUser = await client.query('SELECT balance FROM users WHERE id = $1', [userId]);
            await client.query(
                'INSERT INTO transactions (user_id, type, amount, balance_after, category, reference_id, description) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                [userId, 'debit', amount, updatedUser.rows[0].balance, category, referenceId, description]
            );

            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    static async getUserBalance(userId) {
        const result = await pool.query('SELECT balance, capital, earnings_balance FROM users WHERE id = $1', [userId]);
        if (result.rows.length === 0) return { balance: 0, capital: 0, earnings: 0 };
        return {
            balance: parseFloat(result.rows[0].balance || 0),
            capital: parseFloat(result.rows[0].capital || 0),
            earnings: parseFloat(result.rows[0].earnings_balance || 0)
        };
    }
}

module.exports = MoneyService;