// modules/tasks/tasks.service.js
const pool = require('../../config/db');
const NotificationsService = require('../notifications/notifications.service');
const MoneyService = require('../money/money.service');

// ============ CONFIG FILES ============
const taskConfig = require('../../config/tasks.json');
const packageConfig = require('../../config/packages.json');
const commissionConfig = require('../../config/commissions.json');

class TasksService {

    /**
     * Check if tasks are available right now based on schedule config
     * @returns {object} { allowed: boolean, message: string }
     */
    checkSchedule() {
        const schedule = taskConfig.schedule;

        // If schedule is disabled, tasks are never available
        if (!schedule.enabled) {
            return { allowed: false, message: 'Tasks are currently disabled.' };
        }

        // Check day of week
        const now = new Date();
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const todayName = dayNames[now.getDay()];

        if (!schedule.days.includes(todayName)) {
            const availableDays = schedule.days
                .map(d => d.charAt(0).toUpperCase() + d.slice(1, 3))
                .join(', ');
            return {
                allowed: false,
                message: `Tasks are only available on: ${availableDays}. Today is ${todayName.charAt(0).toUpperCase() + todayName.slice(1)}.`
            };
        }

        // Check hours
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTime = currentHour * 60 + currentMinute;

        const [startHour, startMin] = schedule.hoursStart.split(':').map(Number);
        const [endHour, endMin] = schedule.hoursEnd.split(':').map(Number);
        const startTime = startHour * 60 + startMin;
        const endTime = endHour * 60 + endMin;

        if (currentTime < startTime || currentTime > endTime) {
            return {
                allowed: false,
                message: `Tasks are available from ${schedule.hoursStart} to ${schedule.hoursEnd}.`
            };
        }

        return { allowed: true };
    }

    /**
     * Generate description text from schedule config
     */
    getScheduleDescription() {
        const schedule = taskConfig.schedule;
        if (!schedule.enabled) return 'Tasks are currently disabled.';

        const days = schedule.days
            .map(d => d.charAt(0).toUpperCase() + d.slice(1, 3))
            .join(', ');
        return `Tasks are available ${days} from ${schedule.hoursStart} to ${schedule.hoursEnd}`;
    }

    /**
     * Get task instructions from config
     */
    getInstructions() {
        return taskConfig.instructions || [
            'Click "Start Task"',
            'Solve the captcha challenge',
            'Watch a short video',
            'Confirm with another captcha',
            'Earn ETB instantly!'
        ];
    }

    async getTodayTask(userId) {
        // Check schedule before allocating tasks
        const scheduleCheck = this.checkSchedule();
        if (!scheduleCheck.allowed) {
            // Return a "rest day" response instead of throwing error
            return {
                id: null,
                tasks_allocated: 0,
                tasks_completed: 0,
                earned: 0,
                is_completed: true,
                is_rest_day: true,
                message: scheduleCheck.message,
                schedule_description: this.getScheduleDescription()
            };
        }

        const today = new Date().toISOString().split('T')[0];
        let taskResult = await pool.query(
            'SELECT * FROM daily_tasks WHERE user_id = $1 AND task_date = $2',
            [userId, today]
        );

        if (taskResult.rows.length === 0) {
            const user = await this.getUserPackageInfo(userId);
            if (!user) throw new Error('User not found');

            const tasksAllocated = user.active_package
                ? await this.getAllocatedTasks(user.active_package)
                : 0;

            if (tasksAllocated === 0) {
                throw new Error('No active package. Please deposit to activate a package.');
            }

            await pool.query(
                'INSERT INTO daily_tasks (user_id, task_date, tasks_allocated) VALUES ($1, $2, $3)',
                [userId, today, tasksAllocated]
            );

            taskResult = await pool.query(
                'SELECT * FROM daily_tasks WHERE user_id = $1 AND task_date = $2',
                [userId, today]
            );
        }

        return taskResult.rows[0];
    }

    async getAllocatedTasks(packageName) {
        const pkg = packageConfig[packageName];
        if (pkg) return pkg.tasksPerDay;

        const result = await pool.query(
            'SELECT tasks_per_day FROM packages WHERE name = $1 AND is_active = TRUE',
            [packageName]
        );
        return result.rows.length > 0 ? result.rows[0].tasks_per_day : 0;
    }

