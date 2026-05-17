// config/constants.js

/**
 * Application Constants
 * ALL configurable values moved to config/*.json files
 * This file only keeps code-essential constants that cannot be in JSON
 * Environment variables via process.env
 */

module.exports = {
  // JWT Configuration - Secret from environment only, no fallback
  JWT: {
    SECRET: process.env.JWT_SECRET,
    EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h'
  },

  // Admin role hierarchy - ordered from highest to lowest privilege
  ADMIN_ROLES: ['super_admin', 'senior_admin', 'admin', 'moderator'],

  // ============================================================
  // ALL OTHER VALUES MOVED TO CONFIG FILES:
  // ============================================================
  // Packages:     config/packages.json
  // Commissions:  config/commissions.json
  // Tasks:        config/tasks.json
  // Deposits:     config/deposit.json
  // Withdrawals:  config/withdrawal.json
  // Managers:     config/managers.json
  // Platform:     config/platform.json
  // Security:     config/security.json
  // Messages:     config/messages.json
  // Features:     config/features.json
  // UI:           config/ui.json
};