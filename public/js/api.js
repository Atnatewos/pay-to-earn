// public/js/api.js

/**
 * API Client
 * Handles all HTTP requests with authentication
 * Global 403 handler shows permission denied popup
 * All config from APP_CONFIG - no hardcoded URLs
 */
var API = {
  base: (typeof APP_CONFIG !== 'undefined') ? APP_CONFIG.apiUrl : '/api',
  token: null,

  /**
   * Store authentication token
   */
  setToken: function(token) {
    this.token = token;
    localStorage.setItem('token', token);
  },

  /**
   * Retrieve stored token
   */
  getToken: function() {
    if (!this.token) {
      this.token = localStorage.getItem('token');
    }
    return this.token;
  },

  /**
   * Clear authentication data
   */
  clearToken: function() {
    this.token = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  /**
   * Make an HTTP request to the API
   * Automatically handles 401 (redirect to login) and 403 (show permission popup)
   * @param {string} endpoint - API endpoint path
   * @param {object} options - Fetch options
   * @returns {object} Parsed JSON response
   */
  request: async function(endpoint, options) {
    if (!options) options = {};
    var url = this.base + endpoint;
    var token = this.getToken();

    var config = {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      method: options.method || 'GET'
    };

    if (token) {
      config.headers['Authorization'] = 'Bearer ' + token;
    }

    if (options.body) {
      config.body = JSON.stringify(options.body);
    }

    var response;
    try {
      response = await fetch(url, config);
    } catch (networkError) {
      throw new Error('Network error. Please check your connection.');
    }

    var data;
    try {
      data = await response.json();
    } catch (parseError) {
      throw new Error('Server returned an invalid response.');
    }

    // Handle 401 - Unauthorized (expired/missing token)
    if (response.status === 401) {
      this.clearToken();
      window.location.hash = '#/login';
      throw new Error(data.message || 'Session expired. Please login again.');
    }

    // Handle 403 - Forbidden (insufficient permissions)
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

      // Show permission denied popup
      if (typeof Dialog !== 'undefined') {
        Dialog.alert(
          'You don\'t have permission to ' + friendlyName + '. Contact the super admin for access.',
          'Access Denied',
          'warning'
        );
      }
      throw new Error('Permission denied: ' + friendlyName);
    }

    // Handle other non-OK responses
    if (!response.ok) {
      throw new Error(data.message || 'Request failed with status ' + response.status);
    }

    return data;
  },

  /**
   * GET request
   */
  get: function(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  },

  /**
   * POST request
   */
  post: function(endpoint, body) {
    return this.request(endpoint, { method: 'POST', body: body });
  },

  /**
   * DELETE request
   */
  delete: function(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
};