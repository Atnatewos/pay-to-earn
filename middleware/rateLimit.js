const rateLimit = require('express-rate-limit');

const generalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true, legacyHeaders: false, message: { success: false, message: 'Too many requests.' } });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false, message: { success: false, message: 'Too many login attempts.' } });
const taskLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false, message: { success: false, message: 'Too many task requests.' } });

module.exports = { generalLimiter, authLimiter, taskLimiter };