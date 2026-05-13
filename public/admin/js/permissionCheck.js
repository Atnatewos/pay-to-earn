// public/admin/js/permissionCheck.js

/**
 * Admin Permission Check Utility
 * ALL permission reads use Session controller
 * Session is the SINGLE source of truth
 */
var AdminPerms = {

  getPermissions: function() {
    return Session.getAdminPermissions();
  },

  has: function(code) {
    var perms = this.getPermissions();
    if (perms.length === 1 && perms[0] === '*') return true;
    return perms.indexOf(code) !== -1;
  },

  requirePage: function(code) {
    if (this.has(code)) return true;

    var adminData = Session.getAdminData() || {};
    if (adminData.role === 'super_admin') return true;

    var friendlyName = typeof getPermissionName === 'function' ? getPermissionName(code) : code;

    if (typeof Dialog !== 'undefined') {
      Dialog.alert(
        'Access Denied: You don\'t have permission to ' + friendlyName + '.\n\nContact the super admin to request access.',
        'Access Denied',
        'warning'
      );
    }

    setTimeout(function() {
      if (typeof router !== 'undefined') {
        router.navigate('/admin/dashboard');
      }
    }, 500);

    return false;
  },

  getRole: function() {
    var adminData = Session.getAdminData() || {};
    return adminData.role || '';
  },

  isSuperAdmin: function() {
    return this.getRole() === 'super_admin';
  }
};