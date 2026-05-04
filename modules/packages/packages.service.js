// modules/packages/packages.service.js
const pool = require('../../config/db');

class PackagesService {
    async getAllPackages() {
        const [packages] = await pool.query(
            'SELECT * FROM packages WHERE is_active = TRUE ORDER BY level_order ASC'
        );
        return packages;
    }

    async getPackageByName(name) {
        const [packages] = await pool.query(
            'SELECT * FROM packages WHERE name = ? AND is_active = TRUE',
            [name]
        );
        return packages[0] || null;
    }

    async getUserActivePackage(userId) {
        const [packages] = await pool.query(
            `SELECT up.*, p.tasks_per_day, p.income_per_task, p.daily_income
             FROM user_packages up
             JOIN packages p ON up.package_name = p.name
             WHERE up.user_id = ? AND up.is_active = TRUE
             ORDER BY up.created_at DESC LIMIT 1`,
            [userId]
        );
        return packages[0] || null;
    }
}

module.exports = new PackagesService();