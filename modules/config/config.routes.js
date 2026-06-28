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
    if (!schedule || !schedule.enabled) return `${featureName} are currently disabled.`;
    const days = schedule.days.map(d => d.charAt(0).toUpperCase() + d.slice(1, 3)).join(', ');
    return `${featureName} available ${days} ${schedule.hoursStart}-${schedule.hoursEnd}`;
}

// ============ PLATFORM CONFIG ============
router.get('/platform', (req, res) => {
    try {
        res.json({
            success: true,
            data: {
                name: platformConfig.name || 'Pay to Earn',
                fullName: platformConfig.fullName || 'Pay to Earn Platform',
                tagline: platformConfig.tagline || 'Share & Earn',
                adminName: platformConfig.adminName || 'Admin',
                currency: platformConfig.currency || 'ETB',
                currencySymbol: platformConfig.currencySymbol || 'ETB',
                website: platformConfig.website || '',
                logo: platformConfig.logo || {},
                support: platformConfig.support || {}
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to load platform config' });
    }
});

// ============ SUPPORT INFO ============
router.get('/support', (req, res) => {
    try {
        res.json({
            success: true,
            data: {
                telegram: platformConfig.support?.telegram || '',
                telegramChannel: platformConfig.support?.telegramChannel || '',
                telegramGroup: platformConfig.support?.telegramGroup || '',
                email: platformConfig.support?.email || '',
                appName: platformConfig.name || 'Pay to Earn'
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to load support config' });
    }
});

// ============ WITHDRAWAL AMOUNTS ============
router.get('/withdrawal-amounts', (req, res) => {
    try {
        res.json({ 
            success: true, 
            data: withdrawalConfig.fixedAmounts || [] 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to load withdrawal amounts' });
    }
});

// ============ TASKS SCHEDULE ============
router.get('/tasks-schedule', (req, res) => {
    try {
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
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to load tasks schedule' });
    }
});

// ============ WITHDRAWAL SCHEDULE ============
router.get('/withdrawal-schedule', (req, res) => {
    try {
        const schedule = withdrawalConfig.schedule;
        res.json({
            success: true,
            data: {
                schedule: schedule,
                fixedAmounts: withdrawalConfig.fixedAmounts || [],
                requirePassword: withdrawalConfig.requirePassword || false,
                description: generateScheduleDescription(schedule, 'Withdrawals'),
                processingTime: withdrawalConfig.processingTime || '24-48 hours'
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to load withdrawal schedule' });
    }
});

// ============ DEPOSIT SCHEDULE ============
router.get('/deposit-schedule', (req, res) => {
    try {
        const schedule = depositConfig.schedule;
        res.json({
            success: true,
            data: {
                schedule: schedule,
                bankName: depositConfig.bankName || 'CBE',
                bankAccount: depositConfig.bankAccount || '',
                bankHolder: depositConfig.bankHolder || '',
                description: generateScheduleDescription(schedule, 'Deposits'),
                minAmount: depositConfig.minAmount || 0,
                maxAmount: depositConfig.maxAmount || 0
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to load deposit schedule' });
    }
});

// ============ DEPOSIT BANK INFO ============
router.get('/deposit-info', (req, res) => {
    try {
        res.json({
            success: true,
            data: {
                bankName: depositConfig.bankName || 'CBE',
                bankAccount: depositConfig.bankAccount || '',
                bankHolder: depositConfig.bankHolder || '',
                minAmount: depositConfig.minAmount || 0,
                maxAmount: depositConfig.maxAmount || 0
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to load deposit info' });
    }
});

// ============ MANAGER RANKS ============
router.get('/manager-ranks', (req, res) => {
    try {
        const managerConfig = require('../../config/managers.json');
        res.json({
            success: true,
            data: {
                ranks: managerConfig.ranks || [],
                paymentDay: managerConfig.paymentDay || 1,
                description: managerConfig.description || ''
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to load manager ranks' });
    }
});

module.exports = router;