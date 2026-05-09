// modules/tasks/tasks.service.js
const pool = require('../../config/db');
const { COMMISSION, TASK, INTERN } = require('../../config/constants');
const NotificationsService = require('../notifications/notifications.service');

class TasksService {
    async getTodayTask(userId) {
        const today = new Date().toISOString().split('T')[0];

        // Check if user already has tasks for today
        let taskResult = await pool.query(
            'SELECT * FROM daily_tasks WHERE user_id = $1 AND task_date = $2',
            [userId, today]
        );

        // If no task record for today, create one
        if (taskResult.rows.length === 0) {
            const user = await this.getUserPackageInfo(userId);
            
            if (!user) {
                throw new Error('User not found');
            }

            const tasksAllocated = user.active_package 
                ? await this.getAllocatedTasks(user.active_package)
                : 0;

            if (tasksAllocated === 0) {
                throw new Error('No active package. Please deposit to activate a package.');
            }

            // Create new daily task record
            await pool.query(
                'INSERT INTO daily_tasks (user_id, task_date, tasks_allocated) VALUES ($1, $2, $3)',
                [userId, today, tasksAllocated]
            );

            // Re-fetch the newly created task
            taskResult = await pool.query(
                'SELECT * FROM daily_tasks WHERE user_id = $1 AND task_date = $2',
                [userId, today]
            );
        }

        return taskResult.rows[0];
    }

    async getAllocatedTasks(packageName) {
        // Intern package has fixed tasks
        if (packageName === 'Intern') {
            return INTERN.TASKS_PER_DAY;
        }

        // Get tasks per day from package configuration
        const result = await pool.query(
            'SELECT tasks_per_day FROM packages WHERE name = $1 AND is_active = TRUE',
            [packageName]
        );

        return result.rows.length > 0 ? result.rows[0].tasks_per_day : 0;
    }

