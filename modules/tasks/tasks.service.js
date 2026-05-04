// modules/tasks/tasks.service.js
const pool = require('../../config/db');
const { COMMISSION, TASK, INTERN } = require('../../config/constants');
const NotificationsService = require('../notifications/notifications.service');

class TasksService {
    async getTodayTask(userId) {
        const today = new Date().toISOString().split('T')[0];

        let [tasks] = await pool.query(
            'SELECT * FROM daily_tasks WHERE user_id = ? AND task_date = ?',
            [userId, today]
        );

        if (tasks.length === 0) {
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

            await pool.query(
                'INSERT INTO daily_tasks (user_id, task_date, tasks_allocated) VALUES (?, ?, ?)',
                [userId, today, tasksAllocated]
            );

            [tasks] = await pool.query(
                'SELECT * FROM daily_tasks WHERE user_id = ? AND task_date = ?',
                [userId, today]
            );
        }

        return tasks[0];
    }

    async getAllocatedTasks(packageName) {
        if (packageName === 'Intern') return INTERN.TASKS_PER_DAY;

        const [packages] = await pool.query(
            'SELECT tasks_per_day FROM packages WHERE name = ? AND is_active = TRUE',
            [packageName]
        );

        return packages.length > 0 ? packages[0].tasks_per_day : 0;
    }

    async getUserPackageInfo(userId) {
        const [users] = await pool.query(
            'SELECT active_package, package_expiry FROM users WHERE id = ?',
            [userId]
        );

        if (users.length === 0) return null;

        const user = users[0];

        if (user.package_expiry && new Date(user.package_expiry) < new Date()) {
            if (user.active_package === 'Intern') {
                await pool.query(
                    'UPDATE users SET active_package = NULL, package_expiry = NULL, is_intern_used = TRUE WHERE id = ?',
                    [userId]
                );
            } else {
                await pool.query(
                    'UPDATE users SET active_package = NULL, package_expiry = NULL WHERE id = ?',
                    [userId]
                );
            }
            return { ...user, active_package: null };
        }

        return user;
    }

