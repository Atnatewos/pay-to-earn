// modules/config/config.routes.js
const router = require('express').Router();
const tasksConfig = require('../../config/tasks.json');
const withdrawalConfig = require('../../config/withdrawal.json');
const depositConfig = require('../../config/deposit.json');
const platformConfig = require('../../config/platform.json');

/**
 * Generate human-readable schedule description from config
 */
function generateScheduleDescription(schedule, featureName) {
    if (!schedule.enabled) return `${featureName} are currently disabled.`;
    const days = schedule.days.map(d => d.charAt(0).toUpperCase() + d.slice(1, 3)).join(', ');
    return `${featureName} available ${days} ${schedule.hoursStart}-${schedule.hoursEnd}`;
}

// Withdrawal amounts
router.get('/withdrawal-amounts', (req, res) => {
    res.json({ success: true, data: withdrawalConfig.fixedAmounts });
});

// Support info
router.get('/support', (req, res) => {
    res.json({
        success: true,
        data: {
            telegram: platformConfig.support?.telegram || '',
            telegramChannel: platformConfig.support?.telegramChannel || '',
            telegramGroup: platformConfig.support?.telegramGroup || '',
            email: platformConfig.support?.email || '',
            appName: platformConfig.name
        }
    });
});

// Tasks schedule
router.get('/tasks-schedule', (req, res) => {
    const schedule = tasksConfig.schedule;
    res.json({
        success: true,
        data: {
            schedule: schedule,
            instructions: tasksConfig.instructions || [],
            description: generateScheduleDescription(schedule, 'Tasks'),
            videoDuration: tasksConfig.videoDuration || 10
        }
    });
});

// Withdrawal schedule
router.get('/withdrawal-schedule', (req, res) => {
    const schedule = withdrawalConfig.schedule;
    res.json({
        success: true,
        data: {
            schedule: schedule,
            fixedAmounts: withdrawalConfig.fixedAmounts,
            requirePassword: withdrawalConfig.requirePassword,
            description: generateScheduleDescription(schedule, 'Withdrawals'),
            processingTime: withdrawalConfig.processingTime
        }
    });
});

// Deposit schedule
router.get('/deposit-schedule', (req, res) => {
    const schedule = depositConfig.schedule;
    res.json({
        success: true,
        data: {
            schedule: schedule,
            bankName: depositConfig.bankName,
            bankAccount: depositConfig.bankAccount,
            bankHolder: depositConfig.bankHolder,
            description: generateScheduleDescription(schedule, 'Deposits'),
            minAmount: depositConfig.minAmount,
            maxAmount: depositConfig.maxAmount
        }
    });
});

module.exports = router;