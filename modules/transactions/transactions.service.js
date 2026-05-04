const pool = require('../../config/db');

class TransactionsService {
    async getHistory(userId, page = 1, limit = 20) {
        const offset = (page - 1) * limit;

        const [transactions] = await pool.query(
            'SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
            [userId, limit, offset]
        );

        const [[{ total }]] = await pool.query(
            'SELECT COUNT(*) as total FROM transactions WHERE user_id = ?',
            [userId]
        );

        return {
            transactions,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        };
    }
}

module.exports = new TransactionsService();
