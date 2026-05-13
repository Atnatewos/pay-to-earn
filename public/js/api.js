// public/js/api.js

/**
 * API Client for User Panel
 * ALL token operations use Session controller
 * Session is the SINGLE source of truth
 */
var API = {
  base: (typeof APP_CONFIG !== 'undefined') ? APP_CONFIG.apiUrl : '/api',
  token: null,

  setToken: function(token) {
    this.token = token;
    Session._write('token', token);
  },

  getToken: function() {
    if (!this.token) {
      this.token = Session.getUserToken();
    }
    return this.token;
  },

  clearToken: function() {
    this.token = null;
    Session.clearUser();
  },

  request: async function(endpoint, options) {
    if (!options) options = {};
    var url = this.base + endpoint;
    var token = this.getToken();

    var config = {
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
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
      throw new Error('Network error. Please check your internet connection and try again.');
    }

    var data;
    try {
      data = await response.json();
    } catch (parseError) {
      throw new Error('Server returned an invalid response. Please try again later.');
    }

    if (response.status === 401) {
      this.clearToken();
      window.location.hash = '#/login';
      throw new Error(data.message || 'Your session has expired. Please login again.');
    }

    if (response.status === 403) {
      var permissionCode = '';
      if (data.message) {
        var match = data.message.match(/Required:\s*(\S+)/);
        if (match) permissionCode = match[1];
      }
      var friendlyName = typeof getPermissionName === 'function' ? getPermissionName(permissionCode) : permissionCode;

      if (typeof Dialog !== 'undefined') {
        Dialog.alert('You don\'t have permission to ' + friendlyName + '. Contact the super admin for access.', 'Access Denied', 'warning');
      }
      throw new Error('Permission denied: ' + friendlyName);
    }

    if (!response.ok) {
      throw new Error(data.message || 'Request failed with status ' + response.status);
    }

    return data;
  },

  get: function(endpoint) { return this.request(endpoint, { method: 'GET' }); },
  post: function(endpoint, body) { return this.request(endpoint, { method: 'POST', body: body }); },
  delete: function(endpoint) { return this.request(endpoint, { method: 'DELETE' }); }
};