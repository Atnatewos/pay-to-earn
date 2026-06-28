// modules/deposits/deposits.service.js

/**
 * Deposits Service
 * Handles all deposit operations: creation, verification, rejection
 * All configuration from config files - zero hardcoded values
 * All messages from message templates via NotificationsService
 * All monetary operations through MoneyService
 * Package activation through PackagesService
 */
var pool = require('../../config/db');
var NotificationsService = require('../notifications/notifications.service');
var MoneyService = require('../money/money.service');
var PackagesService = require('../packages/packages.service');

var depositConfig = require('../../config/deposit.json');
var packageConfig = require('../../config/packages.json');
var commissionConfig = require('../../config/commissions.json');
var messagesConfig = require('../../config/messages.json');

var DepositsService = function() {};

/**
 * Check if deposits are currently available based on schedule config
 * Reads schedule from config/deposit.json
 * @returns {Object} { allowed: boolean, message: string }
 */
DepositsService.prototype.checkSchedule = function() {
  var schedule = depositConfig.schedule;

  if (!schedule || !schedule.enabled) {
    return {
      allowed: false,
      message: messagesConfig.deposit.scheduleDisabled
    };
  }

  var now = new Date();
  var dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  var todayName = dayNames[now.getDay()];

  if (!schedule.days || !schedule.days.includes(todayName)) {
    var availableDays = schedule.days
      ? schedule.days.map(function(d) { return d.charAt(0).toUpperCase() + d.slice(1, 3); }).join(', ')
      : 'weekdays';

    return {
      allowed: false,
      message: messagesConfig.deposit.scheduleDayOff
        .replace('{days}', availableDays)
        .replace('{today}', todayName.charAt(0).toUpperCase() + todayName.slice(1))
    };
  }

  var currentMinutes = now.getHours() * 60 + now.getMinutes();
  var startParts = schedule.hoursStart.split(':').map(Number);
  var endParts = schedule.hoursEnd.split(':').map(Number);
  var startMinutes = startParts[0] * 60 + startParts[1];
  var endMinutes = endParts[0] * 60 + endParts[1];

  if (currentMinutes < startMinutes || currentMinutes > endMinutes) {
    return {
      allowed: false,
      message: messagesConfig.deposit.scheduleHoursOff
        .replace('{start}', schedule.hoursStart)
        .replace('{end}', schedule.hoursEnd)
    };
  }

  return { allowed: true };
};

/**
 * Check if a transaction ID has already been used in the system
 * Prevents duplicate deposits and transaction ID sharing
 * Different messages for different statuses (pending, verified, rejected)
 * @param {string} transactionId - Bank transaction ID to check
 * @param {number} userId - Current user ID submitting the deposit
 * @returns {Object} { used: boolean, status: string, message: string }
 */
DepositsService.prototype.checkTransactionId = function(transactionId, userId) {
  return pool.query(
    'SELECT id, user_id, status FROM deposits WHERE transaction_id = $1 ORDER BY created_at DESC LIMIT 1',
    [transactionId]
  ).then(function(result) {
    // Transaction ID is unique and available
    if (result.rows.length === 0) {
      return { used: false };
    }

    var existingDeposit = result.rows[0];
    var isSameUser = existingDeposit.user_id === userId;

    // Already verified - cannot be reused by anyone
    if (existingDeposit.status === 'verified') {
      return {
        used: true,
        status: 'verified',
        message: messagesConfig.deposit.duplicateVerified
      };
    }

    // Pending verification - same user can wait, different user is blocked
    if (existingDeposit.status === 'pending') {
      return {
        used: true,
        status: 'pending',
        isSameUser: isSameUser,
        message: isSameUser
          ? messagesConfig.deposit.duplicatePendingSelf
          : messagesConfig.deposit.duplicatePendingOther
      };
    }

    // Previously rejected - needs admin to unblock
    if (existingDeposit.status === 'rejected') {
      return {
        used: true,
        status: 'rejected',
        isSameUser: isSameUser,
        message: messagesConfig.deposit.duplicateRejected
      };
    }

    // Admin unblocked it - available for reuse
    if (existingDeposit.status === 'unblocked') {
      return { used: false };
    }

    return {
      used: true,
      message: messagesConfig.deposit.duplicateUnknown
    };
  });
};

