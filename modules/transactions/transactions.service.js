// modules/transactions/transactions.service.js
const pool = require('../../config/db');

class TransactionsService {
    async getHistory(userId, page = 1, limit = 20) {
        const offset = (page - 1) * limit;

        // Get paginated transaction history
        const transactionsResult = await pool.query(
            'SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
            [userId, limit, offset]
        );

        // Get total count for pagination
        const countResult = await pool.query(
            'SELECT COUNT(*) as total FROM transactions WHERE user_id = $1',
            [userId]
        );

        const total = parseInt(countResult.rows[0].total);

        return {
            transactions: transactionsResult.rows,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }
}

module.exports = new TransactionsService();