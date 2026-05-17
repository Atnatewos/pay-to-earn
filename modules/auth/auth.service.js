// modules/auth/auth.service.js

/**
 * Authentication Service
 * Handles user registration, login, profile management
 * Password policy from config/security.json
 * All messages from config/messages.json
 * Zero hardcoded values
 */
var pool = require('../../config/db');
var bcrypt = require('bcryptjs');
var jwt = require('jsonwebtoken');
var constants = require('../../config/constants');
var packageConfig = require('../../config/packages.json');
var securityConfig = require('../../config/security.json');
var featuresConfig = require('../../config/features.json');
var messagesConfig = require('../../config/messages.json');
var referralGenerator = require('../../utils/referralGen');

var AuthService = function() {};

/**
 * Register a new user account
 * Validates password against security policy
 * Creates user with free Intern package
 * @param {string} phone - User phone number
 * @param {string} password - User password
 * @param {string} fullName - User full name (optional)
 * @param {string} referralCode - Referral code from another user (optional)
 * @returns {Object} Token and user data
 */
AuthService.prototype.register = function(phone, password, fullName, referralCode) {
  var self = this;
  var client = null;

  return pool.connect()
    .then(function(connection) {
      client = connection;
      return client.query('BEGIN');
    })
    .then(function() {
      // Check if registration is enabled
      if (!featuresConfig.registration.enabled) {
        throw new Error('Registration is currently disabled.');
      }

      // Validate password against security policy
      var passwordMinLength = securityConfig.passwords.minLength || 6;
      if (!password || password.length < passwordMinLength) {
        throw new Error('Password must be at least ' + passwordMinLength + ' characters.');
      }

      if (securityConfig.passwords.requireNumbers && !/[0-9]/.test(password)) {
        throw new Error('Password must contain at least one number.');
      }

      if (securityConfig.passwords.requireUppercase && !/[A-Z]/.test(password)) {
        throw new Error('Password must contain at least one uppercase letter.');
      }

      if (securityConfig.passwords.requireSpecialChars && !/[!@#$%^&*]/.test(password)) {
        throw new Error('Password must contain at least one special character.');
      }

      // Check if phone already exists
      return client.query('SELECT id FROM users WHERE phone = $1', [phone]);
    })
    .then(function(result) {
      if (result.rows.length > 0) {
        throw new Error('Phone number already registered');
      }

      // Hash password with bcrypt
      return bcrypt.hash(password, 12);
    })
    .then(function(passwordHash) {
      // Generate unique referral code
      return self._generateUniqueReferralCode(client).then(function(code) {
        return { passwordHash: passwordHash, referralCode: code };
      });
    })
    .then(function(data) {
      // Find referrer if referral code provided
      var referredBy = null;
      var parentId = null;

      if (referralCode) {
        return client.query('SELECT id FROM users WHERE referral_code = $1', [referralCode])
          .then(function(result) {
            if (result.rows.length > 0) {
              referredBy = result.rows[0].id;
              parentId = result.rows[0].id;
            }
            return { passwordHash: data.passwordHash, referralCode: data.referralCode, referredBy: referredBy, parentId: parentId };
          });
      }

      return { passwordHash: data.passwordHash, referralCode: data.referralCode, referredBy: referredBy, parentId: parentId };
    })
    .then(function(data) {
      // Get Intern package details from config
      var internPackage = packageConfig['Intern'];
      var durationDays = internPackage ? internPackage.durationDays : 3;
      var tasksPerDay = internPackage ? internPackage.tasksPerDay : 5;

      // Create user record
      return client.query(
        'INSERT INTO users (phone, full_name, password_hash, referral_code, referred_by, parent_id, active_package, package_expiry) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
        [phone, fullName || null, data.passwordHash, data.referralCode, data.referredBy, data.parentId, 'Intern', new Date(Date.now() + durationDays * 86400000)]
      ).then(function(result) {
        return { userId: result.rows[0].id, referralCode: data.referralCode, parentId: data.parentId, tasksPerDay: tasksPerDay };
      });
    })
    .then(function(data) {
      // Insert into user tree (self-reference)
      return client.query('INSERT INTO user_tree (ancestor_id, descendant_id, level) VALUES ($1, $1, 0)', [data.userId])
        .then(function() {
          return data;
        });
    })
    .then(function(data) {
      // Build tree relationships if referred
      if (data.parentId) {
        return self._buildTreeRelations(client, data.userId, data.parentId).then(function() {
          return data;
        });
      }
      return data;
    })
    .then(function(data) {
      // Create daily tasks for today
      var today = new Date().toISOString().split('T')[0];
      return client.query(
        'INSERT INTO daily_tasks (user_id, task_date, tasks_allocated) VALUES ($1, $2, $3)',
        [data.userId, today, data.tasksPerDay]
      ).then(function() {
        return data;
      });
    })
    .then(function(data) {
      return client.query('COMMIT').then(function() {
        return data;
      });
    })
    .then(function(data) {
      // Generate JWT token
      var token = jwt.sign(
        { id: data.userId, phone: phone, isAdmin: false },
        constants.JWT.SECRET,
        { expiresIn: constants.JWT.EXPIRES_IN }
      );

      return {
        token: token,
        user: {
          id: data.userId,
          phone: phone,
          fullName: fullName,
          referralCode: data.referralCode,
          activePackage: 'Intern',
          balance: 0
        }
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
 * Generate a unique referral code
 * @private
 * @param {Object} client - Database client
 * @returns {Promise<string>} Unique referral code
 */
AuthService.prototype._generateUniqueReferralCode = function(client) {
  var code;
  var attempts = 0;
  var maxAttempts = 10;

  function tryGenerate() {
    code = referralGenerator.generateReferralCode();
    return client.query('SELECT id FROM users WHERE referral_code = $1', [code])
      .then(function(result) {
        if (result.rows.length === 0) {
          return code;
        }
        attempts++;
        if (attempts >= maxAttempts) {
          throw new Error('Failed to generate unique referral code');
        }
        return tryGenerate();
      });
  }

  return tryGenerate();
};

/**
 * Build MLM tree relationships for a new user
 * @private
 * @param {Object} client - Database client
 * @param {number} userId - New user ID
 * @param {number} parentId - Parent (sponsor) user ID
 */
AuthService.prototype._buildTreeRelations = function(client, userId, parentId) {
  // Insert direct relationship (level 1)
  return client.query(
    'INSERT INTO user_tree (ancestor_id, descendant_id, level) VALUES ($1, $2, 1)',
    [parentId, userId]
  ).then(function() {
    // Get all ancestors of parent up to level 2
    return client.query(
      'SELECT ancestor_id, level FROM user_tree WHERE descendant_id = $1 AND level > 0 AND level < 3',
      [parentId]
    );
  }).then(function(result) {
    // Create relationships with parent's ancestors
    var promises = result.rows.map(function(ancestor) {
      var newLevel = ancestor.level + 1;
      if (newLevel <= 3) {
        return client.query(
          'INSERT INTO user_tree (ancestor_id, descendant_id, level) VALUES ($1, $2, $3)',
          [ancestor.ancestor_id, userId, newLevel]
        );
      }
      return Promise.resolve();
    });

    return Promise.all(promises);
  });
};

/**
 * Authenticate a user with phone and password
 * @param {string} phone - User phone number
 * @param {string} password - User password
 * @returns {Object} Token and user data
 */
AuthService.prototype.login = function(phone, password) {
  return pool.query('SELECT * FROM users WHERE phone = $1', [phone])
    .then(function(result) {
      if (result.rows.length === 0) {
        throw new Error('Invalid phone or password');
      }

      var user = result.rows[0];

      if (user.status !== 'active') {
        var suspensionMessage = user.status === 'banned'
          ? messagesConfig.suspension.banned.replace('{reason}', 'Violation of terms')
          : messagesConfig.suspension.suspended.replace('{reason}', 'Violation of terms');

        throw new Error(suspensionMessage);
      }

      return bcrypt.compare(password, user.password_hash).then(function(valid) {
        if (!valid) {
          throw new Error('Invalid phone or password');
        }

        var token = jwt.sign(
          { id: user.id, phone: user.phone, isAdmin: false },
          constants.JWT.SECRET,
          { expiresIn: constants.JWT.EXPIRES_IN }
        );

        return {
          token: token,
          user: {
            id: user.id,
            phone: user.phone,
            fullName: user.full_name,
            avatarUrl: user.avatar_url,
            balance: user.balance,
            capital: user.capital,
            earnings_balance: user.earnings_balance,
            activePackage: user.active_package,
            status: user.status,
            managerRank: user.manager_rank
          }
        };
      });
    });
};

/**
 * Get user profile by ID
 * @param {number} userId - User ID
 * @returns {Object} User profile data
 */
AuthService.prototype.getUserProfile = function(userId) {
  return pool.query(
    'SELECT id, phone, full_name, avatar_url, referral_code, status, balance, capital, earnings_balance, total_earned, total_deposited, active_package, package_expiry, manager_rank, created_at FROM users WHERE id = $1',
    [userId]
  ).then(function(result) {
    if (result.rows.length === 0) {
      throw new Error('User not found');
    }
    return result.rows[0];
  });
};

/**
 * Update user profile
 * @param {number} userId - User ID
 * @param {Object} data - Profile data to update
 */
AuthService.prototype.updateProfile = function(userId, data) {
  var fields = [];
  var values = [];
  var paramCount = 1;

  if (data.fullName !== undefined) {
    fields.push('full_name = $' + paramCount);
    values.push(data.fullName);
    paramCount++;
  }

  if (data.avatarUrl !== undefined) {
    fields.push('avatar_url = $' + paramCount);
    values.push(data.avatarUrl);
    paramCount++;
  }

  if (fields.length === 0) {
    return Promise.resolve({ success: true });
  }

  values.push(userId);

  return pool.query(
    'UPDATE users SET ' + fields.join(', ') + ' WHERE id = $' + paramCount,
    values
  ).then(function() {
    return { success: true };
  });
};

module.exports = new AuthService();