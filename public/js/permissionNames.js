// public/js/permissionNames.js

/**
 * Maps technical permission codes to human-readable descriptions
 * Used for displaying friendly error messages to admins
 * Keep in sync with config/permissions.json
 */
var PERMISSION_NAMES = {
  'dashboard.view': 'view the dashboard',
  'users.view': 'view users',
  'users.edit': 'edit user details',
  'users.suspend': 'suspend or ban users',
  'users.delete': 'delete user accounts',
  'users.warn': 'send warnings to users',
  'users.notify': 'send notifications to users',
  'users.alert': 'send popup alerts to users',
  'users.level': 'change user package levels',
  'users.add_money': 'add money to user accounts',
  'users.manager_rank': 'assign manager ranks',
  'deposits.view': 'view deposits',
  'deposits.verify': 'verify deposits',
  'deposits.reject': 'reject deposits',
  'deposits.unblock': 'unblock transaction IDs',
  'withdrawals.view': 'view withdrawals',
  'withdrawals.process': 'approve or reject withdrawals',
  'giftcodes.view': 'view gift codes',
  'giftcodes.create': 'create gift codes',
  'salaries.view': 'view salary history',
  'salaries.process': 'process monthly salaries',
  'features.toggle': 'toggle platform features',
  'broadcast.send': 'send broadcast messages',
  'logs.view': 'view activity logs',
  'admins.view': 'view admin list',
  'admins.create': 'create admin accounts',
  'admins.edit': 'edit admin accounts',
  'admins.delete': 'delete admin accounts',
  'admins.permissions': 'manage admin permissions'
};

/**
 * Get human-readable permission name
 * @param {string} code - Permission code like 'users.delete'
 * @returns {string} Human readable description
 */
function getPermissionName(code) {
  return PERMISSION_NAMES[code] || code;
}