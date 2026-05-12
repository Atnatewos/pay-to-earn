// Update public/admin/js/admin-api.js - Store permissions on login

var AdminAPI = {
  base: (typeof APP_CONFIG !== 'undefined') ? APP_CONFIG.apiUrl : '/api',

  getToken: function() {
    return localStorage.getItem('admin_token');
  },

  request: async function(endpoint, options) {
    if (!options) options = {};
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

    if (response.status === 401) {
      this.logout();
      return;
    }

    if (response.status === 403) {
      var permissionCode = '';
      if (data.message) {
        var match = data.message.match(/Required:\s*(\S+)/);
        if (match) permissionCode = match[1];
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

  get: function(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  },

  post: function(endpoint, body) {
    return this.request(endpoint, { method: 'POST', body: body });
  },

  logout: function() {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_data');
    localStorage.removeItem('admin_permissions');
    window.location.hash = '#/admin/login';
  }
};