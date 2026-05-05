// public/admin/js/pages/dashboard.js
class AdminDashboard {
    constructor(container) { this.container = container; }

    async render() {
        AdminSidebar.render('/admin/dashboard');

        try {
            const data = await AdminAPI.get('/dashboard');
            const s = data.data;

            this.container.innerHTML = `
                <div class="admin-main">
                    <div class="admin-page-header">
                        <h1 class="admin-page-title">Dashboard</h1>
                        <p class="admin-page-subtitle">Platform overview</p>
                    </div>

                    <div class="admin-stats animate-fadeInUp">
                        <div class="admin-stat-card">
                            <div class="admin-stat-icon">👥</div>
                            <div class="admin-stat-value">${s.total_users || 0}</div>
                            <div class="admin-stat-label">Total Users</div>
                        </div>
                        <div class="admin-stat-card">
                            <div class="admin-stat-icon">🆕</div>
                            <div class="admin-stat-value">${s.new_users_24h || 0}</div>
                            <div class="admin-stat-label">New Today</div>
                        </div>
                        <div class="admin-stat-card">
                            <div class="admin-stat-icon">💰</div>
                            <div class="admin-stat-value">${Number(s.total_deposits || 0).toLocaleString()}</div>
                            <div class="admin-stat-label">Total Deposits (ETB)</div>
                        </div>
                        <div class="admin-stat-card">
                            <div class="admin-stat-icon">⏳</div>
                            <div class="admin-stat-value">${s.pending_deposits || 0}</div>
                            <div class="admin-stat-label">Pending Deposits</div>
                        </div>
                        <div class="admin-stat-card">
                            <div class="admin-stat-icon">💸</div>
                            <div class="admin-stat-value">${Number(s.total_withdrawn || 0).toLocaleString()}</div>
                            <div class="admin-stat-label">Total Withdrawn (ETB)</div>
                        </div>
                        <div class="admin-stat-card">
                            <div class="admin-stat-icon">📤</div>
                            <div class="admin-stat-value">${s.pending_withdrawals || 0}</div>
                            <div class="admin-stat-label">Pending Withdrawals</div>
                        </div>
                    </div>

                    <div class="admin-actions animate-fadeInUp stagger-2">
                        <div class="admin-action-btn" onclick="router.navigate('/admin/deposits')">
                            <div class="admin-action-icon">💳</div>
                            <div class="admin-action-label">Verify Deposits</div>
                        </div>
                        <div class="admin-action-btn" onclick="router.navigate('/admin/withdrawals')">
                            <div class="admin-action-icon">💸</div>
                            <div class="admin-action-label">Process Withdrawals</div>
                        </div>
                        <div class="admin-action-btn" onclick="router.navigate('/admin/users')">
                            <div class="admin-action-icon">👥</div>
                            <div class="admin-action-label">Manage Users</div>
                        </div>
                        <div class="admin-action-btn" onclick="router.navigate('/admin/broadcast')">
                            <div class="admin-action-icon">📢</div>
                            <div class="admin-action-label">Send Broadcast</div>
                        </div>
                    </div>
                </div>
            `;
        } catch (error) {
            this.container.innerHTML = `<div class="admin-main"><p>Failed to load dashboard</p></div>`;
        }
    }

    unmount() {}
}