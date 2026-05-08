// modules/team/team.service.js
const pool = require('../../config/db');

class TeamService {
    async getTeamOverview(userId) {
        const levelAResult = await pool.query(
            `SELECT u.id, u.phone, u.full_name, u.active_package, u.created_at,
                    COALESCE(SUM(d.amount), 0) as total_recharge
             FROM user_tree ut
             JOIN users u ON ut.descendant_id = u.id
             LEFT JOIN deposits d ON u.id = d.user_id AND d.status = 'verified'
             WHERE ut.ancestor_id = $1 AND ut.level = 1
             GROUP BY u.id`,
            [userId]
        );

        const levelBResult = await pool.query(
            `SELECT u.id, u.phone, u.full_name, u.active_package, u.created_at,
                    COALESCE(SUM(d.amount), 0) as total_recharge
             FROM user_tree ut
             JOIN users u ON ut.descendant_id = u.id
             LEFT JOIN deposits d ON u.id = d.user_id AND d.status = 'verified'
             WHERE ut.ancestor_id = $1 AND ut.level = 2
             GROUP BY u.id`,
            [userId]
        );

        const levelCResult = await pool.query(
            `SELECT u.id, u.phone, u.full_name, u.active_package, u.created_at,
                    COALESCE(SUM(d.amount), 0) as total_recharge
             FROM user_tree ut
             JOIN users u ON ut.descendant_id = u.id
             LEFT JOIN deposits d ON u.id = d.user_id AND d.status = 'verified'
             WHERE ut.ancestor_id = $1 AND ut.level = 3
             GROUP BY u.id`,
            [userId]
        );

        const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

        const activeResult = await pool.query(
            `SELECT COUNT(DISTINCT ut.descendant_id) as active_count
             FROM user_tree ut
             JOIN daily_tasks dt ON ut.descendant_id = dt.user_id
             WHERE ut.ancestor_id = $1 AND ut.level > 0 AND dt.task_date >= $2`,
            [userId, sevenDaysAgo]
        );

        const rechargeResult = await pool.query(
            `SELECT 
                COALESCE(SUM(CASE WHEN ut.level = 1 THEN d.amount ELSE 0 END), 0) as level_a_recharge,
                COALESCE(SUM(CASE WHEN ut.level = 2 THEN d.amount ELSE 0 END), 0) as level_b_recharge,
                COALESCE(SUM(CASE WHEN ut.level = 3 THEN d.amount ELSE 0 END), 0) as level_c_recharge,
                COALESCE(SUM(d.amount), 0) as total_recharge
             FROM user_tree ut
             JOIN deposits d ON ut.descendant_id = d.user_id AND d.status = 'verified'
             WHERE ut.ancestor_id = $1 AND ut.level > 0`,
            [userId]
        );

        const recharge = rechargeResult.rows[0] || { level_a_recharge: 0, level_b_recharge: 0, level_c_recharge: 0, total_recharge: 0 };

        return {
            totalTeam: levelAResult.rows.length + levelBResult.rows.length + levelCResult.rows.length,
            levelA: { count: levelAResult.rows.length, members: levelAResult.rows },
            levelB: { count: levelBResult.rows.length, members: levelBResult.rows },
            levelC: { count: levelCResult.rows.length, members: levelCResult.rows },
            activeMembers: parseInt(activeResult.rows[0].active_count),
            recharge: {
                levelARecharge: parseFloat(recharge.level_a_recharge),
                levelBRecharge: parseFloat(recharge.level_b_recharge),
                levelCRecharge: parseFloat(recharge.level_c_recharge),
                totalRecharge: parseFloat(recharge.total_recharge)
            }
        };
    }

    async getTeamByLevel(userId, level, page = 1, limit = 20) {
        const offset = (page - 1) * limit;

        const membersResult = await pool.query(
            `SELECT u.id, u.phone, u.full_name, u.active_package, u.created_at,
                    COALESCE(SUM(d.amount), 0) as total_recharge
             FROM user_tree ut
             JOIN users u ON ut.descendant_id = u.id
             LEFT JOIN deposits d ON u.id = d.user_id AND d.status = 'verified'
             WHERE ut.ancestor_id = $1 AND ut.level = $2
             GROUP BY u.id
             ORDER BY u.created_at DESC
             LIMIT $3 OFFSET $4`,
            [userId, level, limit, offset]
        );

        const countResult = await pool.query(
            'SELECT COUNT(*) as total FROM user_tree WHERE ancestor_id = $1 AND level = $2',
            [userId, level]
        );

        const total = parseInt(countResult.rows[0].total);

        return { members: membersResult.rows, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
    }

    async getReferralLink(userId) {
        const result = await pool.query('SELECT referral_code FROM users WHERE id = $1', [userId]);
        if (result.rows.length === 0) throw new Error('User not found');
        const baseUrl = process.env.BASE_URL || 'https://pay-to-earn.vercel.app';
        return { 
            code: result.rows[0].referral_code, 
            link: `${baseUrl}/#/register?ref=${result.rows[0].referral_code}` 
        };
    }
}

module.exports = new TeamService();