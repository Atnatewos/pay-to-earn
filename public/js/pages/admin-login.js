// public/js/pages/admin-login.js
class AdminLoginPage {
    constructor(container) {
        this.container = container;
    }

    render() {
        document.querySelector('.bottom-nav')?.remove();
        document.querySelector('.navbar')?.remove();

        this.container.innerHTML = `
            <div class="auth-page">
                <div class="auth-card card-glass">
                    <div class="auth-header">
                        <div class="auth-icon" style="background: var(--gradient-warm);">🛡️</div>
                        <h1>Admin Panel</h1>
                        <p>Secure access for administrators</p>
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
                            🛡️ Access Panel
                        </button>
                    </form>
                    <div class="auth-footer">
                        <p><a onclick="router.navigate('/login')" class="text-primary">← Back to User Login</a></p>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('adminLoginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            try {
                const data = await API.post('/admin/login', { username, password });
                localStorage.setItem('admin_token', data.data.token);
                localStorage.setItem('admin_data', JSON.stringify(data.data.admin));
                Toast.show('Welcome, Admin!');
                router.navigate('/admin/dashboard');
            } catch (error) {
                Toast.show(error.message, 'error');
            }
        });
    }

    unmount() {}
}