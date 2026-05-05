// modules/leaderboard/leaderboard.service.js
const pool = require('../../config/db');

class LeaderboardService {
    async getTopEarners(period = 'weekly', limit = 20) {
        let dateFilter;

        // Set date filter based on period
        if (period === 'daily') {
            dateFilter = `AND t.created_at >= CURRENT_DATE`;
        } else if (period === 'weekly') {
            dateFilter = `AND t.created_at >= CURRENT_DATE - INTERVAL '7 days'`;
        } else if (period === 'monthly') {
            dateFilter = `AND t.created_at >= CURRENT_DATE - INTERVAL '30 days'`;
        } else {
            dateFilter = '';
        }

        // Get top earners for the period
        const result = await pool.query(`
            SELECT u.id, u.phone, u.active_package,
                   COALESCE(SUM(t.amount), 0) as period_earnings,
                   (SELECT COUNT(*) FROM user_tree WHERE ancestor_id = u.id AND level > 0) as team_size
            FROM users u
            LEFT JOIN transactions t ON u.id = t.user_id AND t.type = 'credit' ${dateFilter}
            WHERE u.status = 'active'
            GROUP BY u.id
            ORDER BY period_earnings DESC
            LIMIT $1
        `, [limit]);

        // Add rank position to each result
        return result.rows.map((leader, index) => ({
            ...leader,
            rank: index + 1,
            period_earnings: parseFloat(leader.period_earnings),
            team_size: leader.team_size || 0
        }));
    }

    async getTopRecruiters(period = 'monthly', limit = 20) {
        let dateFilter;

        // Set date filter based on period
        if (period === 'weekly') {
            dateFilter = `AND u2.created_at >= CURRENT_DATE - INTERVAL '7 days'`;
        } else if (period === 'monthly') {
            dateFilter = `AND u2.created_at >= CURRENT_DATE - INTERVAL '30 days'`;
        } else {
            dateFilter = '';
        }

        // Get top recruiters for the period
        const result = await pool.query(`
            SELECT u.id, u.phone, u.active_package,
                   COUNT(DISTINCT ut.descendant_id) as new_referrals,
                   (SELECT COUNT(*) FROM user_tree WHERE ancestor_id = u.id AND level > 0) as total_team
            FROM users u
            LEFT JOIN user_tree ut ON u.id = ut.ancestor_id AND ut.level = 1
            LEFT JOIN users u2 ON ut.descendant_id = u2.id ${dateFilter}
            WHERE u.status = 'active'
            GROUP BY u.id
            ORDER BY new_referrals DESC
            LIMIT $1
        `, [limit]);

        // Add rank position to each result
        return result.rows.map((recruiter, index) => ({
            ...recruiter,
            rank: index + 1,
            new_referrals: parseInt(recruiter.new_referrals) || 0,
            total_team: parseInt(recruiter.total_team) || 0
        }));
    }

    async updateLeaderboardCache() {
        // Update weekly leaderboard cache
        const weeklyResult = await pool.query(`
            SELECT u.id, u.phone, COALESCE(SUM(t.amount), 0) as total_earned,
                   (SELECT COUNT(*) FROM user_tree WHERE ancestor_id = u.id AND level > 0) as team_size
            FROM users u
            LEFT JOIN transactions t ON u.id = t.user_id AND t.type = 'credit' 
                AND t.created_at >= CURRENT_DATE - INTERVAL '7 days'
            WHERE u.status = 'active'
            GROUP BY u.id
            ORDER BY total_earned DESC
        `);

        // Clear old cache and insert new data
        await pool.query("DELETE FROM leaderboard WHERE period = 'weekly'");

        for (let i = 0; i < weeklyResult.rows.length; i++) {
            const row = weeklyResult.rows[i];
            await pool.query(
                `INSERT INTO leaderboard (user_id, phone, total_earned, team_size, rank_position, period)
                 VALUES ($1, $2, $3, $4, $5, 'weekly')`,
                [row.id, row.phone, row.total_earned, row.team_size, i + 1]
            );
        }

        return weeklyResult.rows.slice(0, 20);
    }
}

module.exports = new LeaderboardService();