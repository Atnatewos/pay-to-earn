// modules/config/config.routes.js
const router = require('express').Router();
const tasksConfig = require('../../config/tasks.json');
const withdrawalConfig = require('../../config/withdrawal.json');
const depositConfig = require('../../config/deposit.json');
const platformConfig = require('../../config/platform.json');

/**
 * Generate human-readable schedule description from config
 * @param {object} schedule - Schedule config with days and hours
 * @param {string} featureName - Name of the feature (Tasks, Withdrawals, Deposits)
 * @returns {string} Human-readable schedule description
 */
function generateScheduleDescription(schedule, featureName) {
    if (!schedule.enabled) return `${featureName} are currently disabled.`;
    const days = schedule.days.map(d => d.charAt(0).toUpperCase() + d.slice(1, 3)).join(', ');
    return `${featureName} available ${days} ${schedule.hoursStart}-${schedule.hoursEnd}`;
}

// ============ PLATFORM CONFIG ============
// Serves ALL platform settings to the frontend
router.get('/platform', (req, res) => {
    res.json({
        success: true,
        data: {
            name: platformConfig.name,
            fullName: platformConfig.fullName,
            tagline: platformConfig.tagline,
            adminName: platformConfig.adminName,
            currency: platformConfig.currency,
            currencySymbol: platformConfig.currencySymbol,
            website: platformConfig.website,
            logo: platformConfig.logo,
            support: platformConfig.support
        }
    });
});

// ============ SUPPORT INFO ============
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

// ============ WITHDRAWAL AMOUNTS ============
router.get('/withdrawal-amounts', (req, res) => {
    res.json({ success: true, data: withdrawalConfig.fixedAmounts });
});

// ============ TASKS SCHEDULE ============
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

// ============ WITHDRAWAL SCHEDULE ============
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

// ============ DEPOSIT SCHEDULE ============
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

// ============ DEPOSIT BANK INFO ============
router.get('/deposit-info', (req, res) => {
    res.json({
        success: true,
        data: {
            bankName: depositConfig.bankName,
            bankAccount: depositConfig.bankAccount,
            bankHolder: depositConfig.bankHolder,
            minAmount: depositConfig.minAmount,
            maxAmount: depositConfig.maxAmount
        }
    });
});

// ============ MANAGER RANKS ============
// Serves manager rank definitions from config
router.get('/manager-ranks', (req, res) => {
    const managerConfig = require('../../config/managers.json');
    res.json({
        success: true,
        data: {
            ranks: managerConfig.ranks || [],
            paymentDay: managerConfig.paymentDay || 1,
            description: managerConfig.description || ''
        }
    });
});

module.exports = router;