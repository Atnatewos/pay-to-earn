// modules/config/config.routes.js - Add schedule endpoints
router.get('/tasks-schedule', (req, res) => {
    const config = require('../../config/tasks.json');
    res.json({
        success: true,
        data: {
            schedule: config.schedule,
            instructions: config.instructions,
            description: generateScheduleDescription(config.schedule, 'Tasks'),
            videoDuration: config.videoDuration
        }
    });
});

router.get('/withdrawal-schedule', (req, res) => {
    const config = require('../../config/withdrawal.json');
    res.json({
        success: true,
        data: {
            schedule: config.schedule,
            fixedAmounts: config.fixedAmounts,
            requirePassword: config.requirePassword,
            description: generateScheduleDescription(config.schedule, 'Withdrawals'),
            processingTime: config.processingTime
        }
    });
});

router.get('/deposit-schedule', (req, res) => {
    const config = require('../../config/deposit.json');
    res.json({
        success: true,
        data: {
            schedule: config.schedule,
            bankName: config.bankName,
            bankAccount: config.bankAccount,
            bankHolder: config.bankHolder,
            description: generateScheduleDescription(config.schedule, 'Deposits'),
            minAmount: config.minAmount,
            maxAmount: config.maxAmount
        }
    });
});

// Helper function
function generateScheduleDescription(schedule, featureName) {
    if (!schedule.enabled) return `${featureName} are currently disabled.`;
    const days = schedule.days.map(d => d.charAt(0).toUpperCase() + d.slice(1, 3)).join(', ');
    return `${featureName} available ${days} ${schedule.hoursStart}-${schedule.hoursEnd}`;
}