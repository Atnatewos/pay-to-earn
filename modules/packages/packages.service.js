// modules/packages/packages.service.js
const packageConfig = require('../../config/packages.json');

class PackagesService {
    /**
     * Get all packages from config file
     * Returns them sorted by level
     */
    async getAllPackages() {
        return Object.entries(packageConfig)
            .map(([key, pkg]) => ({
                name: pkg.name || key,
                key: key,
                level_order: pkg.level || 0,
                deposit_amount: pkg.deposit || 0,
                tasks_per_day: pkg.tasksPerDay || 0,
                income_per_task: pkg.incomePerTask || 0,
                daily_income: pkg.dailyIncome || 0,
                monthly_income: pkg.monthlyIncome || 0,
                duration_days: pkg.durationDays || 30,
                description: pkg.description || '',
                is_active: true
            }))
            .sort((a, b) => a.level_order - b.level_order);
    }

    /**
     * Get a single package by name from config
     */
    async getPackageByName(name) {
        // Search by config key or package name
        for (const [key, pkg] of Object.entries(packageConfig)) {
            if (key === name || pkg.name === name) {
                return {
                    name: pkg.name || key,
                    key: key,
                    level_order: pkg.level || 0,
                    deposit_amount: pkg.deposit || 0,
                    tasks_per_day: pkg.tasksPerDay || 0,
                    income_per_task: pkg.incomePerTask || 0,
                    daily_income: pkg.dailyIncome || 0,
                    monthly_income: pkg.monthlyIncome || 0,
                    duration_days: pkg.durationDays || 30,
                    description: pkg.description || '',
                    is_active: true
                };
            }
        }
        return null;
    }

    /**
     * Get user's active package from database, enrich with config data
     */
    async getUserActivePackage(userId) {
        const pool = require('../../config/db');
        const result = await pool.query(
            `SELECT up.*, p.tasks_per_day, p.income_per_task, p.daily_income
             FROM user_packages up
             JOIN packages p ON up.package_name = p.name
             WHERE up.user_id = $1 AND up.is_active = TRUE
             ORDER BY up.created_at DESC
             LIMIT 1`,
            [userId]
        );

        if (result.rows.length > 0) {
            const dbPkg = result.rows[0];
            // Enrich with config data
            const configPkg = await this.getPackageByName(dbPkg.package_name);
            return {
                ...dbPkg,
                ...configPkg,
                package_name: configPkg?.name || dbPkg.package_name
            };
        }

        // Fallback: check user's active_package field
        const userResult = await pool.query(
            'SELECT active_package FROM users WHERE id = $1',
            [userId]
        );
        if (userResult.rows[0]?.active_package) {
            const configPkg = await this.getPackageByName(userResult.rows[0].active_package);
            if (configPkg) {
                return {
                    package_name: configPkg.name,
                    tasks_per_day: configPkg.tasks_per_day,
                    income_per_task: configPkg.income_per_task,
                    daily_income: configPkg.daily_income,
                    deposit_amount: configPkg.deposit_amount
                };
            }
        }

        return null;
    }

    /**
     * Find package by deposit amount
     */
    getPackageByDeposit(depositAmount) {
        for (const [key, pkg] of Object.entries(packageConfig)) {
            if (pkg.deposit === depositAmount) {
                return {
                    key: key,
                    name: pkg.name || key,
                    deposit: pkg.deposit,
                    tasksPerDay: pkg.tasksPerDay,
                    incomePerTask: pkg.incomePerTask,
                    durationDays: pkg.durationDays || 30,
                    description: pkg.description || ''
                };
            }
        }
        return null;
    }
}

module.exports = new PackagesService();