/**
 * Create a new deposit request
 * Validates schedule, amount limits, and transaction ID uniqueness
 * @param {number} userId - User submitting the deposit
 * @param {number} amount - Deposit amount in ETB
 * @param {string} bankName - Name of the bank used for transfer
 * @param {string} transactionId - Bank transaction reference number
 * @returns {Object} { id: number, status: string }
 */
DepositsService.prototype.createDeposit = function(userId, amount, bankName, transactionId) {
  var self = this;

  // Check if deposits are available based on schedule
  var scheduleCheck = this.checkSchedule();
  if (!scheduleCheck.allowed) {
    return Promise.reject(new Error(scheduleCheck.message));
  }

  // Validate amount against configured limits
  var minimumAmount = depositConfig.minAmount;
  var maximumAmount = depositConfig.maxAmount;

  if (!amount || amount < minimumAmount || amount > maximumAmount) {
    return Promise.reject(new Error(
      messagesConfig.deposit.amountLimits
        .replace('{min}', minimumAmount.toLocaleString())
        .replace('{max}', maximumAmount.toLocaleString())
    ));
  }

  // Validate required fields
  if (!bankName || !transactionId) {
    return Promise.reject(new Error('Bank name and transaction ID are required.'));
  }

  // Check if this transaction ID has already been used
  return this.checkTransactionId(transactionId, userId)
    .then(function(idCheck) {
      if (idCheck.used) {
        throw new Error(idCheck.message);
      }

      // Insert the deposit record
      return pool.query(
        'INSERT INTO deposits (user_id, amount, bank_name, transaction_id) VALUES ($1, $2, $3, $4) RETURNING id',
        [userId, amount, bankName, transactionId]
      );
    })
    .then(function(result) {
      return {
        id: result.rows[0].id,
        status: 'pending'
      };
    });
};

/**
 * Admin unblocks a previously rejected transaction ID
 * Marks the deposit as 'unblocked' so the user can resubmit
 * Logs the action in admin activity log
 * @param {number} depositId - ID of the rejected deposit
 * @param {number} adminId - Admin performing the unblock
 * @returns {Object} { success: boolean, message: string }
 */
DepositsService.prototype.unblockTransactionId = function(depositId, adminId) {
  var client = null;

  return pool.connect()
    .then(function(connection) {
      client = connection;

      // Find the rejected deposit
      return client.query(
        'SELECT * FROM deposits WHERE id = $1 AND status = $2',
        [depositId, 'rejected']
      );
    })
    .then(function(result) {
      if (result.rows.length === 0) {
        throw new Error('Deposit not found or it is not in rejected status.');
      }

      var deposit = result.rows[0];

      // Mark as unblocked
      return client.query(
        'UPDATE deposits SET status = $1, verified_by = $2, verified_at = NOW() WHERE id = $3',
        ['unblocked', adminId, depositId]
      ).then(function() {
        return deposit;
      });
    })
    .then(function(deposit) {
      // Log the admin action
      return client.query(
        'INSERT INTO admin_logs (admin_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
        [
          adminId,
          'deposit_unblocked',
          'deposit',
          depositId,
          JSON.stringify({ transaction_id: deposit.transaction_id })
        ]
      ).then(function() {
        return deposit;
      });
    })
    .then(function() {
      return {
        success: true,
        message: messagesConfig.deposit.unblocked
      };
    })
    .catch(function(error) {
      throw error;
    })
    .finally(function() {
      if (client) {
        client.release();
      }
    });
};

/**
 * Verify a pending deposit
 * Credits capital balance, activates package, distributes commissions
 * Uses message templates for consistent notifications
 * @param {number} depositId - ID of the deposit to verify
 * @param {number} adminId - Admin performing the verification
 * @returns {Object} { success: boolean, message: string }
 */
