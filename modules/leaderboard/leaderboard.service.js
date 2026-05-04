const pool = require('../../config/db');

class LeaderboardService {
    async getTopEarners(period = 'weekly', limit = 20) {
        let dateFilter;
        if (period === 'daily') {
            dateFilter = `AND t.created_at >= CURDATE()`;
        } else if (period === 'weekly') {
            dateFilter = `AND t.created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)`;
        } else if (period === 'monthly') {
            dateFilter = `AND t.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`;
        } else {
            dateFilter = '';
        }

        const [leaders] = await pool.query(`
            SELECT u.id, u.phone, u.active_package,
                   COALESCE(SUM(t.amount), 0) as period_earnings,
                   (SELECT COUNT(*) FROM user_tree WHERE ancestor_id = u.id AND level > 0) as team_size
            FROM users u
            LEFT JOIN transactions t ON u.id = t.user_id AND t.type = 'credit' ${dateFilter}
            WHERE u.status = 'active'
            GROUP BY u.id
            ORDER BY period_earnings DESC
            LIMIT ?
        `, [limit]);

        return leaders.map((leader, index) => ({
            ...leader,
            rank: index + 1,
            period_earnings: parseFloat(leader.period_earnings),
            team_size: leader.team_size || 0
        }));
    }

    async getTopRecruiters(period = 'monthly', limit = 20) {
        let dateFilter;
        if (period === 'weekly') {
            dateFilter = `AND u2.created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)`;
        } else if (period === 'monthly') {
            dateFilter = `AND u2.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`;
        } else {
            dateFilter = '';
        }

        const [recruiters] = await pool.query(`
            SELECT u.id, u.phone, u.active_package,
                   COUNT(DISTINCT ut.descendant_id) as new_referrals,
                   (SELECT COUNT(*) FROM user_tree WHERE ancestor_id = u.id AND level > 0) as total_team
            FROM users u
            LEFT JOIN user_tree ut ON u.id = ut.ancestor_id AND ut.level = 1
            LEFT JOIN users u2 ON ut.descendant_id = u2.id ${dateFilter}
            WHERE u.status = 'active'
            GROUP BY u.id
            ORDER BY new_referrals DESC
            LIMIT ?
        `, [limit]);

        return recruiters.map((r, index) => ({
            ...r,
            rank: index + 1,
            new_referrals: r.new_referrals || 0,
            total_team: r.total_team || 0
        }));
    }
}

module.exports = new LeaderboardService();
