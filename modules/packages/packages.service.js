// modules/packages/packages.service.js
const pool = require('../../config/db');

class PackagesService {
    async getAllPackages() {
        // Get all active packages ordered by level
        const result = await pool.query(
            'SELECT * FROM packages WHERE is_active = TRUE ORDER BY level_order ASC'
        );

        return result.rows;
    }

    async getPackageByName(name) {
        // Get specific package by name
        const result = await pool.query(
            'SELECT * FROM packages WHERE name = $1 AND is_active = TRUE',
            [name]
        );

        return result.rows[0] || null;
    }

    async getUserActivePackage(userId) {
        // Get user's currently active package
        const result = await pool.query(
            `SELECT up.*, p.tasks_per_day, p.income_per_task, p.daily_income
             FROM user_packages up
             JOIN packages p ON up.package_name = p.name
             WHERE up.user_id = $1 AND up.is_active = TRUE
             ORDER BY up.created_at DESC
             LIMIT 1`,
            [userId]
        );

        return result.rows[0] || null;
    }
}

module.exports = new PackagesService();