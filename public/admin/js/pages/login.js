class AdminLogin {
    constructor(container) { this.container = container; }
    render() {
        this.container.innerHTML = '<div class="auth-page"><div class="auth-card card-glass animate-scaleIn"><div class="auth-header"><div class="auth-icon" style="background:linear-gradient(135deg,#FD79A8,#FDCB6E)">🛡️</div><h1>Admin Panel</h1><p>Secure access</p></div><form id="adminLoginForm" class="auth-form"><div class="form-group"><label class="form-label">Username</label><input type="text" class="form-input" id="username" placeholder="Enter username" required></div><div class="form-group"><label class="form-label">Password</label><input type="password" class="form-input" id="password" placeholder="Enter password" required></div><button type="submit" class="btn btn-primary btn-block btn-lg">Access Panel</button></form><div class="auth-footer"><a onclick="window.location.hash=\'#/login\'" class="text-primary">← User Login</a></div></div></div>';
        document.getElementById('adminLoginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            try {
                const response = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
                const data = await response.json();
                if (data.success) { localStorage.setItem('admin_token', data.data.token); localStorage.setItem('admin_data', JSON.stringify(data.data.admin)); window.location.hash = '#/admin/dashboard'; }
                else { alert(data.message); }
            } catch (error) { alert('Login failed'); }
        });
    }
    unmount() {}
}