DepositsService.prototype.verifyDeposit = function(depositId, adminId) {
  var client = null;
  var depositData = null;

  return pool.connect()
    .then(function(connection) {
      client = connection;
      return client.query('BEGIN');
    })
    .then(function() {
      // Find the pending deposit
      return client.query(
        'SELECT * FROM deposits WHERE id = $1 AND status = $2',
        [depositId, 'pending']
      );
    })
    .then(function(result) {
      if (result.rows.length === 0) {
        throw new Error('Deposit not found or it has already been processed.');
      }

      depositData = result.rows[0];

      // Mark deposit as verified
      return client.query(
        'UPDATE deposits SET status = $1, verified_by = $2, verified_at = NOW() WHERE id = $3',
        ['verified', adminId, depositId]
      );
    })
    .then(function() {
      // Credit the amount to user's CAPITAL balance (not withdrawable)
      return MoneyService.credit(
        depositData.user_id,
        depositData.amount,
        'capital',
        'deposit',
        'Deposit verified',
        depositId
      );
    })
    .then(function() {
      // Find matching package for this deposit amount
      var matchedPackage = PackagesService.getPackageByDeposit(depositData.amount);

      if (matchedPackage && matchedPackage.key !== 'Intern') {
        var packageName = matchedPackage.name || matchedPackage.key;
        var durationDays = matchedPackage.durationDays || 30;

        // Deactivate any existing active package
        return client.query(
          'UPDATE user_packages SET is_active = FALSE WHERE user_id = $1 AND is_active = TRUE',
          [depositData.user_id]
        ).then(function() {
          // Activate new package
          return client.query(
            'INSERT INTO user_packages (user_id, package_name, deposit_amount, started_at, expires_at) VALUES ($1, $2, $3, CURRENT_DATE, CURRENT_DATE + INTERVAL \'' + durationDays + ' days\')',
            [depositData.user_id, packageName, depositData.amount]
          );
        }).then(function() {
          // Update user's active package
          return client.query(
            'UPDATE users SET active_package = $1, package_expiry = CURRENT_DATE + INTERVAL \'' + durationDays + ' days\' WHERE id = $2',
            [packageName, depositData.user_id]
          );
        });
      }

      return Promise.resolve();
    })
    .then(function() {
      // Distribute referral commissions to upline
      return this.distributeReferralCommissions(client, depositData.user_id, depositData.amount);
    }.bind(this))
    .then(function() {
      return client.query('COMMIT');
    })
    .then(function() {
      // Send notification using message template
      return NotificationsService.createFromTemplate(
        depositData.user_id,
        'deposit.verified',
        { amount: depositData.amount.toLocaleString() },
        'deposit',
        depositId
      );
    })
    .then(function() {
      return {
        success: true,
        message: messagesConfig.deposit.verifiedSuccess
      };
    })
    .catch(function(error) {
      if (client) {
        return client.query('ROLLBACK').then(function() {
          throw error;
        });
      }
      throw error;
    })
    .finally(function() {
      if (client) {
        client.release();
      }
    });
};

/**
 * Distribute referral commissions to upline users (up to 3 levels)
 * Rates from config/commissions.json
 * Commissions go to earnings balance (withdrawable)
 * @param {Object} client - Database client (transaction)
 * @param {number} userId - User who made the deposit
 * @param {number} amount - Deposit amount
 */
