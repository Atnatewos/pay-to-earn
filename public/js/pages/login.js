// public/js/pages/login.js

/**
 * User Login Page
 * On success, stores session through Session.setUser()
 */
var LoginPage = function(container) {
  this.container = container;
};

LoginPage.prototype.render = function() {
  var self = this;
  document.querySelector('.bottom-nav')?.remove();
  document.querySelector('.navbar')?.remove();

  this.container.innerHTML = `
    <div class="auth-page">
      <div class="auth-card card-glass animate-scaleIn">
        <div class="auth-header">
          <div class="auth-icon">💰</div>
          <h1>Welcome Back</h1>
          <p>Sign in to continue earning</p>
        </div>
        <form id="loginForm" class="auth-form">
          <div class="form-group"><label class="form-label">Phone Number</label><input type="tel" class="form-input" id="phone" placeholder="09XXXXXXXX" required></div>
          <div class="form-group"><label class="form-label">Password</label><input type="password" class="form-input" id="password" placeholder="Enter password" required></div>
          <button type="submit" class="btn btn-primary btn-block btn-lg">Sign In</button>
        </form>
        <div class="auth-footer"><p>Don't have an account? <a onclick="router.navigate('/register')" class="text-primary">Register</a></p></div>
      </div>
    </div>
  `;

  document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    var phone = document.getElementById('phone').value.trim();
    var password = document.getElementById('password').value;

    try {
      var data = await API.post('/auth/login', { phone: phone, password: password });

      if (data.success) {
        // Store through Session controller (writes to both storages)
        Session.setUser(data.data.token, data.data.user);

        // Update in-memory store
        store.login(data.data.user, data.data.token);

        Toast.show('Login successful! Welcome back.');
        router.navigate('/home');
      } else {
        if (typeof Dialog !== 'undefined') {
          Dialog.alert(data.message || 'Invalid phone or password.', 'Login Failed', 'error');
        }
      }
    } catch (error) {
      if (typeof Dialog !== 'undefined') {
        Dialog.alert(error.message || 'Login failed. Please try again.', 'Error', 'error');
      }
    }
  });
};

LoginPage.prototype.unmount = function() {};