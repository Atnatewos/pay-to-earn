// public/admin/js/permissionCheck.js

/**
 * Admin Permission Check Utility
 * Used by every admin page to check permissions before rendering
 * Super admin bypasses all checks (permissions array contains '*')
 * 
 * Usage:
 *   AdminPerms.requirePage('deposits.view'); // Returns false and redirects if denied
 *   if (AdminPerms.has('deposits.verify')) { showVerifyButton(); }
 */
var AdminPerms = {
  /**
   * Get current admin's permissions from localStorage
   * @returns {string[]} Array of permission codes
   */
  getPermissions: function() {
    try {
      var stored = localStorage.getItem('admin_permissions');
      if (!stored) return [];
      return JSON.parse(stored);
    } catch (e) {
      return [];
    }
  },

  /**
   * Check if admin has a specific permission
   * Super admin (permissions = ['*']) always returns true
   * @param {string} code - Permission code like 'deposits.verify'
   * @returns {boolean}
   */
  has: function(code) {
    var perms = this.getPermissions();
    if (perms.length === 1 && perms[0] === '*') return true;
    return perms.indexOf(code) !== -1;
  },

  /**
   * Require a permission to access a page
   * Shows "Access Denied" popup and redirects to dashboard if denied
   * @param {string} code - Permission code required for this page
   * @returns {boolean} true if granted, false if denied (already handled)
   */
  requirePage: function(code) {
    if (this.has(code)) return true;

    var adminData = JSON.parse(localStorage.getItem('admin_data') || '{}');
    var isSuperAdmin = adminData.role === 'super_admin';
    if (isSuperAdmin) return true;

    var friendlyName = typeof getPermissionName === 'function'
      ? getPermissionName(code)
      : code;

    if (typeof Dialog !== 'undefined') {
      Dialog.alert(
        'Access Denied: You don\'t have permission to ' + friendlyName + '.\n\nContact the super admin to request access.',
        'Access Denied',
        'warning'
      );
    }

    setTimeout(function() {
      router.navigate('/admin/dashboard');
    }, 500);

    return false;
  },

  /**
   * Get the admin's role
   * @returns {string}
   */
  getRole: function() {
    var adminData = JSON.parse(localStorage.getItem('admin_data') || '{}');
    return adminData.role || '';
  },

  /**
   * Check if current admin is super admin
   * @returns {boolean}
   */
  isSuperAdmin: function() {
    return this.getRole() === 'super_admin';
  }
};