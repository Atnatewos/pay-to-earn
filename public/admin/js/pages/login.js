// public/admin/js/pages/login.js

/**
 * Admin Login Page
 * Fetches permissions from /admin/me/permissions (no special permission needed)
 * Then redirects to dashboard
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
          <div class="form-group"><label class="form-label">Username</label><input type="text" class="form-input" id="username" placeholder="Enter username" required></div>
          <div class="form-group"><label class="form-label">Password</label><input type="password" class="form-input" id="password" placeholder="Enter password" required></div>
          <button type="submit" class="btn btn-primary btn-block btn-lg">Access Panel</button>
        </form>
        <div class="auth-footer"><a onclick="window.location.hash='#/login'" class="text-primary">← User Login</a></div>
      </div>
    </div>
  `;

  document.getElementById('adminLoginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    var username = document.getElementById('username').value;
    var password = document.getElementById('password').value;

    try {
      var apiUrl = (typeof APP_CONFIG !== 'undefined') ? APP_CONFIG.apiUrl : '/api';
      var response = await fetch(apiUrl + '/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username, password: password })
      });
      var data = await response.json();

      if (data.success) {
        // Store token and basic data
        localStorage.setItem('admin_token', data.data.token);
        localStorage.setItem('admin_data', JSON.stringify(data.data.admin));

        // Fetch permissions from dedicated endpoint (doesn't require admins.view)
        try {
          var permResponse = await fetch(apiUrl + '/admin/me/permissions', {
            headers: { 'Authorization': 'Bearer ' + data.data.token }
          });
          var permData = await permResponse.json();
          if (permData.success && permData.data) {
            localStorage.setItem('admin_permissions', JSON.stringify(permData.data.permissions || []));
          } else {
            localStorage.setItem('admin_permissions', '[]');
          }
        } catch (permError) {
          localStorage.setItem('admin_permissions', '[]');
        }

        window.location.hash = '#/admin/dashboard';
      } else {
        if (typeof Dialog !== 'undefined') {
          Dialog.alert(data.message || 'Invalid credentials', 'Login Failed', 'error');
        } else {
          alert(data.message || 'Login failed');
        }
      }
    } catch (error) {
      if (typeof Dialog !== 'undefined') {
        Dialog.alert('Login failed. Please check your connection.', 'Connection Error', 'error');
      } else {
        alert('Login failed.');
      }
    }
  });
};

AdminLogin.prototype.unmount = function() {};