DepositsService.prototype.distributeReferralCommissions = function(client, userId, amount) {
  return client.query(
    'SELECT ancestor_id, level FROM user_tree WHERE descendant_id = $1 AND level > 0 AND level <= 3 ORDER BY level ASC',
    [userId]
  ).then(function(result) {
    var uplineUsers = result.rows;
    var rates = [
      commissionConfig.referral.level1.rate,
      commissionConfig.referral.level2.rate,
      commissionConfig.referral.level3.rate
    ];

    // Process each upline user sequentially
    var processUpline = function(index) {
      if (index >= uplineUsers.length) {
        return Promise.resolve();
      }

      var uplineUser = uplineUsers[index];
      var rate = rates[uplineUser.level - 1];
      var commissionAmount = amount * rate;

      if (commissionAmount <= 0) {
        return processUpline(index + 1);
      }

      // Credit commission to upline's earnings
      return MoneyService.credit(
        uplineUser.ancestor_id,
        commissionAmount,
        'earnings',
        'commission',
        'Referral commission level ' + uplineUser.level + ' from user #' + userId,
        userId
      ).then(function() {
        // Record commission in database
        return client.query(
          'INSERT INTO commissions (from_user_id, to_user_id, type, level, amount, source_amount, percentage) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [userId, uplineUser.ancestor_id, 'referral', uplineUser.level, commissionAmount, amount, rate * 100]
        );
      }).then(function() {
        // Send notification using message template
        return NotificationsService.createFromTemplate(
          uplineUser.ancestor_id,
          'commission.referralReceived',
          { amount: commissionAmount.toFixed(2), level: uplineUser.level },
          'commission',
          userId
        );
      }).then(function() {
        return processUpline(index + 1);
      });
    };

    return processUpline(0);
  });
};

/**
 * Reject a pending deposit
 * Does NOT refund (no money was credited yet for deposits)
 * @param {number} depositId - ID of the deposit to reject
 * @param {number} adminId - Admin performing the rejection
 * @param {string} reason - Reason for rejection
 * @returns {Object} { success: boolean, message: string }
 */
DepositsService.prototype.rejectDeposit = function(depositId, adminId, reason) {
  return pool.query(
    'UPDATE deposits SET status = $1, verified_by = $2, rejection_reason = $3, verified_at = NOW() WHERE id = $4 AND status = $5',
    ['rejected', adminId, reason, depositId, 'pending']
  ).then(function(result) {
    if (result.rowCount === 0) {
      throw new Error('Deposit not found or it has already been processed.');
    }

    // Get deposit details for notification
    return pool.query('SELECT user_id, amount FROM deposits WHERE id = $1', [depositId]);
  }).then(function(result) {
    if (result.rows.length > 0) {
      var deposit = result.rows[0];

      // Send rejection notification using message template
      return NotificationsService.createFromTemplate(
        deposit.user_id,
        'deposit.rejected',
        { amount: deposit.amount.toLocaleString(), reason: reason },
        'deposit',
        depositId
      ).then(function() {
        return { success: true, message: messagesConfig.deposit.rejectedSuccess };
      });
    }

    return { success: true, message: messagesConfig.deposit.rejectedSuccess };
  });
};

/**
 * Get paginated list of pending deposits
 * Includes user phone and name for admin review
 * @param {number} page - Page number (starting from 1)
 * @param {number} limit - Items per page
 * @returns {Object} { deposits: Array, pagination: Object }
 */
DepositsService.prototype.getPendingDeposits = function(page, limit) {
  var currentPage = page || 1;
  var itemsPerPage = limit || 20;
  var offset = (currentPage - 1) * itemsPerPage;

  var depositsPromise = pool.query(
    'SELECT d.*, u.phone, u.full_name FROM deposits d JOIN users u ON d.user_id = u.id WHERE d.status = $1 ORDER BY d.created_at ASC LIMIT $2 OFFSET $3',
    ['pending', itemsPerPage, offset]
  );

  var countPromise = pool.query(
    'SELECT COUNT(*) as total FROM deposits WHERE status = $1',
    ['pending']
  );

  return Promise.all([depositsPromise, countPromise])
    .then(function(results) {
      var deposits = results[0].rows;
      var total = parseInt(results[1].rows[0].total);

      return {
        deposits: deposits,
        pagination: {
          page: currentPage,
          limit: itemsPerPage,
          total: total,
          pages: Math.ceil(total / itemsPerPage)
        }
      };
    });
};

module.exports = new DepositsService();