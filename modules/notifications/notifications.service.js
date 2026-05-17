// modules/notifications/notifications.service.js

/**
 * Notifications Service
 * Creates and manages user notifications
 * All notification messages from config/messages.json
 * Uses parameterized queries for security
 */
var pool = require('../../config/db');
var messagesConfig = require('../../config/messages.json');

var NotificationsService = function() {};

/**
 * Create a notification for a user
 * @param {number} userId - Recipient user ID
 * @param {string} title - Notification title
 * @param {string} message - Notification message body
 * @param {string} type - Notification type (deposit, withdrawal, commission, system, task, alert)
 * @param {number} referenceId - Optional reference ID for related entity
 */
NotificationsService.prototype.create = function(userId, title, message, type, referenceId) {
  if (!userId || !title || !message) {
    console.warn('NotificationsService.create: Missing required parameters');
    return Promise.resolve();
  }

  var notificationType = type || 'system';
  var reference = referenceId || null;

  return pool.query(
    'INSERT INTO notifications (user_id, title, message, type, reference_id) VALUES ($1, $2, $3, $4, $5)',
    [userId, title, message, notificationType, reference]
  ).catch(function(error) {
    // Log error but don't throw - notifications are non-critical
    console.error('NotificationsService.create: Failed to create notification:', error.message);
  });
};

/**
 * Get paginated notifications for a user
 * @param {number} userId - User ID
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {Object} Notifications and pagination data
 */
NotificationsService.prototype.getUserNotifications = function(userId, page, limit) {
  var currentPage = page || 1;
  var itemsPerPage = limit || 20;
  var offset = (currentPage - 1) * itemsPerPage;

  var notificationsPromise = pool.query(
    'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
    [userId, itemsPerPage, offset]
  );

  var totalPromise = pool.query(
    'SELECT COUNT(*) as total FROM notifications WHERE user_id = $1',
    [userId]
  );

  var unreadPromise = pool.query(
    'SELECT COUNT(*) as unread FROM notifications WHERE user_id = $1 AND is_read = FALSE',
    [userId]
  );

  return Promise.all([notificationsPromise, totalPromise, unreadPromise])
    .then(function(results) {
      var notifications = results[0].rows;
      var total = parseInt(results[1].rows[0].total);
      var unread = parseInt(results[2].rows[0].unread);

      return {
        notifications: notifications,
        unreadCount: unread,
        pagination: {
          page: currentPage,
          limit: itemsPerPage,
          total: total,
          pages: Math.ceil(total / itemsPerPage)
        }
      };
    });
};

/**
 * Mark a single notification as read
 * @param {number} notificationId - Notification ID
 * @param {number} userId - User ID (for security verification)
 */
NotificationsService.prototype.markAsRead = function(notificationId, userId) {
  return pool.query(
    'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2',
    [notificationId, userId]
  );
};

/**
 * Mark all notifications as read for a user
 * @param {number} userId - User ID
 */
NotificationsService.prototype.markAllAsRead = function(userId) {
  return pool.query(
    'UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE',
    [userId]
  );
};

/**
 * Get unread notification count for a user
 * @param {number} userId - User ID
 * @returns {number} Unread count
 */
NotificationsService.prototype.getUnreadCount = function(userId) {
  return pool.query(
    'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = FALSE',
    [userId]
  ).then(function(result) {
    return parseInt(result.rows[0].count);
  });
};

/**
 * Create a formatted notification using message templates from config
 * @param {number} userId - Recipient user ID
 * @param {string} templateKey - Key in messagesConfig (e.g., 'deposit.verified')
 * @param {Object} replacements - Key-value pairs for template placeholders
 * @param {string} type - Notification type
 * @param {number} referenceId - Optional reference ID
 */
NotificationsService.prototype.createFromTemplate = function(userId, templateKey, replacements, type, referenceId) {
  // Parse template key (e.g., 'deposit.verified' -> messagesConfig.deposit.verified)
  var keys = templateKey.split('.');
  var template = messagesConfig;

  for (var i = 0; i < keys.length; i++) {
    template = template[keys[i]];
    if (!template) {
      console.warn('NotificationsService.createFromTemplate: Template not found:', templateKey);
      return Promise.resolve();
    }
  }

  if (typeof template !== 'string') {
    console.warn('NotificationsService.createFromTemplate: Template is not a string:', templateKey);
    return Promise.resolve();
  }

  // Replace placeholders
  var message = template;
  if (replacements) {
    Object.keys(replacements).forEach(function(key) {
      message = message.replace('{' + key + '}', replacements[key]);
    });
  }

  // Extract title from first sentence or use type as title
  var title = message.split('.')[0];

  return this.create(userId, title, message, type, referenceId);
};

module.exports = new NotificationsService();