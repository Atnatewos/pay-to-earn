// config/constants.js
module.exports = {
    // Commission rates
    COMMISSION: {
        REFERRAL: {
            LEVEL_1: 0.10,  // 10%
            LEVEL_2: 0.03,  // 3%
            LEVEL_3: 0.01   // 1%
        },
        TASK: {
            LEVEL_1: 0.05,  // 5%
            LEVEL_2: 0.02,  // 2%
            LEVEL_3: 0.01   // 1%
        },
        MAX_LEVELS: 3
    },

    // Task settings
    TASK: {
        VIDEO_DURATION: 10,        // seconds
        WORKING_HOURS_START: '00:01',
        WORKING_HOURS_END: '23:59',
        MAX_TASKS_PER_DAY: 20
    },

    // Intern package
    INTERN: {
        DURATION_DAYS: 3,
        TASKS_PER_DAY: 5,
        INCOME_PER_TASK: 12.00
    },

    // Deposit limits
    DEPOSIT: {
        MIN: 1600.00,
        MAX: 330000.00
    },

    // Withdrawal
    WITHDRAWAL: {
        MIN: 100.00
    },

    // JWT
    JWT: {
        SECRET: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
        EXPIRES_IN: '24h'
    },

    // Admin roles
    ADMIN_ROLES: ['super_admin', 'senior_admin', 'admin', 'moderator'],

    // Pagination
    PAGINATION: {
        DEFAULT_LIMIT: 20,
        MAX_LIMIT: 100
    }
};