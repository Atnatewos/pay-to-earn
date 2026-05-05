// modules/commissions/commissions.service.js
const pool = require('../../config/db');

class CommissionsService {
    async getBreakdown(userId) {
        // Get commission details with the phone number of who triggered it
        const result = await pool.query(
            `SELECT c.*, u.phone as from_phone 
             FROM commissions c 
             JOIN users u ON c.from_user_id = u.id 
             WHERE c.to_user_id = $1 
             ORDER BY c.created_at DESC 
             LIMIT 50`,
            [userId]
        );

        return result.rows;
    }
}

module.exports = new CommissionsService();