const router = require('express').Router();
const pool = require('../../config/db');
const Response = require('../../utils/response');
const { authenticateUser } = require('../../middleware/auth');

router.get('/breakdown', authenticateUser, async (req, res, next) => {
    try {
        const [commissions] = await pool.query(
            `SELECT c.*, u.phone as from_phone 
             FROM commissions c 
             JOIN users u ON c.from_user_id = u.id 
             WHERE c.to_user_id = ? 
             ORDER BY c.created_at DESC 
             LIMIT 50`,
            [req.user.id]
        );
        return Response.success(res, commissions);
    } catch (error) {
        next(error);
    }
});

module.exports = router;
