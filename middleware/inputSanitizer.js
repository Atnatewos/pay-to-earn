// middleware/inputSanitizer.js

/**
 * Input Sanitization Middleware
 * Strips HTML tags and limits input length
 * Configuration from config/security.json
 * Protects against XSS attacks and injection
 */
var securityConfig = require('../config/security.json');

/**
 * Strip HTML tags from a string
 * @param {string} input - The string to sanitize
 * @returns {string} Sanitized string with HTML tags removed
 */
function stripHtml(input) {
  if (typeof input !== 'string') {
    return input;
  }

  // Remove HTML tags
  var sanitized = input.replace(/<[^>]*>/g, '');

  // Remove common XSS patterns
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=/gi, '');
  sanitized = sanitized.replace(/&#/g, '');

  return sanitized;
}

/**
 * Truncate a string to max length
 * @param {string} input - The string to truncate
 * @param {number} maxLength - Maximum allowed length
 * @returns {string} Truncated string
 */
function truncate(input, maxLength) {
  if (!maxLength) {
    maxLength = securityConfig.inputSanitization.maxLength;
  }

  if (typeof input === 'string' && input.length > maxLength) {
    return input.substring(0, maxLength);
  }

  return input;
}

/**
 * Recursively sanitize an object's string values
 * @param {Object|Array|string} data - The data to sanitize
 * @returns {Object|Array|string} Sanitized data
 */
function sanitizeObject(data) {
  if (typeof data === 'string') {
    var sanitized = data;

    if (securityConfig.inputSanitization.stripHtml) {
      sanitized = stripHtml(sanitized);
    }

    sanitized = truncate(sanitized);

    return sanitized;
  }

  if (Array.isArray(data)) {
    return data.map(function(item) {
      return sanitizeObject(item);
    });
  }

  if (data !== null && typeof data === 'object') {
    var sanitizedObject = {};

    Object.keys(data).forEach(function(key) {
      sanitizedObject[key] = sanitizeObject(data[key]);
    });

    return sanitizedObject;
  }

  return data;
}

/**
 * Express middleware that sanitizes request body, query, and params
 */
function sanitizeInput(req, res, next) {
  try {
    if (req.body) {
      req.body = sanitizeObject(req.body);
    }

    if (req.query) {
      req.query = sanitizeObject(req.query);
    }

    if (req.params) {
      req.params = sanitizeObject(req.params);
    }

    next();
  } catch (error) {
    console.error('Input sanitization error:', error.message);
    next();
  }
}

module.exports = {
  sanitizeInput: sanitizeInput,
  stripHtml: stripHtml,
  truncate: truncate,
  sanitizeObject: sanitizeObject
};