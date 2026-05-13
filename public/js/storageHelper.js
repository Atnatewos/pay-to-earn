// public/js/storageHelper.js

/**
 * Unified Storage Helper
 * EVERY storage operation goes through this file
 * Writes to BOTH sessionStorage and localStorage simultaneously
 * Reads from sessionStorage first, localStorage as fallback
 * This guarantees multi-tab isolation AND backward compatibility
 * 
 * Why both storages?
 * - sessionStorage: Isolated per browser tab (multiple logins in different tabs)
 * - localStorage: Shared across tabs (backward compatibility for existing sessions)
 * 
 * Writing to both ensures no matter which storage a piece of code reads from,
 * the data is always available.
 */
var StorageHelper = {

  /**
   * Store a string value in BOTH sessionStorage and localStorage
   * @param {string} key - The storage key name
   * @param {string} value - The value to store
   */
  set: function(key, value) {
    try {
      sessionStorage.setItem(key, value);
    } catch (sessionError) {
      console.warn('sessionStorage write failed for key: ' + key, sessionError.message);
    }

    try {
      localStorage.setItem(key, value);
    } catch (localError) {
      console.warn('localStorage write failed for key: ' + key, localError.message);
    }
  },

  /**
   * Retrieve a string value from storage
   * Checks sessionStorage first (tab-specific), then localStorage (fallback)
   * @param {string} key - The storage key name
   * @returns {string|null} The stored value or null if not found
   */
  get: function(key) {
    var value = null;

    try {
      value = sessionStorage.getItem(key);
    } catch (sessionError) {
      console.warn('sessionStorage read failed for key: ' + key, sessionError.message);
    }

    if (value !== null && value !== undefined) {
      return value;
    }

    try {
      value = localStorage.getItem(key);
    } catch (localError) {
      console.warn('localStorage read failed for key: ' + key, localError.message);
    }

    return value;
  },

  /**
   * Store a JavaScript object as JSON in BOTH storages
   * @param {string} key - The storage key name
   * @param {object|array} value - The object or array to store
   */
  setJSON: function(key, value) {
    try {
      var jsonString = JSON.stringify(value);
      this.set(key, jsonString);
    } catch (stringifyError) {
      console.error('Failed to stringify value for key: ' + key, stringifyError.message);
    }
  },

  /**
   * Retrieve and parse a JSON value from storage
   * @param {string} key - The storage key name
   * @returns {object|array|null} The parsed value, or null if not found or invalid
   */
  getJSON: function(key) {
    var rawValue = this.get(key);

    if (!rawValue) {
      return null;
    }

    try {
      return JSON.parse(rawValue);
    } catch (parseError) {
      console.error('Failed to parse JSON for key: ' + key, parseError.message);
      return null;
    }
  },

  /**
   * Remove a key from BOTH sessionStorage and localStorage
   * @param {string} key - The storage key to remove
   */
  remove: function(key) {
    try {
      sessionStorage.removeItem(key);
    } catch (sessionError) {
      console.warn('sessionStorage remove failed for key: ' + key, sessionError.message);
    }

    try {
      localStorage.removeItem(key);
    } catch (localError) {
      console.warn('localStorage remove failed for key: ' + key, localError.message);
    }
  },

  /**
   * Clear ALL admin-related data from both storages
   * Used when an admin logs out
   */
  clearAdmin: function() {
    var adminKeys = ['admin_token', 'admin_data', 'admin_permissions'];

    for (var i = 0; i < adminKeys.length; i++) {
      this.remove(adminKeys[i]);
    }
  },

  /**
   * Clear ALL user-related data from both storages
   * Used when a user logs out
   */
  clearUser: function() {
    var userKeys = ['token', 'user'];

    for (var i = 0; i < userKeys.length; i++) {
      this.remove(userKeys[i]);
    }
  }
};