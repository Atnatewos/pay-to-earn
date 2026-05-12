// public/admin/js/pages/login.js
class AdminLogin {
    constructor(container) { this.container = container; }

    render() {
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

        document.getElementById('adminLoginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            try {
                const apiUrl = (typeof APP_CONFIG !== 'undefined') ? APP_CONFIG.apiUrl : '/api';
                const response = await fetch(`${apiUrl}/admin/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                const data = await response.json();
                

            // In the login form submit handler, after successful login:
            if (data.success) {
            localStorage.setItem('admin_token', data.data.token);
            localStorage.setItem('admin_data', JSON.stringify(data.data.admin));

            // Also fetch and store admin permissions
            try {
                var permResponse = await fetch(APP_CONFIG.apiUrl + '/admin/admins', {
                headers: { 'Authorization': 'Bearer ' + data.data.token }
                });
                var permData = await permResponse.json();
                if (permData.success && permData.data && permData.data.admins) {
                var currentAdmin = permData.data.admins.find(function(a) {
                    return a.id === data.data.admin.id;
                });
                if (currentAdmin) {
                    localStorage.setItem('admin_permissions', JSON.stringify(currentAdmin.permissions || []));
                }
                }
            } catch (e) {
                // Permissions fetch failed, admin will have restricted access
                localStorage.setItem('admin_permissions', '[]');
            }

            window.location.hash = '#/admin/dashboard';
            } else {
                    await Dialog.alert(data.message || 'Invalid credentials', 'Login Failed', 'error');
                }
            } catch (error) {
                await Dialog.alert('Login failed. Please check your connection and try again.', 'Connection Error', 'error');
            }
        });
    }

    unmount() {}
}