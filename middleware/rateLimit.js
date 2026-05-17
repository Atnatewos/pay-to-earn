// middleware/rateLimit.js

/**
 * Rate Limiting Middleware
 * All limits read from config/security.json
 * Protects against brute force and DOS attacks
 * Different limits for general API, auth endpoints, and task operations
 */
var rateLimit = require('express-rate-limit');
var securityConfig = require('../config/security.json');

/**
 * General API rate limiter
 * Applied to all API routes
 */
var generalLimiter = rateLimit({
  windowMs: securityConfig.rateLimits.general.windowMs,
  max: securityConfig.rateLimits.general.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please try again later.'
  },
  keyGenerator: function(req) {
    // Use X-Forwarded-For header if behind proxy, otherwise use IP
    return req.headers['x-forwarded-for'] || req.ip;
  }
});

/**
 * Auth rate limiter
 * Applied to login and registration endpoints
 * Stricter limits to prevent brute force attacks
 */
var authLimiter = rateLimit({
  windowMs: securityConfig.rateLimits.auth.windowMs,
  max: securityConfig.rateLimits.auth.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again in 15 minutes.'
  },
  skipSuccessfulRequests: true,
  keyGenerator: function(req) {
    return req.headers['x-forwarded-for'] || req.ip;
  }
});

/**
 * Task rate limiter
 * Applied to task completion and captcha endpoints
 * Prevents automated task farming
 */
var taskLimiter = rateLimit({
  windowMs: securityConfig.rateLimits.tasks.windowMs,
  max: securityConfig.rateLimits.tasks.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many task requests. Please slow down.'
  },
  keyGenerator: function(req) {
    // Use user ID if authenticated, otherwise IP
    if (req.user && req.user.id) {
      return 'user_' + req.user.id;
    }
    return req.headers['x-forwarded-for'] || req.ip;
  }
});

module.exports = {
  generalLimiter: generalLimiter,
  authLimiter: authLimiter,
  taskLimiter: taskLimiter
};