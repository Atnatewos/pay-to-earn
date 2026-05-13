// public/admin/js/pages/login.js

/**
 * Admin Login Page
 * On success, stores EVERYTHING through Session.setAdmin()
 * Session is the SINGLE source of truth
 */
var AdminLogin = function(container) {
  this.container = container;
};

AdminLogin.prototype.render = function() {
  var self = this;
  document.querySelector('.bottom-nav')?.remove();
  document.querySelector('.navbar')?.remove();

  this.container.innerHTML = `
    <div class="auth-page">
      <div class="auth-card card-glass animate-scaleIn">
        <div class="auth-header">
          <div class="auth-icon" style="background: linear-gradient(135deg, #FD79A8, #FDCB6E);">🛡️</div>
          <h1>Admin Panel</h1>
          <p>Secure access for administrators</p>
        </div>
        <form id="adminLoginForm" class="auth-form">
          <div class="form-group"><label class="form-label">Username</label><input type="text" class="form-input" id="username" placeholder="Enter your username" required autocomplete="username"></div>
          <div class="form-group"><label class="form-label">Password</label><input type="password" class="form-input" id="password" placeholder="Enter your password" required autocomplete="current-password"></div>
          <button type="submit" class="btn btn-primary btn-block btn-lg">Access Panel</button>
        </form>
        <div class="auth-footer"><a onclick="window.location.hash='#/login'" class="text-primary">← Back to User Login</a></div>
      </div>
    </div>
  `;

  document.getElementById('adminLoginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    var username = document.getElementById('username').value.trim();
    var password = document.getElementById('password').value;
    var apiUrl = (typeof APP_CONFIG !== 'undefined') ? APP_CONFIG.apiUrl : '/api';

    if (!username || !password) {
      if (typeof Dialog !== 'undefined') {
        Dialog.alert('Please enter both username and password.', 'Validation Error', 'warning');
      }
      return;
    }

    try {
      var response = await fetch(apiUrl + '/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username, password: password })
      });
      var data = await response.json();

      if (data.success) {
        // Fetch permissions before storing session
        var permissions = [];
        try {
          var permResponse = await fetch(apiUrl + '/admin/me/permissions', {
            headers: { 'Authorization': 'Bearer ' + data.data.token }
          });
          var permData = await permResponse.json();
          if (permData.success && permData.data) {
            permissions = permData.data.permissions || [];
          }
        } catch (permError) {
          console.warn('Failed to fetch admin permissions:', permError.message);
        }

        // STORE EVERYTHING THROUGH SESSION CONTROLLER
        // This writes to BOTH sessionStorage and localStorage
        Session.setAdmin(data.data.token, data.data.admin, permissions);

        window.location.hash = '#/admin/dashboard';
      } else {
        if (typeof Dialog !== 'undefined') {
          Dialog.alert(data.message || 'Invalid username or password.', 'Login Failed', 'error');
        }
      }
    } catch (error) {
      if (typeof Dialog !== 'undefined') {
        Dialog.alert('Login failed. Please check your internet connection and try again.', 'Connection Error', 'error');
      }
    }
  });
};

AdminLogin.prototype.unmount = function() {};