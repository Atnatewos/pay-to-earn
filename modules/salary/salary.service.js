// modules/salary/salary.service.js
const pool = require('../../config/db');

class SalaryService {
    constructor() {
        this.ranks = [
            { name: 'Trainee Manager', levelA: 10, levelB: 0, levelC: 0, salary: 5000 },
            { name: 'Marketing Manager', levelA: 20, levelB: 30, levelC: 0, salary: 10000 },
            { name: 'Marketing General Manager', levelA: 0, levelB: 50, levelC: 50, salary: 25000 },
            { name: 'Regional Manager', levelA: 0, levelB: 150, levelC: 250, salary: 60000 },
            { name: 'Regional General Manager', levelA: 0, levelB: 400, levelC: 600, salary: 150000 }
        ];
    }

    async getUserTeamCounts(userId) {
        const [levelA] = await pool.query(
            'SELECT COUNT(*) as count FROM user_tree WHERE ancestor_id = ? AND level = 1',
            [userId]
        );
        const [levelB] = await pool.query(
            'SELECT COUNT(*) as count FROM user_tree WHERE ancestor_id = ? AND level = 2',
            [userId]
        );
        const [levelC] = await pool.query(
            'SELECT COUNT(*) as count FROM user_tree WHERE ancestor_id = ? AND level = 3',
            [userId]
        );
        return {
            a: levelA[0].count,
            b: levelB[0].count,
            c: levelC[0].count,
            total: levelA[0].count + levelB[0].count + levelC[0].count
        };
    }

    async checkRankEligibility(userId) {
        const counts = await this.getUserTeamCounts(userId);
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
        const eligibility = await this.checkRankEligibility(userId);
        
        if (!eligibility.highestRank) {
            return { qualified: false, message: 'Not qualified for any manager rank' };
        }

        const monthYear = new Date().toISOString().slice(0, 7);
        const rank = eligibility.highestRank;

        // Check if already paid this month
        const [existing] = await pool.query(
            'SELECT id FROM manager_salaries WHERE user_id = ? AND month_year = ?',
            [userId, monthYear]
        );

        if (existing.length > 0) {
            return { qualified: false, message: 'Salary already paid for this month' };
        }

        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // Record salary
            await connection.query(
                `INSERT INTO manager_salaries 
                (user_id, rank_name, monthly_salary, team_count_a, team_count_b, team_count_c, total_team, month_year)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [userId, rank.name, rank.salary, eligibility.currentCounts.a, 
                 eligibility.currentCounts.b, eligibility.currentCounts.c, 
                 eligibility.currentCounts.total, monthYear]
            );

            // Credit user
            await connection.query(
                'UPDATE users SET balance = balance + ?, total_earned = total_earned + ? WHERE id = ?',
                [rank.salary, rank.salary, userId]
            );

            // Record transaction
            const [userBalance] = await connection.query(
                'SELECT balance FROM users WHERE id = ?', [userId]
            );

            await connection.query(
                `INSERT INTO transactions (user_id, type, amount, balance_after, category, description)
                 VALUES (?, 'credit', ?, ?, 'salary', ?)`,
                [userId, rank.salary, userBalance[0].balance, `${rank.name} salary for ${monthYear}`]
            );

            await connection.commit();

            return {
                qualified: true,
                rank: rank.name,
                salary: rank.salary,
                teamCounts: eligibility.currentCounts
            };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    async getUserSalaryHistory(userId) {
        const [salaries] = await pool.query(
            'SELECT * FROM manager_salaries WHERE user_id = ? ORDER BY paid_at DESC',
            [userId]
        );
        return salaries;
    }

    async processAllSalaries() {
        const [users] = await pool.query('SELECT id FROM users WHERE status = "active"');
        const results = [];
        
        for (const user of users) {
            const result = await this.payMonthlySalary(user.id);
            if (result.qualified) {
                results.push({ userId: user.id, ...result });
            }
        }
        
        return results;
    }
}

module.exports = new SalaryService();