module.exports = {
    COMMISSION: {
        REFERRAL: { LEVEL_1: 0.10, LEVEL_2: 0.03, LEVEL_3: 0.01 },
        TASK: { LEVEL_1: 0.05, LEVEL_2: 0.02, LEVEL_3: 0.01 },
        MAX_LEVELS: 3
    },
    TASK: { VIDEO_DURATION: 10, WORKING_HOURS_START: '00:01', WORKING_HOURS_END: '23:59', MAX_TASKS_PER_DAY: 20 },
    INTERN: { DURATION_DAYS: 3, TASKS_PER_DAY: 5, INCOME_PER_TASK: 12.00 },
    DEPOSIT: { MIN: 1600.00, MAX: 330000.00 },
    WITHDRAWAL: { MIN: 100.00 },
    JWT: { SECRET: process.env.JWT_SECRET || 'pay-to-earn-secret-key', EXPIRES_IN: '24h' },
    ADMIN_ROLES: ['super_admin', 'senior_admin', 'admin', 'moderator'],
    PAGINATION: { DEFAULT_LIMIT: 20, MAX_LIMIT: 100 }
};