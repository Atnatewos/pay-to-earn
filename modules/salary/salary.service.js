// modules/salary/salary.service.js
const pool = require('../../config/db');

class SalaryService {
    constructor() {
        // Define manager ranks and requirements
        this.ranks = [
            { name: 'Trainee Manager', levelA: 10, levelB: 0, levelC: 0, salary: 5000 },
            { name: 'Marketing Manager', levelA: 20, levelB: 30, levelC: 0, salary: 10000 },
            { name: 'Marketing General Manager', levelA: 0, levelB: 50, levelC: 50, salary: 25000 },
            { name: 'Regional Manager', levelA: 0, levelB: 150, levelC: 250, salary: 60000 },
            { name: 'Regional General Manager', levelA: 0, levelB: 400, levelC: 600, salary: 150000 }
        ];
    }

    async getUserTeamCounts(userId) {
        // Count team members at each level
        const levelAResult = await pool.query(
            'SELECT COUNT(*) as count FROM user_tree WHERE ancestor_id = $1 AND level = 1',
            [userId]
        );

        const levelBResult = await pool.query(
            'SELECT COUNT(*) as count FROM user_tree WHERE ancestor_id = $1 AND level = 2',
            [userId]
        );

        const levelCResult = await pool.query(
            'SELECT COUNT(*) as count FROM user_tree WHERE ancestor_id = $1 AND level = 3',
            [userId]
        );

        const a = parseInt(levelAResult.rows[0].count);
        const b = parseInt(levelBResult.rows[0].count);
        const c = parseInt(levelCResult.rows[0].count);

        return {
            a,
            b,
            c,
            total: a + b + c
        };
    }

    async checkRankEligibility(userId) {
        // Get user's current team counts
        const counts = await this.getUserTeamCounts(userId);

        // Find which ranks the user qualifies for
        const eligibleRanks = [];

        for (const rank of this.ranks) {
            if (counts.a >= rank.levelA && counts.b >= rank.levelB && counts.c >= rank.levelC) {
                eligibleRanks.push(rank);
            }
        }

        return {
            currentCounts: counts,
            eligibleRanks: eligibleRanks,
            highestRank: eligibleRanks.length > 0 ? eligibleRanks[eligibleRanks.length - 1] : null
        };
    }

    async payMonthlySalary(userId) {
        // Check if user qualifies for any rank
        const eligibility = await this.checkRankEligibility(userId);

        if (!eligibility.highestRank) {
            return { qualified: false, message: 'Not qualified for any manager rank' };
        }

        const monthYear = new Date().toISOString().slice(0, 7);
        const rank = eligibility.highestRank;

        // Check if already paid this month
        const existingResult = await pool.query(
            'SELECT id FROM manager_salaries WHERE user_id = $1 AND month_year = $2',
            [userId, monthYear]
        );

        if (existingResult.rows.length > 0) {
            return { qualified: false, message: 'Salary already paid for this month' };
        }

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Record salary payment
            await client.query(
                `INSERT INTO manager_salaries 
                (user_id, rank_name, monthly_salary, team_count_a, team_count_b, team_count_c, total_team, month_year)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [userId, rank.name, rank.salary, eligibility.currentCounts.a,
                 eligibility.currentCounts.b, eligibility.currentCounts.c,
                 eligibility.currentCounts.total, monthYear]
            );

            // Credit salary to user balance
            await client.query(
                'UPDATE users SET balance = balance + $1, total_earned = total_earned + $1 WHERE id = $2',
                [rank.salary, userId]
            );

            // Get updated balance for transaction record
            const userResult = await client.query(
                'SELECT balance FROM users WHERE id = $1',
                [userId]
            );

            // Record transaction in ledger
            await client.query(
                `INSERT INTO transactions (user_id, type, amount, balance_after, category, description)
                 VALUES ($1, 'credit', $2, $3, 'salary', $4)`,
                [userId, rank.salary, userResult.rows[0].balance, `${rank.name} salary for ${monthYear}`]
            );

            await client.query('COMMIT');

            return {
                qualified: true,
                rank: rank.name,
                salary: rank.salary,
                teamCounts: eligibility.currentCounts
            };

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async getUserSalaryHistory(userId) {
        // Get user's salary payment history
        const result = await pool.query(
            'SELECT * FROM manager_salaries WHERE user_id = $1 ORDER BY paid_at DESC',
            [userId]
        );

        return result.rows;
    }

    async processAllSalaries() {
        // Get all active users
        const usersResult = await pool.query(
            'SELECT id FROM users WHERE status = $1',
            ['active']
        );

        const results = [];

        // Process salary for each user
        for (const user of usersResult.rows) {
            const result = await this.payMonthlySalary(user.id);
            if (result.qualified) {
                results.push({ userId: user.id, ...result });
            }
        }

        return results;
    }
}

module.exports = new SalaryService();