    async getUserPackageInfo(userId) {
        // Get user's active package and expiry
        const result = await pool.query(
            'SELECT active_package, package_expiry FROM users WHERE id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            return null;
        }

        const user = result.rows[0];

        // Check if package has expired
        if (user.package_expiry && new Date(user.package_expiry) < new Date()) {
            // Intern package special handling (3 days only, mark as used)
            if (user.active_package === 'Intern') {
                await pool.query(
                    'UPDATE users SET active_package = NULL, package_expiry = NULL, is_intern_used = TRUE WHERE id = $1',
                    [userId]
                );
            } else {
                // Regular package - just deactivate
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
        // Get user's active package to determine income per task
        const result = await pool.query(
            'SELECT active_package FROM users WHERE id = $1',
            [userId]
        );

        if (result.rows.length === 0 || !result.rows[0].active_package) {
            return INTERN.INCOME_PER_TASK;
        }

        if (result.rows[0].active_package === 'Intern') {
            return INTERN.INCOME_PER_TASK;
        }

        // Get income per task from package configuration
        const pkgResult = await pool.query(
            'SELECT income_per_task FROM packages WHERE name = $1 AND is_active = TRUE',
            [result.rows[0].active_package]
        );

        return pkgResult.rows.length > 0 ? pkgResult.rows[0].income_per_task : INTERN.INCOME_PER_TASK;
    }

    async completeTask(userId) {

        // CRITICAL: Cap income per task to prevent impossible values
        const maxIncomePerTask = 1000; // Maximum is D8: 625 ETB
        if (incomePerTask > maxIncomePerTask || incomePerTask <= 0) {
            throw new Error('Invalid income per task value');
        }
        
        const client = await pool.connect();

        try {
            // Start transaction
            await client.query('BEGIN');

            // Get today's task
            const today = new Date().toISOString().split('T')[0];
            const taskResult = await client.query(
                'SELECT * FROM daily_tasks WHERE user_id = $1 AND task_date = $2',
                [userId, today]
            );

            if (taskResult.rows.length === 0) {
                throw new Error('No tasks allocated for today');
            }

            const task = taskResult.rows[0];

            // Check if all tasks are already completed
            if (task.is_completed || task.tasks_completed >= task.tasks_allocated) {
                throw new Error('All tasks completed for today');
            }

            // Get income per task based on user's package
            const incomePerTask = await this.getIncomePerTask(userId);

            // Calculate new progress
            const newCompleted = task.tasks_completed + 1;
            const newEarned = parseFloat(task.earned) + incomePerTask;
            const isCompleted = newCompleted >= task.tasks_allocated;

            // Update daily task progress
            await client.query(
                `UPDATE daily_tasks 
                 SET tasks_completed = $1, earned = $2, is_completed = $3
                 WHERE id = $4`,
                [newCompleted, newEarned, isCompleted, task.id]
            );

            // Log individual task completion
            const taskNumber = newCompleted;
            await client.query(
                `INSERT INTO task_logs (user_id, daily_task_id, task_number, earned)
                 VALUES ($1, $2, $3, $4)`,
                [userId, task.id, taskNumber, incomePerTask]
            );

            // Credit user balance for completing the task
            await client.query(
                `UPDATE users 
                 SET balance = balance + $1, total_earned = total_earned + $1
                 WHERE id = $2`,
                [incomePerTask, userId]
            );

            // Get updated balance for transaction record
            const userBalance = await client.query(
                'SELECT balance FROM users WHERE id = $1',
                [userId]
            );

            // Record transaction in ledger
            await client.query(
                `INSERT INTO transactions (user_id, type, amount, balance_after, category, reference_id, description)
                 VALUES ($1, 'credit', $2, $3, 'task_earning', $4, $5)`,
                [userId, incomePerTask, userBalance.rows[0].balance, task.id, 
                 `Task #${taskNumber} completed`]
            );

            // Distribute task commissions to upline (3 levels)
            await this.distributeTaskCommissions(client, userId, incomePerTask);

            // Commit all changes
            await client.query('COMMIT');

            // Send notification if all tasks completed
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
            // Rollback on any error
            await client.query('ROLLBACK');
            throw error;
        } finally {
            // Release client back to pool
            client.release();
        }
    }

    async distributeTaskCommissions(client, userId, taskEarning) {
        // Get upline users up to 3 levels
        const uplineResult = await client.query(
            `SELECT ancestor_id, level FROM user_tree 
             WHERE descendant_id = $1 AND level > 0 AND level <= 3
             ORDER BY level ASC`,
            [userId]
        );

        const upline = uplineResult.rows;

        // Commission rates for task earnings
        const rates = [
            COMMISSION.TASK.LEVEL_1,  // 5% for Level 1
            COMMISSION.TASK.LEVEL_2,  // 2% for Level 2
            COMMISSION.TASK.LEVEL_3   // 1% for Level 3
        ];

        // Distribute commission to each upline user
        for (const uplineUser of upline) {
            const rate = rates[uplineUser.level - 1];
            const commissionAmount = taskEarning * rate;

            // Credit commission to upline user
            await client.query('UPDATE users SET balance = balance + $1, earnings_balance = earnings_balance + $1, total_earned = total_earned + $1 WHERE id = $2', [incomePerTask, userId]);

            // Record commission
            await client.query(
                `INSERT INTO commissions (from_user_id, to_user_id, type, level, amount, source_amount, percentage)
                 VALUES ($1, $2, 'task', $3, $4, $5, $6)`,
                [userId, uplineUser.ancestor_id, uplineUser.level, commissionAmount, taskEarning, rate * 100]
            );

            // Get updated balance for transaction record
            const uplineBalance = await client.query(
                'SELECT balance FROM users WHERE id = $1',
                [uplineUser.ancestor_id]
            );

            // Record transaction in ledger
            await client.query(
                `INSERT INTO transactions (user_id, type, amount, balance_after, category, reference_id, description)
                 VALUES ($1, 'credit', $2, $3, 'commission', $4, $5)`,
                [uplineUser.ancestor_id, commissionAmount, uplineBalance.rows[0].balance, userId,
                 `Task commission level ${uplineUser.level} from user #${userId}`]
            );

            // Send notification for commission received
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

        // Get task logs for paginated history
        const logsResult = await pool.query(
            'SELECT * FROM task_logs WHERE user_id = $1 ORDER BY completed_at DESC LIMIT $2 OFFSET $3',
            [userId, limit, offset]
        );

        // Get total count for pagination
        const countResult = await pool.query(
            'SELECT COUNT(*) as total FROM task_logs WHERE user_id = $1',
            [userId]
        );

        const total = parseInt(countResult.rows[0].total);

        return {
            logs: logsResult.rows,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }

    async getEarningsSummary(userId) {
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

        // Calculate week start (Monday)
        const now = new Date();
        const weekStart = new Date(now.setDate(now.getDate() - now.getDay() + 1))
            .toISOString().split('T')[0];

        // Calculate month start
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
            .toISOString().split('T')[0];

        // Get today's earnings
        const todayResult = await pool.query(
            'SELECT COALESCE(SUM(earned), 0) as amount FROM daily_tasks WHERE user_id = $1 AND task_date = $2',
            [userId, today]
        );

        // Get yesterday's earnings
        const yesterdayResult = await pool.query(
            'SELECT COALESCE(SUM(earned), 0) as amount FROM daily_tasks WHERE user_id = $1 AND task_date = $2',
            [userId, yesterday]
        );

        // Get this week's earnings
        const weekResult = await pool.query(
            'SELECT COALESCE(SUM(earned), 0) as amount FROM daily_tasks WHERE user_id = $1 AND task_date >= $2',
            [userId, weekStart]
        );

        // Get this month's earnings
        const monthResult = await pool.query(
            'SELECT COALESCE(SUM(earned), 0) as amount FROM daily_tasks WHERE user_id = $1 AND task_date >= $2',
            [userId, monthStart]
        );

        // Get total task commissions received
        const taskCommissionResult = await pool.query(
            `SELECT COALESCE(SUM(amount), 0) as total FROM commissions 
             WHERE to_user_id = $1 AND type = 'task'`,
            [userId]
        );

        // Get total referral commissions received
        const referralCommissionResult = await pool.query(
            `SELECT COALESCE(SUM(amount), 0) as total FROM commissions 
             WHERE to_user_id = $1 AND type = 'referral'`,
            [userId]
        );

        // Get total all commissions
        const totalCommissionResult = await pool.query(
            'SELECT COALESCE(SUM(amount), 0) as total FROM commissions WHERE to_user_id = $1',
            [userId]
        );

        // Get user stats
        const userResult = await pool.query(
            'SELECT total_earned, total_deposited, balance FROM users WHERE id = $1',
            [userId]
        );

        const user = userResult.rows[0] || { total_earned: 0, total_deposited: 0, balance: 0 };

        return {
            todayEarnings: parseFloat(todayResult.rows[0].amount),
            yesterdayEarnings: parseFloat(yesterdayResult.rows[0].amount),
            weekEarnings: parseFloat(weekResult.rows[0].amount),
            monthEarnings: parseFloat(monthResult.rows[0].amount),
            totalEarned: parseFloat(user.total_earned),
            totalDeposited: parseFloat(user.total_deposited),
            balance: parseFloat(user.balance),
            taskCommissions: parseFloat(taskCommissionResult.rows[0].total),
            referralCommissions: parseFloat(referralCommissionResult.rows[0].total),
            totalCommissions: parseFloat(totalCommissionResult.rows[0].total)
        };
    }
}

module.exports = new TasksService();