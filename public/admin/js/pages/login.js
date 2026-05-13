// public/admin/js/pages/login.js

/**
 * Admin Login Page
 * On successful login, stores credentials in sessionStorage for per-tab isolation
 * Fetches admin permissions from /admin/me/permissions (no special permission needed)
 * Also stores in localStorage as backup for backward compatibility
 * Then redirects to admin dashboard
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
          <p>Secure access</p>
        </div>
        <form id="adminLoginForm" class="auth-form">
          <div class="form-group">
            <label class="form-label">Username</label>
            <input type="text" class="form-input" id="username" placeholder="Enter username" required>
          </div>
          <div class="form-group">
            <label class="form-label">Password</label>
            <input type="password" class="form-input" id="password" placeholder="Enter password" required>
          </div>
          <button type="submit" class="btn btn-primary btn-block btn-lg">
            Access Panel
          </button>
        </form>
        <div class="auth-footer">
          <a onclick="window.location.hash='#/login'" class="text-primary">← User Login</a>
        </div>
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
      } else {
        alert('Please enter both username and password.');
      }
      return;
    }

    try {
      // Attempt login
      var response = await fetch(apiUrl + '/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username, password: password })
      });

      var data = await response.json();

      if (data.success) {
        // Store admin token in sessionStorage for per-tab isolation
        sessionStorage.setItem('admin_token', data.data.token);

        // Store admin basic data in sessionStorage
        sessionStorage.setItem('admin_data', JSON.stringify(data.data.admin));

        // Also store in localStorage as backup (backward compatibility)
        localStorage.setItem('admin_token', data.data.token);
        localStorage.setItem('admin_data', JSON.stringify(data.data.admin));

        // Fetch this admin's permissions from dedicated endpoint
        // This endpoint does NOT require admins.view permission
        // It returns only the current admin's own permissions
        try {
          var permResponse = await fetch(apiUrl + '/admin/me/permissions', {
            headers: { 'Authorization': 'Bearer ' + data.data.token }
          });

          var permData = await permResponse.json();

          if (permData.success && permData.data) {
            var permissions = permData.data.permissions || [];

            // Store permissions in sessionStorage for this tab
            sessionStorage.setItem('admin_permissions', JSON.stringify(permissions));

            // Also store in localStorage as backup
            localStorage.setItem('admin_permissions', JSON.stringify(permissions));
          } else {
            // If permissions fetch failed, store empty array
            sessionStorage.setItem('admin_permissions', '[]');
            localStorage.setItem('admin_permissions', '[]');
          }
        } catch (permError) {
          // Permissions fetch failed - store empty permissions
          // The admin will have limited access until they reload
          sessionStorage.setItem('admin_permissions', '[]');
          localStorage.setItem('admin_permissions', '[]');
        }

        // Redirect to admin dashboard
        window.location.hash = '#/admin/dashboard';
      } else {
        // Login failed - show error message
        if (typeof Dialog !== 'undefined') {
          Dialog.alert(
            data.message || 'Invalid username or password.',
            'Login Failed',
            'error'
          );
        } else {
          alert(data.message || 'Login failed. Please check your credentials.');
        }
      }
    } catch (error) {
      // Network or server error
      if (typeof Dialog !== 'undefined') {
        Dialog.alert(
          'Login failed. Please check your internet connection and try again.',
          'Connection Error',
          'error'
        );
      } else {
        alert('Login failed. Please check your connection and try again.');
      }
    }
  });
};

AdminLogin.prototype.unmount = function() {};