    async getUserPackageInfo(userId) {
        const result = await pool.query(
            'SELECT active_package, package_expiry FROM users WHERE id = $1',
            [userId]
        );
        if (result.rows.length === 0) return null;

        const user = result.rows[0];

        if (user.package_expiry && new Date(user.package_expiry) < new Date()) {
            if (user.active_package === 'Intern') {
                await pool.query(
                    'UPDATE users SET active_package = NULL, package_expiry = NULL, is_intern_used = TRUE WHERE id = $1',
                    [userId]
                );
            } else {
                await pool.query(
                    'UPDATE users SET active_package = NULL, package_expiry = NULL WHERE id = $1',
                    [userId]
                );
            }
            return { ...user, active_package: null };
        }

        return user;
    }

    async getIncomePerTask(userId) {
        const result = await pool.query(
            'SELECT active_package FROM users WHERE id = $1',
            [userId]
        );
        if (result.rows.length === 0 || !result.rows[0].active_package) {
            const internPkg = packageConfig['Intern'];
            return internPkg ? internPkg.incomePerTask : 12;
        }

        const packageName = result.rows[0].active_package;
        const pkg = packageConfig[packageName];
        if (pkg) return pkg.incomePerTask;

        const pkgResult = await pool.query(
            'SELECT income_per_task FROM packages WHERE name = $1 AND is_active = TRUE',
            [packageName]
        );
        return pkgResult.rows.length > 0 ? pkgResult.rows[0].income_per_task : 12;
    }

