// public/js/pages/admin-dashboard.js
class AdminDashboardPage {
    constructor(container) {
        this.container = container;
    }

    getToken() {
        return localStorage.getItem('admin_token');
    }

    async apiCall(endpoint, method = 'GET', body = null) {
        const token = this.getToken();
        if (!token) {
            router.navigate('/admin/login');
            return;
        }

        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        };
        if (body) options.body = JSON.stringify(body);

        const response = await fetch(`/api/admin${endpoint}`, options);
        if (response.status === 401) {
            localStorage.removeItem('admin_token');
            localStorage.removeItem('admin_data');
            router.navigate('/admin/login');
            return;
        }
        return response.json();
    }

    async render() {
        document.querySelector('.bottom-nav')?.remove();
        
        const existingNav = document.querySelector('.navbar');
        if (existingNav) existingNav.remove();

        const navbar = document.createElement('nav');
        navbar.className = 'navbar';
        navbar.innerHTML = `
            <span class="navbar-brand">Admin</span>
            <div class="navbar-actions">
                <button class="navbar-btn" onclick="router.navigate('/admin/login'); localStorage.removeItem('admin_token'); localStorage.removeItem('admin_data');" title="Logout">🚪</button>
            </div>
        `;
        const app = document.getElementById('app');
        app.insertBefore(navbar, document.getElementById('appContent'));

        try {
            const data = await this.apiCall('/dashboard');
            const stats = data.data;

            this.container.innerHTML = `
                <div class="page">
                    <div class="page-header">
                        <h2 class="page-title">Dashboard</h2>
                        <p class="page-subtitle">Platform overview</p>
                    </div>

                    <div class="stats-grid mb-4">
                        <div class="card" style="text-align:center">
                            <div class="text-3xl mb-1">👥</div>
                            <div class="text-2xl font-bold">${stats.total_users || 0}</div>
                            <div class="text-xs text-secondary">Total Users</div>
                        </div>
                        <div class="card" style="text-align:center">
                            <div class="text-3xl mb-1">🆕</div>
                            <div class="text-2xl font-bold">${stats.new_users_24h || 0}</div>
                            <div class="text-xs text-secondary">New Today</div>
                        </div>
                        <div class="card" style="text-align:center">
                            <div class="text-3xl mb-1">💰</div>
                            <div class="text-2xl font-bold">${Number(stats.total_deposits || 0).toLocaleString()}</div>
                            <div class="text-xs text-secondary">Total Deposits</div>
                        </div>
                        <div class="card" style="text-align:center">
                            <div class="text-3xl mb-1">⏳</div>
                            <div class="text-2xl font-bold">${stats.pending_deposits || 0}</div>
                            <div class="text-xs text-secondary">Pending</div>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                        <button class="btn btn-primary btn-block" onclick="router.navigate('/admin/deposits')">
                            💳 Verify Deposits
                        </button>
                        <button class="btn btn-accent btn-block" onclick="router.navigate('/admin/withdrawals')">
                            💸 Process Withdrawals
                        </button>
                        <button class="btn btn-outline btn-block" onclick="router.navigate('/admin/users')">
                            👥 Users
                        </button>
                        <button class="btn btn-outline btn-block" onclick="router.navigate('/admin/features')">
                            ⚙️ Features
                        </button>
                    </div>
                </div>
            `;
        } catch (error) {
            this.container.innerHTML = `
                <div class="page">
                    <div class="empty-state">
                        <div class="empty-state-icon">⚠️</div>
                        <h3>Failed to load</h3>
                        <button class="btn btn-primary" onclick="router.navigate('/admin/dashboard')">Retry</button>
                    </div>
                </div>
            `;
        }
    }

    unmount() {}
}