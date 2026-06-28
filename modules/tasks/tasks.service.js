// modules/tasks/tasks.service.js
const pool = require('../../config/db');
const NotificationsService = require('../notifications/notifications.service');
const MoneyService = require('../money/money.service');

// ============ CONFIG FILES ============
const taskConfig = require('../../config/tasks.json');
const packageConfig = require('../../config/packages.json');
const commissionConfig = require('../../config/commissions.json');
var messagesConfig = require('../../config/messages.json');

class TasksService {

    /**
     * Check if tasks are available right now based on schedule config
     * @returns {object} { allowed: boolean, message: string }
     */
    checkSchedule() {
        const schedule = taskConfig.schedule;

        // If schedule is disabled, tasks are never available
        if (!schedule.enabled) {
            return { allowed: false, message: messagesConfig.task.scheduleDisabled };
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
                message: messagesConfig.task.scheduleDayOff
                    .replace('{days}', availableDays)
                    .replace('{today}', todayName.charAt(0).toUpperCase() + todayName.slice(1))
            };
        }

        // Check hours range (converted to minutes since midnight)
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const [startH, startM] = schedule.hoursStart.split(':').map(Number);
        const [endH, endM] = schedule.hoursEnd.split(':').map(Number);
        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;

        if (currentMinutes < startMinutes || currentMinutes > endMinutes) {
            return {
                allowed: false,
                message: messagesConfig.task.scheduleHoursOff
                    .replace('{start}', schedule.hoursStart)
                    .replace('{end}', schedule.hoursEnd)
            };
        }

