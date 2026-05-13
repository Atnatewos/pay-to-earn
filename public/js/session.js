// public/js/session.js

/**
 * SESSION CONTROLLER - THE SINGLE SOURCE OF TRUTH
 * 
 * EVERY auth-related storage operation goes through this file.
 * NO OTHER FILE reads or writes localStorage or sessionStorage directly.
 * 
 * This file writes to BOTH storages simultaneously to support:
 * - sessionStorage: Per-tab isolation (different logins in different tabs)
 * - localStorage: Backward compatibility (existing sessions continue working)
 * 
 * If something breaks, THIS is the only file you need to debug.
 */

var Session = {

  // ============================================================
  // PRIVATE: Internal storage helpers
  // ============================================================

  /**
   * Write a value to BOTH sessionStorage and localStorage
   * @private
   * @param {string} key - Storage key
   * @param {string} value - Value to store (must be a string)
   */
  _write: function(key, value) {
    try {
      sessionStorage.setItem(key, value);
    } catch (sessionError) {
      console.warn('Session._write: sessionStorage failed for key "' + key + '":', sessionError.message);
    }

    try {
      localStorage.setItem(key, value);
    } catch (localError) {
      console.warn('Session._write: localStorage failed for key "' + key + '":', localError.message);
    }
  },

  /**
   * Read a value from sessionStorage first, localStorage as fallback
   * @private
   * @param {string} key - Storage key
   * @returns {string|null} The stored value or null
   */
  _read: function(key) {
    var value = null;

    try {
      value = sessionStorage.getItem(key);
    } catch (sessionError) {
      console.warn('Session._read: sessionStorage failed for key "' + key + '":', sessionError.message);
    }

    if (value !== null && value !== undefined) {
      return value;
    }

    try {
      value = localStorage.getItem(key);
    } catch (localError) {
      console.warn('Session._read: localStorage failed for key "' + key + '":', localError.message);
    }

    return value;
  },

  /**
   * Remove a key from BOTH storages
   * @private
   * @param {string} key - Storage key to remove
   */
  _remove: function(key) {
    try {
      sessionStorage.removeItem(key);
    } catch (e) {
      console.warn('Session._remove: sessionStorage failed for key "' + key + '":', e.message);
    }

    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn('Session._remove: localStorage failed for key "' + key + '":', e.message);
    }
  },

  // ============================================================
  // PUBLIC: Admin Session Methods
  // ============================================================

  /**
   * Store a complete admin session
   * Called once when admin logs in successfully
   * @param {string} token - JWT authentication token
   * @param {object} adminData - Admin profile { id, username, role }
   * @param {string[]} permissions - Array of permission codes
   */
  setAdmin: function(token, adminData, permissions) {
    if (!token) {
      console.error('Session.setAdmin: token is required');
      return;
    }

    // Store token
    this._write('admin_token', token);

    // Store admin profile data as JSON
    if (adminData) {
      try {
        var adminJson = JSON.stringify(adminData);
        this._write('admin_data', adminJson);
      } catch (jsonError) {
        console.error('Session.setAdmin: failed to stringify adminData:', jsonError.message);
      }
    }

    // Store permissions array as JSON
    if (permissions && Array.isArray(permissions)) {
      try {
        var permissionsJson = JSON.stringify(permissions);
        this._write('admin_permissions', permissionsJson);
      } catch (jsonError) {
        console.error('Session.setAdmin: failed to stringify permissions:', jsonError.message);
      }
    } else {
      // Store empty permissions array if none provided
      this._write('admin_permissions', '[]');
    }
  },

  /**
   * Get the admin JWT token
   * @returns {string|null}
   */
  getAdminToken: function() {
    return this._read('admin_token');
  },

  /**
   * Get the admin profile data
   * @returns {object|null} Parsed admin data object or null
   */
  getAdminData: function() {
    var raw = this._read('admin_data');
    if (!raw) return null;

    try {
      return JSON.parse(raw);
    } catch (parseError) {
      console.error('Session.getAdminData: failed to parse admin_data:', parseError.message);
      return null;
    }
  },

  /**
   * Get the admin permissions array
   * @returns {string[]} Array of permission codes (empty array if none)
   */
  getAdminPermissions: function() {
    var raw = this._read('admin_permissions');
    if (!raw) return [];

    try {
      var permissions = JSON.parse(raw);
      if (!Array.isArray(permissions)) return [];
      return permissions;
    } catch (parseError) {
      console.error('Session.getAdminPermissions: failed to parse:', parseError.message);
      return [];
    }
  },

  /**
   * Check if an admin is currently logged in
   * @returns {boolean}
   */
  isAdminLoggedIn: function() {
    var token = this.getAdminToken();
    return token !== null && token !== undefined && token !== '';
  },

  /**
   * Clear ALL admin session data from both storages
   */
  clearAdmin: function() {
    this._remove('admin_token');
    this._remove('admin_data');
    this._remove('admin_permissions');
  },

  // ============================================================
  // PUBLIC: User Session Methods
  // ============================================================

  /**
   * Store a complete user session
   * Called once when user logs in or registers successfully
   * @param {string} token - JWT authentication token
   * @param {object} userData - User profile { id, phone, fullName, balance, status, ... }
   */
  setUser: function(token, userData) {
    if (!token) {
      console.error('Session.setUser: token is required');
      return;
    }

    // Store token
    this._write('token', token);

    // Store user profile data as JSON
    if (userData) {
      try {
        var userJson = JSON.stringify(userData);
        this._write('user', userJson);
      } catch (jsonError) {
        console.error('Session.setUser: failed to stringify userData:', jsonError.message);
      }
    }
  },

  /**
   * Get the user JWT token
   * @returns {string|null}
   */
  getUserToken: function() {
    return this._read('token');
  },

  /**
   * Get the user profile data
   * @returns {object|null} Parsed user data object or null
   */
  getUserData: function() {
    var raw = this._read('user');
    if (!raw) return null;

    try {
      return JSON.parse(raw);
    } catch (parseError) {
      console.error('Session.getUserData: failed to parse user:', parseError.message);
      return null;
    }
  },

  /**
   * Check if a user is currently logged in
   * @returns {boolean}
   */
  isUserLoggedIn: function() {
    var token = this.getUserToken();
    return token !== null && token !== undefined && token !== '';
  },

  /**
   * Clear ALL user session data from both storages
   */
  clearUser: function() {
    this._remove('token');
    this._remove('user');
  }
};