// modules/team/team.service.js
const pool = require('../../config/db');

class TeamService {
    async getTeamOverview(userId) {
        const [levelA] = await pool.query(
            `SELECT u.id, u.phone, u.full_name, u.active_package, u.created_at,
                    COALESCE(SUM(d.amount), 0) as total_recharge
             FROM user_tree ut
             JOIN users u ON ut.descendant_id = u.id
             LEFT JOIN deposits d ON u.id = d.user_id AND d.status = 'verified'
             WHERE ut.ancestor_id = ? AND ut.level = 1
             GROUP BY u.id`,
            [userId]
        );

        const [levelB] = await pool.query(
            `SELECT u.id, u.phone, u.full_name, u.active_package, u.created_at,
                    COALESCE(SUM(d.amount), 0) as total_recharge
             FROM user_tree ut
             JOIN users u ON ut.descendant_id = u.id
             LEFT JOIN deposits d ON u.id = d.user_id AND d.status = 'verified'
             WHERE ut.ancestor_id = ? AND ut.level = 2
             GROUP BY u.id`,
            [userId]
        );

        const [levelC] = await pool.query(
            `SELECT u.id, u.phone, u.full_name, u.active_package, u.created_at,
                    COALESCE(SUM(d.amount), 0) as total_recharge
             FROM user_tree ut
             JOIN users u ON ut.descendant_id = u.id
             LEFT JOIN deposits d ON u.id = d.user_id AND d.status = 'verified'
             WHERE ut.ancestor_id = ? AND ut.level = 3
             GROUP BY u.id`,
            [userId]
        );

        const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

        const [[{ activeCount }]] = await pool.query(
            `SELECT COUNT(DISTINCT ut.descendant_id) as activeCount
             FROM user_tree ut
             JOIN daily_tasks dt ON ut.descendant_id = dt.user_id
             WHERE ut.ancestor_id = ? AND ut.level > 0 AND dt.task_date >= ?`,
            [userId, sevenDaysAgo]
        );

        const [rechargeSummary] = await pool.query(
            `SELECT 
                COALESCE(SUM(CASE WHEN ut.level = 1 THEN d.amount ELSE 0 END), 0) as levelARecharge,
                COALESCE(SUM(CASE WHEN ut.level = 2 THEN d.amount ELSE 0 END), 0) as levelBRecharge,
                COALESCE(SUM(CASE WHEN ut.level = 3 THEN d.amount ELSE 0 END), 0) as levelCRecharge,
                COALESCE(SUM(d.amount), 0) as totalRecharge
             FROM user_tree ut
             JOIN deposits d ON ut.descendant_id = d.user_id AND d.status = 'verified'
             WHERE ut.ancestor_id = ? AND ut.level > 0`,
            [userId]
        );

        return {
            totalTeam: levelA.length + levelB.length + levelC.length,
            levelA: { count: levelA.length, members: levelA },
            levelB: { count: levelB.length, members: levelB },
            levelC: { count: levelC.length, members: levelC },
            activeMembers: activeCount,
            recharge: rechargeSummary[0] || { levelARecharge: 0, levelBRecharge: 0, levelCRecharge: 0, totalRecharge: 0 }
        };
    }

    async getTeamByLevel(userId, level, page = 1, limit = 20) {
        const offset = (page - 1) * limit;

        const [members] = await pool.query(
            `SELECT u.id, u.phone, u.full_name, u.active_package, u.created_at,
                    COALESCE(SUM(d.amount), 0) as total_recharge
             FROM user_tree ut
             JOIN users u ON ut.descendant_id = u.id
             LEFT JOIN deposits d ON u.id = d.user_id AND d.status = 'verified'
             WHERE ut.ancestor_id = ? AND ut.level = ?
             GROUP BY u.id
             ORDER BY u.created_at DESC
             LIMIT ? OFFSET ?`,
            [userId, level, limit, offset]
        );

        const [[{ total }]] = await pool.query(
            `SELECT COUNT(*) as total FROM user_tree WHERE ancestor_id = ? AND level = ?`,
            [userId, level]
        );

        return { members, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
    }

    async getReferralLink(userId) {
        const [users] = await pool.query('SELECT referral_code FROM users WHERE id = ?', [userId]);
        if (users.length === 0) throw new Error('User not found');
        const baseUrl = process.env.BASE_URL || 'https://pay-to-earn.vercel.app';
        return { 
            code: users[0].referral_code, 
            link: `${baseUrl}/#/register?ref=${users[0].referral_code}` 
        };
    }
}

module.exports = new TeamService();