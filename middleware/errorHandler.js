// middleware/errorHandler.js

/**
 * Global Error Handler Middleware
 * Catches all unhandled errors and returns consistent JSON responses
 * Handles PostgreSQL specific errors with friendly messages
 * Logs errors for debugging while hiding sensitive details from clients
 */

/**
 * Main error handler function
 * @param {Error} err - The error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
function errorHandler(err, req, res, next) {
  // Log the full error for server-side debugging
  console.error('[' + new Date().toISOString() + '] Error:', err.message);

  if (err.stack) {
    console.error('Stack trace:', err.stack);
  }

  // Handle PostgreSQL unique constraint violations
  if (err.code === '23505') {
    return res.status(400).json({
      success: false,
      message: 'Duplicate entry. This record already exists in the database.'
    });
  }

  // Handle PostgreSQL foreign key violations
  if (err.code === '23503') {
    return res.status(400).json({
      success: false,
      message: 'Invalid reference. The related record does not exist.'
    });
  }

  // Handle PostgreSQL check constraint violations
  if (err.code === '23514') {
    return res.status(400).json({
      success: false,
      message: 'Data validation failed. The provided value is outside allowed limits.'
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid authentication token. Please login again.'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Your session has expired. Please login again.'
    });
  }

  // Handle validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: err.message || 'Validation failed. Please check your input.'
    });
  }

  // Handle known operational errors
  if (err.isOperational) {
    return res.status(err.statusCode || 400).json({
      success: false,
      message: err.message
    });
  }

  // Handle unknown errors - hide details in production
  var isProduction = process.env.NODE_ENV === 'production';

  res.status(err.statusCode || 500).json({
    success: false,
    message: isProduction
      ? 'An unexpected error occurred. Please try again later.'
      : err.message || 'Internal server error'
  });
}

module.exports = errorHandler;