    async completeTask(userId) {
        // Check schedule
        const scheduleCheck = this.checkSchedule();
        if (!scheduleCheck.allowed) {
            throw new Error(scheduleCheck.message);
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const today = new Date().toISOString().split('T')[0];
            const taskResult = await client.query(
                'SELECT * FROM daily_tasks WHERE user_id = $1 AND task_date = $2',
                [userId, today]
            );

            if (taskResult.rows.length === 0) {
                throw new Error('No tasks allocated for today');
            }

            const task = taskResult.rows[0];
            if (task.is_completed || task.tasks_completed >= task.tasks_allocated) {
                throw new Error('All tasks completed for today');
            }

            const incomePerTask = await this.getIncomePerTask(userId);
            const maxIncome = taskConfig.maxIncomePerTask || 1000;

            if (incomePerTask > maxIncome || incomePerTask <= 0) {
                throw new Error('Invalid income per task value');
            }

            const newCompleted = task.tasks_completed + 1;
            const newEarned = parseFloat(task.earned) + incomePerTask;
            const isCompleted = newCompleted >= task.tasks_allocated;

            await client.query(
                'UPDATE daily_tasks SET tasks_completed = $1, earned = $2, is_completed = $3 WHERE id = $4',
                [newCompleted, newEarned, isCompleted, task.id]
            );

            await client.query(
                'INSERT INTO task_logs (user_id, daily_task_id, task_number, earned) VALUES ($1, $2, $3, $4)',
                [userId, task.id, newCompleted, incomePerTask]
            );

            await MoneyService.credit(
                userId,
                incomePerTask,
                'earnings',
                'task_earning',
                `Task #${newCompleted} completed`,
                task.id
            );

            await this.distributeTaskCommissions(client, userId, incomePerTask);
            await client.query('COMMIT');

            if (isCompleted) {
                await NotificationsService.create(
                    userId,
                    'All Tasks Completed 🎉',
                    `You completed all ${task.tasks_allocated} tasks today and earned ${newEarned.toFixed(2)} ETB. Come back tomorrow!`,
                    'task',
                    task.id
                );
            }

            return {
                tasksCompleted: newCompleted,
                tasksAllocated: task.tasks_allocated,
                earned: incomePerTask,
                totalEarnedToday: newEarned,
                isCompleted
            };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async distributeTaskCommissions(client, userId, taskEarning) {
        const uplineResult = await client.query(
            'SELECT ancestor_id, level FROM user_tree WHERE descendant_id = $1 AND level > 0 AND level <= 3 ORDER BY level ASC',
            [userId]
        );

        const rates = [
            commissionConfig.task.level1.rate,
            commissionConfig.task.level2.rate,
            commissionConfig.task.level3.rate
        ];

        for (const uplineUser of uplineResult.rows) {
            const rate = rates[uplineUser.level - 1];
            const commissionAmount = taskEarning * rate;
            if (commissionAmount <= 0) continue;

            await MoneyService.credit(
                uplineUser.ancestor_id,
                commissionAmount,
                'earnings',
                'commission',
                `Task commission level ${uplineUser.level} from user #${userId}`,
                userId
            );

            await client.query(
                'INSERT INTO commissions (from_user_id, to_user_id, type, level, amount, source_amount, percentage) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                [userId, uplineUser.ancestor_id, 'task', uplineUser.level, commissionAmount, taskEarning, rate * 100]
            );

            if (commissionAmount > 0) {
                await NotificationsService.create(
                    uplineUser.ancestor_id,
                    'Task Commission ✅',
                    `You earned ${commissionAmount.toFixed(2)} ETB from a Level ${uplineUser.level} team member's task.`,
                    'task',
                    userId
                );
            }
        }
    }

    async getTaskHistory(userId, page = 1, limit = 20) {
        const offset = (page - 1) * limit;
        const logsResult = await pool.query(
            'SELECT * FROM task_logs WHERE user_id = $1 ORDER BY completed_at DESC LIMIT $2 OFFSET $3',
            [userId, limit, offset]
        );
        const countResult = await pool.query(
            'SELECT COUNT(*) as total FROM task_logs WHERE user_id = $1',
            [userId]
        );
        return {
            logs: logsResult.rows,
            pagination: {
                page,
                limit,
                total: parseInt(countResult.rows[0].total),
                pages: Math.ceil(parseInt(countResult.rows[0].total) / limit)
            }
        };
    }

    async getEarningsSummary(userId) {
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        const weekStart = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
        const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

        const todayResult = await pool.query(
            'SELECT COALESCE(SUM(earned), 0) as amount FROM daily_tasks WHERE user_id = $1 AND task_date = $2',
            [userId, today]
        );
        const yesterdayResult = await pool.query(
            'SELECT COALESCE(SUM(earned), 0) as amount FROM daily_tasks WHERE user_id = $1 AND task_date = $2',
            [userId, yesterday]
        );
        const weekResult = await pool.query(
            'SELECT COALESCE(SUM(earned), 0) as amount FROM daily_tasks WHERE user_id = $1 AND task_date >= $2',
            [userId, weekStart]
        );
        const monthResult = await pool.query(
            'SELECT COALESCE(SUM(earned), 0) as amount FROM daily_tasks WHERE user_id = $1 AND task_date >= $2',
            [userId, monthStart]
        );
        const taskCommResult = await pool.query(
            "SELECT COALESCE(SUM(amount), 0) as total FROM commissions WHERE to_user_id = $1 AND type = 'task'",
            [userId]
        );
        const refCommResult = await pool.query(
            "SELECT COALESCE(SUM(amount), 0) as total FROM commissions WHERE to_user_id = $1 AND type = 'referral'",
            [userId]
        );
        const totalCommResult = await pool.query(
            'SELECT COALESCE(SUM(amount), 0) as total FROM commissions WHERE to_user_id = $1',
            [userId]
        );
        const userResult = await pool.query(
            'SELECT total_earned, total_deposited, balance, capital, earnings_balance FROM users WHERE id = $1',
            [userId]
        );
        const user = userResult.rows[0] || {
            total_earned: 0, total_deposited: 0, balance: 0, capital: 0, earnings_balance: 0
        };

        return {
            todayEarnings: parseFloat(todayResult.rows[0].amount),
            yesterdayEarnings: parseFloat(yesterdayResult.rows[0].amount),
            weekEarnings: parseFloat(weekResult.rows[0].amount),
            monthEarnings: parseFloat(monthResult.rows[0].amount),
            totalEarned: parseFloat(user.total_earned),
            totalDeposited: parseFloat(user.total_deposited),
            balance: parseFloat(user.balance),
            capital: parseFloat(user.capital),
            earningsBalance: parseFloat(user.earnings_balance),
            taskCommissions: parseFloat(taskCommResult.rows[0].total),
            referralCommissions: parseFloat(refCommResult.rows[0].total),
            totalCommissions: parseFloat(totalCommResult.rows[0].total)
        };
    }
}

module.exports = new TasksService();