        return { allowed: true };
    }

    /**
     * Get a human readable description of the task workflow schedule
     * @returns {string}
     */
    getScheduleDescription() {
        const schedule = taskConfig.schedule;
        if (!schedule.enabled) return messagesConfig.task.scheduleDisabled;

        const days = schedule.days
            .map(d => d.charAt(0).toUpperCase() + d.slice(1, 3))
            .join(', ');
        return `Tasks are available ${days} from ${schedule.hoursStart} to ${schedule.hoursEnd}. Reset happens every night at midnight.`;
    }

    /**
     * Get or initialize today's task state for a user
     * Validates active packages and dynamically updates/allocates parameters from package config
     */
    async getTodayTask(userId) {
        // 1. Get user and their current package allocation info
        const userResult = await pool.query(
            'SELECT active_package, package_expiry FROM users WHERE id = $1',
            [userId]
        );
        const user = userResult.rows[0];

        if (!user || !user.active_package) {
            throw new Error(messagesConfig.task.noPackage);
        }

        // Check package expiration date if applicable
        if (user.package_expiry && new Date(user.package_expiry) < new Date()) {
            // Package expired -> clear it out
            await pool.query('UPDATE users SET active_package = NULL, package_expiry = NULL WHERE id = $1', [userId]);
            throw new Error(messagesConfig.task.noPackage);
        }

        // 2. Extract configuration limits matching user's exact tier
        const currentPkg = packageConfig.tiers[user.active_package];
        if (!currentPkg) {
            throw new Error('Active package configuration mismatch or corrupted tier structural values.');
        }

        // 3. Check if a task status record already exists for today
        let taskResult = await pool.query(
            'SELECT * FROM user_tasks WHERE user_id = $1 AND date = CURRENT_DATE',
            [userId]
        );

        // If not found, create a initialized placeholder tracking ledger for today
        if (taskResult.rows.length === 0) {
            const allocatedCount = currentPkg.dailyTasks;
            const incomePerTask = currentPkg.incomePerTask;

            const insertResult = await pool.query(
                `INSERT INTO user_tasks (user_id, date, package_name, tasks_allocated, income_per_task, tasks_completed, total_earned) 
                 VALUES ($1, CURRENT_DATE, $2, $3, $4, 0, 0.00) RETURNING *`,
                [userId, user.active_package, allocatedCount, incomePerTask]
            );
            return insertResult.rows[0];
        }

        return taskResult.rows[0];
    }

    /**
     * Execute/Complete a single incremental subtask unit
     * Allocates funds instantly to earnings balance and fires upline unilevel unearned commissions
     */
    async completeTask(userId) {
        // Schedule availability validation guard
        const scheduleCheck = this.checkSchedule();
        if (!scheduleCheck.allowed) throw new Error(scheduleCheck.message);

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Fetch running allocations
            const task = await this.getTodayTask(userId);

            if (!task || task.tasks_allocated <= 0) {
                throw new Error(messagesConfig.task.noTasksAllocated);
            }
            if (task.tasks_completed >= task.tasks_allocated) {
                throw new Error(messagesConfig.task.allDone);
            }

            const incomePerTask = parseFloat(task.income_per_task);
            if (isNaN(incomePerTask) || incomePerTask <= 0) {
                throw new Error(messagesConfig.task.invalidIncome);
            }

            // 1. Core update -> increment counter states
            const newCompleted = task.tasks_completed + 1;
            const newEarned = parseFloat(task.total_earned) + incomePerTask;
            const isAllFinished = newCompleted === task.tasks_allocated;

            await client.query(
                `UPDATE user_tasks 
                 SET tasks_completed = $1, total_earned = $2, updated_at = NOW() 
                 WHERE id = $3`,
                [newCompleted, newEarned, task.id]
            );

            // 2. Disburse direct dynamic wallet credits to EARNINGS via core ledger service
            await MoneyService.credit(
                userId,
                incomePerTask,
                'earnings',
                'task_income',
                `Earned from task execution increment unit (${newCompleted}/${task.tasks_allocated})`,
                task.id
            );

            // 3. Unilevel Multi-tier inline downline distribution engine pass
            await this.distributeTaskCommissions(client, userId, incomePerTask, task.id);

            await client.query('COMMIT');

            // 4. Push final system banner/alert alerts if batch sequence completes entirely
            if (isAllFinished) {
                const systemAlertMsg = messagesConfig.task.allCompleted
                    .replace('{count}', task.tasks_allocated)
                    .replace('{amount}', newEarned.toFixed(2));

                await pool.query(
                    `INSERT INTO user_alerts (user_id, title, message, type, icon, color) 
                     VALUES ($1, 'Day Batch Complete!', $2, 'success', '🎯', 'gradient-success')`,
                    [userId, systemAlertMsg]
                );
                await NotificationsService.create(userId, 'Batch Completed! 🎯', systemAlertMsg, 'task', task.id);
            }

            return {
                task_id: task.id,
                tasks_allocated: task.tasks_allocated,
                tasks_completed: newCompleted,
                income_per_task: incomePerTask,
                total_earned: newEarned,
                completed_now: true,
                batch_finished: isAllFinished
            };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Unilevel network commission payout dispatcher for completing individual tasks (up to 3 levels)
     */
    async distributeTaskCommissions(client, userId, sourceAmount, referenceId) {
        // Query downline network map hierarchy tree levels
        const treeResult = await client.query(
            'SELECT ancestor_id, level FROM user_tree WHERE descendant_id = $1 AND level > 0 AND level <= 3 ORDER BY level ASC',
            [userId]
        );
        const uplineUsers = treeResult.rows;

        const commissionRates = [
            commissionConfig.task.level1.rate,
            commissionConfig.task.level2.rate,
            commissionConfig.task.level3.rate
        ];

        // Process network tree arrays
        for (let i = 0; i < uplineUsers.length; i++) {
            const uplineUser = uplineUsers[i];
            const rate = commissionRates[uplineUser.level - 1];
            const commissionAmount = sourceAmount * rate;

            if (commissionAmount <= 0) continue;

            // 1. Inject directly into running wallet instance state
            await MoneyService.credit(
                uplineUser.ancestor_id,
                commissionAmount,
                'earnings',
                'commission',
                `Network matching task incentive tier Level ${uplineUser.level} from downline user #${userId}`,
                referenceId
            );

            // 2. Append immutable record to standard analytic table structures
            await client.query(
                `INSERT INTO commissions (from_user_id, to_user_id, type, level, amount, source_amount, percentage) 
                 VALUES ($1, $2, 'task', $3, $4, $5, $6)`,
                [userId, uplineUser.ancestor_id, uplineUser.level, commissionAmount, sourceAmount, rate * 100]
            );

            // 3. Fire local standard push event notify configurations
            const alertMsg = messagesConfig.task.commissionReceived
                .replace('{amount}', commissionAmount.toFixed(2))
                .replace('{level}', uplineUser.level);

            await NotificationsService.create(
                uplineUser.ancestor_id,
                'Team Task Commission 💸',
                alertMsg,
                'commission',
                referenceId
            );
        }
    }

    /**
     * Return custom analytical metrics summary object for front dashboards 
     * (Renamed to getEarningsSummary to match tasks.routes.js expectations)
     */
    async getEarningsSummary(userId) {
        const todayResult = await pool.query(
            "SELECT COALESCE(SUM(amount), 0) as amount FROM transactions WHERE user_id = $1 AND category = 'task_income' AND created_at >= CURRENT_DATE",
            [userId]
        );
        const yesterdayResult = await pool.query(
            "SELECT COALESCE(SUM(amount), 0) as amount FROM transactions WHERE user_id = $1 AND category = 'task_income' AND created_at >= CURRENT_DATE - INTERVAL '1 day' AND created_at < CURRENT_DATE",
            [userId]
        );
        const weekResult = await pool.query(
            "SELECT COALESCE(SUM(amount), 0) as amount FROM transactions WHERE user_id = $1 AND category = 'task_income' AND created_at >= CURRENT_DATE - INTERVAL '7 days'",
            [userId]
        );
        const monthResult = await pool.query(
            "SELECT COALESCE(SUM(amount), 0) as amount FROM transactions WHERE user_id = $1 AND category = 'task_income' AND created_at >= CURRENT_DATE - INTERVAL '30 days'",
            [userId]
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

    // Keep this as an alias just in case other files are calling the old name
    async getPerformanceStats(userId) {
        return this.getEarningsSummary(userId);
    }
}

module.exports = new TasksService();