    async completeTask(userId) {
        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            const today = new Date().toISOString().split('T')[0];
            const [tasks] = await connection.query(
                'SELECT * FROM daily_tasks WHERE user_id = ? AND task_date = ?',
                [userId, today]
            );

            if (tasks.length === 0) {
                throw new Error('No tasks allocated for today');
            }

            const task = tasks[0];

            if (task.is_completed || task.tasks_completed >= task.tasks_allocated) {
                throw new Error('All tasks completed for today');
            }

            const incomePerTask = await this.getIncomePerTask(connection, userId);

            const newCompleted = task.tasks_completed + 1;
            const newEarned = task.earned + incomePerTask;
            const isCompleted = newCompleted >= task.tasks_allocated;

            await connection.query(
                `UPDATE daily_tasks 
                 SET tasks_completed = ?, earned = ?, is_completed = ?
                 WHERE id = ?`,
                [newCompleted, newEarned, isCompleted, task.id]
            );

            const taskNumber = newCompleted;
            await connection.query(
                `INSERT INTO task_logs (user_id, daily_task_id, task_number, earned)
                 VALUES (?, ?, ?, ?)`,
                [userId, task.id, taskNumber, incomePerTask]
            );

            await connection.query(
                `UPDATE users 
                 SET balance = balance + ?, total_earned = total_earned + ?
                 WHERE id = ?`,
                [incomePerTask, incomePerTask, userId]
            );

            const [userBalance] = await connection.query(
                'SELECT balance FROM users WHERE id = ?',
                [userId]
            );

            await connection.query(
                `INSERT INTO transactions (user_id, type, amount, balance_after, category, reference_id, description)
                 VALUES (?, 'credit', ?, ?, 'task_earning', ?, ?)`,
                [userId, incomePerTask, userBalance[0].balance, task.id, 
                 `Task #${taskNumber} completed`]
            );

            const upline = await this.distributeTaskCommissions(connection, userId, incomePerTask);

            await connection.commit();

            // Send notifications to upline
            if (upline && upline.length > 0) {
                const rates = [COMMISSION.TASK.LEVEL_1, COMMISSION.TASK.LEVEL_2, COMMISSION.TASK.LEVEL_3];
                for (const uplineUser of upline) {
                    const rate = rates[uplineUser.level - 1];
                    const commissionAmount = incomePerTask * rate;
                    
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

            // Notify user if all tasks completed
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
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    async getIncomePerTask(connection, userId) {
        const [users] = await connection.query(
            'SELECT active_package FROM users WHERE id = ?',
            [userId]
        );

        if (users.length === 0 || !users[0].active_package) {
            return INTERN.INCOME_PER_TASK;
        }

        if (users[0].active_package === 'Intern') {
            return INTERN.INCOME_PER_TASK;
        }

        const [packages] = await connection.query(
            'SELECT income_per_task FROM packages WHERE name = ? AND is_active = TRUE',
            [users[0].active_package]
        );

        return packages.length > 0 ? packages[0].income_per_task : INTERN.INCOME_PER_TASK;
    }

    async distributeTaskCommissions(connection, userId, taskEarning) {
        const [upline] = await connection.query(
            `SELECT ancestor_id, level FROM user_tree 
             WHERE descendant_id = ? AND level > 0 AND level <= 3
             ORDER BY level ASC`,
            [userId]
        );

        const rates = [
            COMMISSION.TASK.LEVEL_1,
            COMMISSION.TASK.LEVEL_2,
            COMMISSION.TASK.LEVEL_3
        ];

        for (const uplineUser of upline) {
            const rate = rates[uplineUser.level - 1];
            const commissionAmount = taskEarning * rate;

            await connection.query(
                'UPDATE users SET balance = balance + ?, total_earned = total_earned + ? WHERE id = ?',
                [commissionAmount, commissionAmount, uplineUser.ancestor_id]
            );

            await connection.query(
                `INSERT INTO commissions (from_user_id, to_user_id, type, level, amount, source_amount, percentage)
                 VALUES (?, ?, 'task', ?, ?, ?, ?)`,
                [userId, uplineUser.ancestor_id, uplineUser.level, commissionAmount, taskEarning, rate * 100]
            );

            const [uplineBalance] = await connection.query(
                'SELECT balance FROM users WHERE id = ?',
                [uplineUser.ancestor_id]
            );

            await connection.query(
                `INSERT INTO transactions (user_id, type, amount, balance_after, category, reference_id, description)
                 VALUES (?, 'credit', ?, ?, 'commission', ?, ?)`,
                [uplineUser.ancestor_id, commissionAmount, uplineBalance[0].balance, userId,
                 `Task commission level ${uplineUser.level} from user #${userId}`]
            );
        }

        return upline;
    }

    async getTaskHistory(userId, page = 1, limit = 20) {
        const offset = (page - 1) * limit;

        const [logs] = await pool.query(
            'SELECT * FROM task_logs WHERE user_id = ? ORDER BY completed_at DESC LIMIT ? OFFSET ?',
            [userId, limit, offset]
        );

        const [[{ total }]] = await pool.query(
            'SELECT COUNT(*) as total FROM task_logs WHERE user_id = ?',
            [userId]
        );

        return {
            logs,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        };
    }

    async getEarningsSummary(userId) {
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

        const now = new Date();
        const weekStart = new Date(now.setDate(now.getDate() - now.getDay() + 1))
            .toISOString().split('T')[0];
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
            .toISOString().split('T')[0];

        const [
            [todayEarnings],
            [yesterdayEarnings],
            [weekEarnings],
            [monthEarnings],
            [taskCommissions],
            [referralCommissions],
            [totalCommissions]
        ] = await Promise.all([
            pool.query(
                'SELECT COALESCE(SUM(earned), 0) as amount FROM daily_tasks WHERE user_id = ? AND task_date = ?',
                [userId, today]
            ),
            pool.query(
                'SELECT COALESCE(SUM(earned), 0) as amount FROM daily_tasks WHERE user_id = ? AND task_date = ?',
                [userId, yesterday]
            ),
            pool.query(
                'SELECT COALESCE(SUM(earned), 0) as amount FROM daily_tasks WHERE user_id = ? AND task_date >= ?',
                [userId, weekStart]
            ),
            pool.query(
                'SELECT COALESCE(SUM(earned), 0) as amount FROM daily_tasks WHERE user_id = ? AND task_date >= ?',
                [userId, monthStart]
            ),
            pool.query(
                `SELECT COALESCE(SUM(amount), 0) as total FROM commissions 
                 WHERE to_user_id = ? AND type = 'task'`,
                [userId]
            ),
            pool.query(
                `SELECT COALESCE(SUM(amount), 0) as total FROM commissions 
                 WHERE to_user_id = ? AND type = 'referral'`,
                [userId]
            ),
            pool.query(
                'SELECT COALESCE(SUM(amount), 0) as total FROM commissions WHERE to_user_id = ?',
                [userId]
            )
        ]);

        const [user] = await pool.query(
            'SELECT total_earned, total_deposited, balance FROM users WHERE id = ?',
            [userId]
        );

        return {
            todayEarnings: todayEarnings[0].amount,
            yesterdayEarnings: yesterdayEarnings[0].amount,
            weekEarnings: weekEarnings[0].amount,
            monthEarnings: monthEarnings[0].amount,
            totalEarned: user[0]?.total_earned || 0,
            totalDeposited: user[0]?.total_deposited || 0,
            balance: user[0]?.balance || 0,
            taskCommissions: taskCommissions[0].total,
            referralCommissions: referralCommissions[0].total,
            totalCommissions: totalCommissions[0].total
        };
    }
}

module.exports = new TasksService();