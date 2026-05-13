// public/admin/js/admin-api.js

/**
 * Admin API Client
 * Uses sessionStorage for per-tab admin sessions
 * Falls back to localStorage for backward compatibility
 * Multiple browser tabs can have different logged-in admins
 */
var AdminAPI = {
  base: (typeof APP_CONFIG !== 'undefined') ? APP_CONFIG.apiUrl : '/api',

  /**
   * Get admin token from sessionStorage
   * Falls back to localStorage for backward compatibility
   */
  getToken: function() {
    return sessionStorage.getItem('admin_token') || localStorage.getItem('admin_token');
  },

  /**
   * Make an authenticated request to admin API
   * @param {string} endpoint - Admin API endpoint
   * @param {object} options - Fetch options
   * @returns {object} Response data
   */
  request: async function(endpoint, options) {
    if (!options) {
      options = {};
    }

    var token = this.getToken();
    if (!token) {
      window.location.hash = '#/admin/login';
      return;
    }

    var config = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      }
    };

    if (options.body) {
      config.body = JSON.stringify(options.body);
    }

    var response = await fetch(this.base + '/admin' + endpoint, config);
    var data = await response.json();

    // Handle 401 - Unauthorized
    if (response.status === 401) {
      this.logout();
      return;
    }

    // Handle 403 - Forbidden with friendly permission message
    if (response.status === 403) {
      var permissionCode = '';
      if (data.message) {
        var match = data.message.match(/Required:\s*(\S+)/);
        if (match) {
          permissionCode = match[1];
        }
      }
      var friendlyName = typeof getPermissionName === 'function'
        ? getPermissionName(permissionCode)
        : permissionCode;

      if (typeof Dialog !== 'undefined') {
        Dialog.alert(
          'You don\'t have permission to ' + friendlyName + '. Contact the super admin for access.',
          'Access Denied',
          'warning'
        );
      }
      throw new Error('Permission denied');
    }

    if (!response.ok) {
      throw new Error(data.message || 'Request failed');
    }

    return data;
  },

  /**
   * GET request to admin API
   */
  get: function(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  },

  /**
   * POST request to admin API
   */
  post: function(endpoint, body) {
    return this.request(endpoint, { method: 'POST', body: body });
  },

  /**
   * Clear admin session from both storages and redirect to login
   */
  logout: function() {
    sessionStorage.removeItem('admin_token');
    sessionStorage.removeItem('admin_data');
    sessionStorage.removeItem('admin_permissions');
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_data');
    localStorage.removeItem('admin_permissions');
    window.location.hash = '#/admin/login';
  }
};